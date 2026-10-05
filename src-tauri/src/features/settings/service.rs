//! Logika bisnis pengaturan. Nilai batas bawah transparansi dijaga di sini, bukan di frontend.

use std::path::Path;

use rusqlite::Connection;

use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::settings::model::{PatchPengaturan, PengaturanAplikasi};
use crate::features::settings::repository;

/// Batas bawah opasitas jendela Mode Widget. Angka ini hasil verifikasi kontras DESIGN.md.
pub const TRANSPARANSI_MIN: u8 = 80;
pub const TRANSPARANSI_MAKS: u8 = 100;
pub const PANJANG_PINTASAN_MAKS: usize = 40;

pub fn ambil(koneksi: &Connection) -> Hasil<PengaturanAplikasi> {
    let dasar = PengaturanAplikasi::default();
    Ok(PengaturanAplikasi {
        tema: baca(koneksi, "tema")?.unwrap_or(dasar.tema),
        bahasa: baca(koneksi, "bahasa")?.unwrap_or(dasar.bahasa),
        kurangi_animasi: baca(koneksi, "kurangi_animasi")?.unwrap_or(dasar.kurangi_animasi),
        urutan_daftar: baca(koneksi, "urutan_daftar")?.unwrap_or(dasar.urutan_daftar),
        onboarding_selesai: baca(koneksi, "onboarding_selesai")?
            .unwrap_or(dasar.onboarding_selesai),
        ingat_nilai_variabel: baca(koneksi, "ingat_nilai_variabel")?
            .unwrap_or(dasar.ingat_nilai_variabel),
        widget_geometri_penuh: baca(koneksi, "widget_geometri_penuh")?,
        widget_geometri_mode: baca(koneksi, "widget_geometri_mode")?,
        widget_selalu_di_atas: baca(koneksi, "widget_selalu_di_atas")?
            .unwrap_or(dasar.widget_selalu_di_atas),
        widget_transparansi: clamp_transparansi(
            baca(koneksi, "widget_transparansi")?.unwrap_or(dasar.widget_transparansi),
        ),
        widget_tutup_ke_tray: baca(koneksi, "widget_tutup_ke_tray")?
            .unwrap_or(dasar.widget_tutup_ke_tray),
        pintasan_global_aktif: baca(koneksi, "pintasan_global_aktif")?
            .unwrap_or(dasar.pintasan_global_aktif),
        pintasan_global: baca(koneksi, "pintasan_global")?.unwrap_or(dasar.pintasan_global),
        cadangan_otomatis: baca(koneksi, "cadangan_otomatis")?.unwrap_or(dasar.cadangan_otomatis),
    })
}

pub fn simpan(koneksi: &Connection, patch: &PatchPengaturan) -> Hasil<PengaturanAplikasi> {
    if let Some(transparansi) = patch.widget_transparansi {
        if !(TRANSPARANSI_MIN..=TRANSPARANSI_MAKS).contains(&transparansi) {
            return Err(GalatAplikasi::validasi(format!(
                "Transparansi widget hanya boleh {TRANSPARANSI_MIN} sampai {TRANSPARANSI_MAKS} persen agar teks tetap terbaca."
            )));
        }
    }
    if let Some(pintasan) = &patch.pintasan_global {
        validasi_pintasan(pintasan)?;
    }

    tulis(koneksi, "tema", &patch.tema)?;
    tulis(koneksi, "bahasa", &patch.bahasa)?;
    tulis(koneksi, "kurangi_animasi", &patch.kurangi_animasi)?;
    tulis(koneksi, "urutan_daftar", &patch.urutan_daftar)?;
    tulis(koneksi, "onboarding_selesai", &patch.onboarding_selesai)?;
    tulis(koneksi, "ingat_nilai_variabel", &patch.ingat_nilai_variabel)?;
    tulis(
        koneksi,
        "widget_geometri_penuh",
        &patch.widget_geometri_penuh,
    )?;
    tulis(koneksi, "widget_geometri_mode", &patch.widget_geometri_mode)?;
    tulis(
        koneksi,
        "widget_selalu_di_atas",
        &patch.widget_selalu_di_atas,
    )?;
    tulis(koneksi, "widget_transparansi", &patch.widget_transparansi)?;
    tulis(koneksi, "widget_tutup_ke_tray", &patch.widget_tutup_ke_tray)?;
    tulis(
        koneksi,
        "pintasan_global_aktif",
        &patch.pintasan_global_aktif,
    )?;
    tulis(koneksi, "pintasan_global", &patch.pintasan_global)?;
    tulis(koneksi, "cadangan_otomatis", &patch.cadangan_otomatis)?;

    ambil(koneksi)
}

pub fn atur_ulang(koneksi: &Connection) -> Hasil<PengaturanAplikasi> {
    repository::kosongkan_pengaturan(koneksi, crate::features::kunci::service::BARIS_DIKECUALIKAN)?;
    Ok(PengaturanAplikasi::default())
}

/// Hapus semua data. Butuh dua langkah konfirmasi di UI, dan setelah ini koleksi kosong.
/// `sertakan_berkas` ikut mengosongkan folder cadangan dan seluruh folder tukar ekspor: tanpa
/// itu, salinan plaintext seluruh koleksi tetap tertinggal di disk setelah pengguna meminta
/// "hapus semua data" (PRD F3). Mengembalikan jumlah berkas yang ikut dihapus.
pub fn hapus_semua_data(
    koneksi: &Connection,
    dir_data: &Path,
    dir_tukar: &Path,
    sertakan_berkas: bool,
) -> Hasil<usize> {
    repository::hapus_semua_data(koneksi)?;
    if !sertakan_berkas {
        return Ok(0);
    }
    let cadangan = crate::features::cadangan::service::kosongkan(dir_data)?;
    let ekspor = crate::features::transfer::service::kosongkan_folder_ekspor(dir_tukar, dir_data)?;
    Ok(cadangan + ekspor)
}

/// Kunci penyimpanan saran nilai variabel terakhir (PRD C2). Disimpan sebagai satu
/// objek JSON di tabel pengaturan supaya tidak perlu migrasi skema baru.
const KUNCI_VARIABEL: &str = "variabel_terakhir";
const MAKS_ENTRI_VARIABEL: usize = 200;

pub fn ambil_peta_variabel(
    koneksi: &Connection,
) -> Hasil<std::collections::HashMap<String, String>> {
    Ok(repository::ambil_nilai(koneksi, KUNCI_VARIABEL)?
        .and_then(|teks| serde_json::from_str(&teks).ok())
        .unwrap_or_default())
}

pub fn simpan_peta_variabel(
    koneksi: &Connection,
    nilai: &std::collections::HashMap<String, String>,
) -> Hasil<()> {
    // Batasi pertumbuhan supaya tabel pengaturan tidak membengkak tanpa batas.
    let ringkas: std::collections::HashMap<String, String> = nilai
        .iter()
        .filter(|(nama, nilai)| {
            !nama.trim().is_empty() && !nilai.is_empty() && nilai.chars().count() <= 2_000
        })
        .take(MAKS_ENTRI_VARIABEL)
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    repository::simpan_nilai(koneksi, KUNCI_VARIABEL, &serde_json::to_string(&ringkas)?)?;
    Ok(())
}

fn clamp_transparansi(nilai: u8) -> u8 {
    nilai.clamp(TRANSPARANSI_MIN, TRANSPARANSI_MAKS)
}

fn validasi_pintasan(pintasan: &str) -> Hasil<()> {
    let bersih = pintasan.trim();
    if bersih.is_empty() {
        return Err(GalatAplikasi::validasi(
            "Kombinasi pintasan tidak boleh kosong. Matikan pintasan global bila tidak ingin memakainya.",
        ));
    }
    if bersih.chars().count() > PANJANG_PINTASAN_MAKS {
        return Err(GalatAplikasi::validasi(format!(
            "Kombinasi pintasan maksimal {PANJANG_PINTASAN_MAKS} karakter."
        )));
    }

    let potongan: Vec<String> = bersih.split('+').map(|s| s.trim().to_lowercase()).collect();
    if potongan.len() < 2 {
        return Err(GalatAplikasi::validasi(
            "Pintasan butuh minimal satu tombol modifier dan satu tombol kunci. Contoh: Control+Alt+K.",
        ));
    }

    const MODIFIER: [&str; 7] = ["control", "ctrl", "alt", "shift", "super", "cmd", "command"];
    const NAMA_KUNCI: [&str; 8] = [
        "space", "enter", "esc", "home", "end", "pageup", "pagedown", "tab",
    ];
    const KUNCI_BOLEH: &str = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (indeks, bagian) in potongan.iter().enumerate() {
        if bagian.is_empty() {
            return Err(GalatAplikasi::validasi(
                "Kombinasi pintasan mempunyai bagian kosong.",
            ));
        }
        let terakhir = indeks + 1 == potongan.len();
        if !terakhir {
            if !MODIFIER.contains(&bagian.as_str()) {
                return Err(GalatAplikasi::validasi(format!(
                    "\"{bagian}\" bukan tombol modifier yang dikenal."
                )));
            }
        } else {
            let dikenal = NAMA_KUNCI.contains(&bagian.as_str())
                || (bagian.chars().count() == 1 && semua_huruf_boleh(bagian, KUNCI_BOLEH))
                || (bagian.starts_with('f')
                    && bagian[1..].parse::<u8>().map(|n| n <= 24).unwrap_or(false));
            if !dikenal {
                return Err(GalatAplikasi::validasi(format!(
                    "\"{bagian}\" bukan tombol kunci yang dikenal."
                )));
            }
        }
    }

    Ok(())
}

fn semua_huruf_boleh(nilai: &str, kumpulan: &str) -> bool {
    nilai.chars().all(|c| kumpulan.contains(c))
}

fn tulis<T: serde::Serialize>(koneksi: &Connection, kunci: &str, nilai: &Option<T>) -> Hasil<()> {
    let Some(nilai) = nilai else { return Ok(()) };
    repository::simpan_nilai(koneksi, kunci, &serde_json::to_string(nilai)?)?;
    Ok(())
}

fn baca<T: serde::de::DeserializeOwned>(koneksi: &Connection, kunci: &str) -> Hasil<Option<T>> {
    let Some(teks) = repository::ambil_nilai(koneksi, kunci)? else {
        return Ok(None);
    };
    match serde_json::from_str::<T>(&teks) {
        Ok(nilai) => Ok(Some(nilai)),
        // Nilai rusak dari versi aplikasi lain tidak boleh membuat aplikasi gagal menyala.
        Err(_) => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;
    use crate::features::settings::model::Geometri;

    #[test]
    fn default_saat_database_kosong() {
        let koneksi = koneksi_uji().unwrap();
        let pengaturan = ambil(&koneksi).unwrap();
        assert_eq!(
            pengaturan.tema,
            crate::features::settings::model::Tema::IkutSistem
        );
        assert_eq!(pengaturan.widget_transparansi, 100);
        assert!(
            !pengaturan.pintasan_global_aktif,
            "pintasan global mati di pemakaian pertama"
        );
    }

    #[test]
    fn simpan_dan_baca_ulang() {
        let koneksi = koneksi_uji().unwrap();
        let hasil = simpan(
            &koneksi,
            &PatchPengaturan {
                kurangi_animasi: Some(true),
                widget_geometri_mode: Some(Geometri {
                    x: 40,
                    y: 60,
                    lebar: 340,
                    tinggi: 480,
                    maksimum: false,
                }),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hasil.kurangi_animasi);
        assert_eq!(hasil.widget_geometri_mode.unwrap().lebar, 340);
        assert!(
            !hasil.onboarding_selesai,
            "field yang tidak dikirim tidak berubah"
        );
    }

    #[test]
    fn transparansi_di_bawah_80_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let galat = simpan(
            &koneksi,
            &PatchPengaturan {
                widget_transparansi: Some(60),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert_eq!(galat.kode, "validasi");
        assert!(galat.pesan.contains("80"));
    }

    #[test]
    fn pintasan_tidak_valid_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let galat = simpan(
            &koneksi,
            &PatchPengaturan {
                pintasan_global: Some("TombolAja".into()),
                ..Default::default()
            },
        )
        .unwrap_err();
        assert_eq!(galat.kode, "validasi");
    }

    #[test]
    fn atur_ulang_balikan_ke_default() {
        let koneksi = koneksi_uji().unwrap();
        simpan(
            &koneksi,
            &PatchPengaturan {
                tema: Some(crate::features::settings::model::Tema::Gelap),
                ..Default::default()
            },
        )
        .unwrap();
        let hasil = atur_ulang(&koneksi).unwrap();
        assert_eq!(
            hasil.tema,
            crate::features::settings::model::Tema::IkutSistem
        );
    }

    #[test]
    fn hapus_semua_data_mengosongkan_koleksi() {
        let koneksi = koneksi_uji().unwrap();
        crate::features::prompts::service::buat(
            &koneksi,
            &crate::features::prompts::model::DataPrompt {
                isi: "Isi yang akan hilang".into(),
                ..Default::default()
            },
        )
        .unwrap();
        simpan(
            &koneksi,
            &PatchPengaturan {
                onboarding_selesai: Some(true),
                ..Default::default()
            },
        )
        .unwrap();

        let dir = crate::core::paths::dir_uji("hapus-berkas");
        let folder_cadangan = dir.join("cadangan");
        std::fs::create_dir_all(&folder_cadangan).unwrap();
        std::fs::write(folder_cadangan.join("lama.promptsaver"), b"x").unwrap();

        // Tanpa flag, berkas salinan tetap ada: pengguna harus memintanya secara sadar.
        assert_eq!(hapus_semua_data(&koneksi, &dir, &dir, false).unwrap(), 0);
        assert!(folder_cadangan.join("lama.promptsaver").is_file());

        assert_eq!(hapus_semua_data(&koneksi, &dir, &dir, true).unwrap(), 1);
        assert_eq!(std::fs::read_dir(&folder_cadangan).unwrap().count(), 0);
        let _ = std::fs::remove_dir_all(&dir);

        assert!(
            crate::features::prompts::service::daftar(&koneksi, &Default::default())
                .unwrap()
                .is_empty()
        );
        assert!(!ambil(&koneksi).unwrap().onboarding_selesai);
        let sisa_indeks: i64 = koneksi
            .query_row("SELECT count(*) FROM prompt_carik", [], |baris| {
                baris.get(0)
            })
            .unwrap();
        assert_eq!(sisa_indeks, 0, "indeks pencarian ikut dibersihkan");
    }
}
