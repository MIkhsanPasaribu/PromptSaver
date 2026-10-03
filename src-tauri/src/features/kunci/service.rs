//! Logika bisnis kunci aplikasi. Lapisan ini tidak menyentuh jendela; keadaan "sedang terkunci"
//! hidup di `StateAplikasi` supaya command data bisa ditolak dari satu tempat saja.

use rusqlite::Connection;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::core::database::sekarang_ms;
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::settings::model::{Bahasa, PengaturanAplikasi, Tema};
use crate::features::settings::repository as penyimpanan;

pub const PANJANG_PIN_MIN: usize = 4;
pub const PANJANG_PIN_MAKS: usize = 12;
/// Iterasi PBKDF2. Diukur pada perangkat uji: satu derivasi di bawah 200 ms, masih tak terasa
/// saat membuka kunci tapi cukup mahal untuk membuat serangan tebak PIN lambat.
pub const ITERASI: u32 = 60_000;
pub const BATAS_GAGAL: u8 = 5;
pub const KONCO_BLOKIR_DETIK: i64 = 60;
pub const JEDA_MIN_DETIK: u32 = 0;
pub const JEDA_MAKS_DETIK: u32 = 3600;
pub const JEDA_BAKU_DETIK: u32 = 60;

const KUNCI_SALT: &str = "kunci_salt";
const KUNCI_HASH: &str = "kunci_hash";
const KUNCI_JEDA: &str = "kunci_jeda_detik";
const KUNCI_GAGAL: &str = "kunci_gagal";
const KUNCI_BLOKIR: &str = "kunci_blokir_sampai";

const UKURAN_BLOK: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusKunci {
    /// Ada PIN yang tersimpan di perangkat ini.
    pub aktif: bool,
    /// Aplikasi sedang menunggu PIN sebelum data bisa dibuka.
    pub terkunci: bool,
    /// Sekunder tunggu sebelum percobaan berikutnya boleh dilakukan, 0 bila bebas.
    pub blokir_sisa: i64,
    pub jeda_detik: u32,
    /// Sidik jari hanya ada di Android dan hanya bila perangkat benar-benar punya sensor yang
    /// sudah terdaftar. Desktop memakai PIN saja.
    pub biometrik_tersedia: bool,
    /// Tiga preferensi tampil berikut dibutuhkan layar kunci karena command pengaturan berada di
    /// balik gerbang: tanpa ini, layar kunci selalu tampil terang dan berbahasa Inggris.
    pub bahasa: Bahasa,
    pub tema: Tema,
    pub kurangi_animasi: bool,
}

/// Ringkasan keadaan kunci untuk frontend. `terkunci` diambil dari state, bukan dari database,
/// karena gerbang hidup di memori selama proses berjalan. `tampilan` dibaca dari penyimpanan
/// pengaturan, bukan dari parameter, supaya layar kunci dan layar biasa memakai nilai yang sama.
pub fn status(
    koneksi: &Connection,
    terkunci: bool,
    biometrik_tersedia: bool,
    tampilan: &PengaturanAplikasi,
) -> Hasil<StatusKunci> {
    Ok(StatusKunci {
        aktif: aktif(koneksi)?,
        terkunci,
        blokir_sisa: sisa_blokir(koneksi)?,
        jeda_detik: jeda_detik(koneksi)?,
        biometrik_tersedia,
        bahasa: tampilan.bahasa,
        tema: tampilan.tema,
        kurangi_animasi: tampilan.kurangi_animasi,
    })
}

fn hmac_sha256(kunci: &[u8], pesan: &[u8]) -> [u8; 32] {
    let mut kunci_blok = [0u8; UKURAN_BLOK];
    if kunci.len() > UKURAN_BLOK {
        kunci_blok[..32].copy_from_slice(&Sha256::digest(kunci));
    } else {
        kunci_blok[..kunci.len()].copy_from_slice(kunci);
    }

    let mut dalam = [0u8; UKURAN_BLOK];
    let mut luar = [0u8; UKURAN_BLOK];
    for i in 0..UKURAN_BLOK {
        dalam[i] = kunci_blok[i] ^ 0x36;
        luar[i] = kunci_blok[i] ^ 0x5c;
    }

    let dalam = {
        let mut hasher = Sha256::new();
        hasher.update(dalam);
        hasher.update(pesan);
        hasher.finalize()
    };
    let mut hasher = Sha256::new();
    hasher.update(luar);
    hasher.update(dalam);
    hasher.finalize().into()
}

/// PBKDF2-HMAC-SHA256 dengan panjang turunan 32 byte, yaitu satu blok. Rumusnya mengikuti
/// RFC 8018 bagian 5.2 dan hasilnya diverifikasi terhadap vektor dari pustaka standar di
/// `tests` modul ini.
pub fn pbkdf2(kata_sandi: &[u8], salt: &[u8], iterasi: u32) -> [u8; 32] {
    let awal = {
        let mut buffer = salt.to_vec();
        buffer.extend_from_slice(&1u32.to_be_bytes());
        hmac_sha256(kata_sandi, &buffer)
    };
    let mut hasil = awal;
    let mut blok = awal;
    for _ in 1..iterasi {
        blok = hmac_sha256(kata_sandi, &blok);
        for (target, nilai) in hasil.iter_mut().zip(blok) {
            *target ^= nilai;
        }
    }
    hasil
}

fn ke_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn dari_hex(teks: &str) -> Option<Vec<u8>> {
    if !teks.len().is_multiple_of(2) {
        return None;
    }
    teks.chars()
        .collect::<Vec<char>>()
        .chunks(2)
        .map(|pasangan| {
            let bagian = pasangan.iter().collect::<String>();
            u8::from_str_radix(&bagian, 16).ok()
        })
        .collect()
}

/// Salt tidak perlu rahasia, cukup berbeda per pemasangan supaya hash yang sama tidak muncul di
/// dua perangkat. UUIDv7 membawa bagian acak yang cukup untuk itu tanpa menambah dependency.
fn salt_baru() -> Vec<u8> {
    let a = Uuid::now_v7().into_bytes();
    let b = Uuid::now_v7().into_bytes();
    a.iter().chain(b.iter()).take(16).copied().collect()
}

fn bandingkan_amat_sama(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut beda = 0u8;
    for (x, y) in a.iter().zip(b) {
        beda |= x ^ y;
    }
    beda == 0
}

pub fn validasi_pin(pin: &str) -> Hasil<()> {
    if pin.len() < PANJANG_PIN_MIN || pin.len() > PANJANG_PIN_MAKS {
        return Err(GalatAplikasi::validasi(format!(
            "PIN harus {PANJANG_PIN_MIN}-{PANJANG_PIN_MAKS} angka."
        )));
    }
    if !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err(GalatAplikasi::validasi(
            "PIN hanya boleh berisi angka, tanpa huruf atau spasi.",
        ));
    }
    Ok(())
}

pub fn validasi_jeda(jeda: u32) -> Hasil<()> {
    if !(JEDA_MIN_DETIK..=JEDA_MAKS_DETIK).contains(&jeda) {
        return Err(GalatAplikasi::validasi(format!(
            "Jeda kunci otomatis harus {JEDA_MIN_DETIK} sampai {JEDA_MAKS_DETIK} detik."
        )));
    }
    Ok(())
}

pub fn aktif(koneksi: &Connection) -> Hasil<bool> {
    Ok(penyimpanan::ambil_nilai(koneksi, KUNCI_HASH)?.is_some())
}

pub fn jeda_detik(koneksi: &Connection) -> Hasil<u32> {
    Ok(penyimpanan::ambil_nilai(koneksi, KUNCI_JEDA)?
        .and_then(|teks| teks.parse::<u32>().ok())
        .unwrap_or(JEDA_BAKU_DETIK))
}

pub fn sisa_blokir(koneksi: &Connection) -> Hasil<i64> {
    let sampai = penyimpanan::ambil_nilai(koneksi, KUNCI_BLOKIR)?
        .and_then(|teks| teks.parse::<i64>().ok())
        .unwrap_or_default();
    Ok(((sampai - sekarang_ms()) / 1000).max(0))
}

pub fn setel(koneksi: &Connection, pin: &str, jeda: u32) -> Hasil<()> {
    validasi_pin(pin)?;
    validasi_jeda(jeda)?;
    let salt = salt_baru();
    let hash = pbkdf2(pin.as_bytes(), &salt, ITERASI);
    penyimpanan::simpan_nilai(koneksi, KUNCI_SALT, &ke_hex(&salt))?;
    penyimpanan::simpan_nilai(koneksi, KUNCI_HASH, &ke_hex(&hash))?;
    penyimpanan::simpan_nilai(koneksi, KUNCI_JEDA, &jeda.to_string())?;
    penyimpanan::simpan_nilai(koneksi, KUNCI_GAGAL, "0")?;
    penyimpanan::simpan_nilai(koneksi, KUNCI_BLOKIR, "0")?;
    Ok(())
}

/// Ganti PIN tanpa menyentuh jeda, untuk kasus "PIN lama + PIN baru".
pub fn ganti_pin(koneksi: &Connection, pin: &str, pin_baru: &str) -> Hasil<()> {
    if !cocok(koneksi, pin)? {
        return Err(GalatAplikasi::validasi(
            "PIN lama salah. Kunci aplikasi tidak diubah.",
        ));
    }
    setel(koneksi, pin_baru, jeda_detik(koneksi)?)
}

pub fn ubah_jeda(koneksi: &Connection, jeda: u32) -> Hasil<()> {
    validasi_jeda(jeda)?;
    if !aktif(koneksi)? {
        return Err(GalatAplikasi::validasi(
            "Kunci aplikasi belum aktif. Jeda otomatis hanya berlaku bila PIN terpasang.",
        ));
    }
    penyimpanan::simpan_nilai(koneksi, KUNCI_JEDA, &jeda.to_string())
}

pub fn hapus(koneksi: &Connection, pin: &str) -> Hasil<()> {
    if !cocok(koneksi, pin)? {
        return Err(GalatAplikasi::validasi(
            "PIN salah. Kunci aplikasi tidak jadi dilepas.",
        ));
    }
    for kunci in [
        KUNCI_SALT,
        KUNCI_HASH,
        KUNCI_JEDA,
        KUNCI_GAGAL,
        KUNCI_BLOKIR,
    ] {
        penyimpanan::hapus_nilai(koneksi, kunci)?;
    }
    Ok(())
}

/// Cocokkan PIN tanpa mengubah penghitung gagal. Pemanggil yang memutuskan mencatat kegagalan.
pub fn cocok(koneksi: &Connection, pin: &str) -> Hasil<bool> {
    Ok(cocok_banyak(koneksi, &[pin.to_string()])?
        .first()
        .copied()
        .unwrap_or(false))
}

pub fn cocok_banyak(koneksi: &Connection, kandidat: &[String]) -> Hasil<Vec<bool>> {
    let Some(salt) = penyimpanan::ambil_nilai(koneksi, KUNCI_SALT)? else {
        return Ok(vec![false; kandidat.len()]);
    };
    let Some(hash) = penyimpanan::ambil_nilai(koneksi, KUNCI_HASH)? else {
        return Ok(vec![false; kandidat.len()]);
    };
    let (Some(salt), Some(banding)) = (dari_hex(&salt), dari_hex(&hash)) else {
        return Err(GalatAplikasi::baru(
            "sistem",
            "Data kunci rusak. Setel ulang PIN Anda.",
        ));
    };
    Ok(kandidat
        .iter()
        .map(|pin| bandingkan_amat_sama(&pbkdf2(pin.as_bytes(), &salt, ITERASI), &banding))
        .collect())
}

pub fn catat_gagal(koneksi: &Connection) -> Hasil<u8> {
    let saat = penyimpanan::ambil_nilai(koneksi, KUNCI_GAGAL)?
        .and_then(|teks| teks.parse::<u8>().ok())
        .unwrap_or_default();
    let baru = saat.saturating_add(1);
    penyimpanan::simpan_nilai(koneksi, KUNCI_GAGAL, &baru.to_string())?;
    if baru >= BATAS_GAGAL {
        let sampai = sekarang_ms() + KONCO_BLOKIR_DETIK * 1000;
        penyimpanan::simpan_nilai(koneksi, KUNCI_BLOKIR, &sampai.to_string())?;
        penyimpanan::simpan_nilai(koneksi, KUNCI_GAGAL, "0")?;
    }
    Ok(baru)
}

pub fn bersihkan_gagal(koneksi: &Connection) -> Hasil<()> {
    penyimpanan::simpan_nilai(koneksi, KUNCI_GAGAL, "0")?;
    penyimpanan::simpan_nilai(koneksi, KUNCI_BLOKIR, "0")
}

/// Baris kunci tidak boleh ikut terhapus saat pengguna memilih "Atur ulang ke default": kalau
/// boleh, satu klik melepas kunci aplikasi tanpa PIN (celah yang ditemukan saat audit).
/// Dipakai `settings::repository::kosongkan_pengaturan`.
pub const BARIS_DIKECUALIKAN: &[&str] = &[
    KUNCI_SALT,
    KUNCI_HASH,
    KUNCI_JEDA,
    KUNCI_GAGAL,
    KUNCI_BLOKIR,
];

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;

    #[test]
    fn hmac_sha256_mengikuti_vektor_rfc_4231() {
        let hasil = hmac_sha256(b"Jefe", b"what do ya want for nothing?");
        assert_eq!(
            ke_hex(&hasil),
            "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
        );
    }

    #[test]
    fn pbkdf2_mengikuti_vektor_pustaka_standar() {
        // Vektor dibuat dengan hashlib.pbkdf2_hmac('sha256') pada mesin yang sama, bukan
        // disalin dari ingatan, supaya test ini benar-benar membuktikan kesesuaian.
        assert_eq!(
            ke_hex(&pbkdf2(b"password", b"salt", 1)),
            "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b"
        );
        assert_eq!(
            ke_hex(&pbkdf2(b"password", b"salt", 2)),
            "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
        );
        assert_eq!(
            ke_hex(&pbkdf2(b"password", b"salt", 5)),
            "65cc4b332e89aa90252ddca8fd3641d5b830f2216a6ab2669c15f30e652f542c"
        );
        assert_eq!(
            ke_hex(&pbkdf2(
                b"passwordPASSWORDpassword",
                b"saltSALTsaltSALTsaltSALTsaltSALTsalt",
                4096
            )),
            "348c89dbcbd32b2f32d814b8116e84cf2b17347ebc1800181c4e2a1fb8dd53e1"
        );
    }

    #[test]
    fn hex_bolak_balik_aman_untuk_salt_dan_hash() {
        assert_eq!(
            dari_hex(&ke_hex(&[0u8, 255, 16])).unwrap(),
            vec![0u8, 255, 16]
        );
        assert_eq!(dari_hex("abc"), None);
        assert_eq!(dari_hex("zz"), None);
    }

    #[test]
    fn pin_divalidasi_sebelum_disimpan() {
        assert!(validasi_pin("123").is_err());
        assert!(validasi_pin("12ab").is_err());
        assert!(validasi_pin("1234").is_ok());
        assert!(validasi_pin("123456789012").is_ok());
        assert!(validasi_pin("1234567890123").is_err());
        assert!(validasi_jeda(JEDA_MAKS_DETIK + 1).is_err());
    }

    #[test]
    fn hanya_pin_benar_yang_cocok() {
        let koneksi = koneksi_uji().unwrap();
        assert!(!aktif(&koneksi).unwrap());
        setel(&koneksi, "4321", 30).unwrap();
        assert!(aktif(&koneksi).unwrap());
        assert_eq!(jeda_detik(&koneksi).unwrap(), 30);
        assert!(cocok(&koneksi, "4321").unwrap());
        assert!(!cocok(&koneksi, "1234").unwrap());
    }

    #[test]
    fn salt_berbeda_menjadikan_hash_berbeda_untuk_pin_sama() {
        let a = pbkdf2(b"1234", &salt_baru(), 1);
        let b = pbkdf2(b"1234", &salt_baru(), 1);
        assert_ne!(a, b);
    }

    #[test]
    fn gagal_beruntun_menimbulkan_jeda_tunggu() {
        let koneksi = koneksi_uji().unwrap();
        setel(&koneksi, "1111", 0).unwrap();
        for _ in 0..(BATAS_GAGAL - 1) {
            catat_gagal(&koneksi).unwrap();
        }
        assert_eq!(sisa_blokir(&koneksi).unwrap(), 0);
        catat_gagal(&koneksi).unwrap();
        assert!(sisa_blokir(&koneksi).unwrap() >= KONCO_BLOKIR_DETIK - 5);
        bersihkan_gagal(&koneksi).unwrap();
        assert_eq!(sisa_blokir(&koneksi).unwrap(), 0);
    }

    #[test]
    fn melepas_kunci_memerlukan_pin_dan_membersihkan_semua_baris() {
        let koneksi = koneksi_uji().unwrap();
        setel(&koneksi, "9999", 60).unwrap();
        assert!(hapus(&koneksi, "0000").is_err());
        assert!(
            aktif(&koneksi).unwrap(),
            "percobaan salah tidak menghapus kunci"
        );
        hapus(&koneksi, "9999").unwrap();
        assert!(!aktif(&koneksi).unwrap());
        assert_eq!(jeda_detik(&koneksi).unwrap(), JEDA_BAKU_DETIK);
    }

    #[test]
    fn ganti_pin_memerlukan_pin_lama() {
        let koneksi = koneksi_uji().unwrap();
        setel(&koneksi, "1234", 15).unwrap();
        assert!(ganti_pin(&koneksi, "0000", "5678").is_err());
        assert!(cocok(&koneksi, "1234").unwrap());
        ganti_pin(&koneksi, "1234", "5678").unwrap();
        assert!(cocok(&koneksi, "5678").unwrap());
        assert!(!cocok(&koneksi, "1234").unwrap());
        assert_eq!(jeda_detik(&koneksi).unwrap(), 15, "jeda tidak ikut berubah");
    }

    #[test]
    fn ubah_jeda_hanya_untuk_kunci_yang_aktif() {
        let koneksi = koneksi_uji().unwrap();
        assert!(ubah_jeda(&koneksi, 30).is_err());
        setel(&koneksi, "2468", 30).unwrap();
        ubah_jeda(&koneksi, 0).unwrap();
        assert_eq!(jeda_detik(&koneksi).unwrap(), 0);
        assert!(ubah_jeda(&koneksi, JEDA_MAKS_DETIK + 1).is_err());
    }

    #[test]
    fn atur_ulang_pengaturan_tidak_melepas_kunci() {
        let koneksi = koneksi_uji().unwrap();
        setel(&koneksi, "1357", 45).unwrap();
        crate::features::settings::service::simpan(
            &koneksi,
            &crate::features::settings::model::PatchPengaturan {
                tema: Some(crate::features::settings::model::Tema::Gelap),
                ..Default::default()
            },
        )
        .unwrap();

        let hasil = crate::features::settings::service::atur_ulang(&koneksi).unwrap();
        assert_eq!(
            hasil.tema,
            crate::features::settings::model::Tema::IkutSistem,
            "pengaturan lain tetap kembali ke default"
        );
        assert!(
            aktif(&koneksi).unwrap(),
            "atur ulang tidak boleh menjadi jalan memutar kunci aplikasi"
        );
        assert!(cocok(&koneksi, "1357").unwrap());
        assert_eq!(jeda_detik(&koneksi).unwrap(), 45);
    }
}
