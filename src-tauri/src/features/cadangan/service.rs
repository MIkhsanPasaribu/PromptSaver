//! Cadangan otomatis lokal (PRD D3). Berkas cadangan memakai format ekspor yang sama supaya
//! tidak ada skema kedua: satu sumber kebenaran di `transfer::format`.

use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::core::database::sekarang_ms;
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::transfer::format::EKSTENSI_BERKAS;
use crate::features::transfer::model::{CakupanEkspor, RingkasanImpor, StrategiKonflik};
use crate::features::transfer::service as transfer;

/// Jumlah cadangan yang dipertahankan. Lebih dari ini yang tertua dihapus.
pub const MAKS_CADANGAN: usize = 5;
const HARI_MS: i64 = 86_400_000;

/// Jeda antar cadangan otomatis: tujuh hari (PRD D3).
pub const JEDA_CADANGAN_MS: i64 = 7 * HARI_MS;

/// Nama folder cadangan di dalam direktori data aplikasi.
const NAMA_FOLDER: &str = "cadangan";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cadangan {
    pub nama: String,
    /// Epoch milidetik dari waktu ubah berkas, bukan dari nama berkas.
    pub dibuat_pada: i64,
    pub ukuran_byte: u64,
}

/// Folder cadangan di dalam direktori data privat aplikasi.
pub fn folder_cadangan(dir_data: &Path) -> Hasil<PathBuf> {
    let folder = dir_data.join(NAMA_FOLDER);
    std::fs::create_dir_all(&folder)?;
    Ok(folder)
}

/// Kosongkan isi folder cadangan tanpa menghapus foldernya. Dipakai "hapus semua data"
/// ketika pengguna juga meminta salinan di disk ikut hilang (PRD F3).
pub fn kosongkan(dir_data: &Path) -> Hasil<usize> {
    crate::core::paths::hapus_isi_folder(&dir_data.join(NAMA_FOLDER))
}

pub fn nama_cadangan(sekarang: i64) -> String {
    let (tahun, bulan, tanggal) = transfer::tanggal_from_hari_epoch(sekarang.div_euclid(HARI_MS));
    let dalam_hari = sekarang.rem_euclid(HARI_MS) / 1_000;
    let (jam, menit, detik) = (
        (dalam_hari / 3_600) % 24,
        (dalam_hari / 60) % 60,
        dalam_hari % 60,
    );
    format!(
        "cadangan-{tahun:04}-{bulan:02}-{tanggal:02}-{jam:02}{menit:02}{detik:02}.{EKSTENSI_BERKAS}"
    )
}

/// Cadangan terbaru lebih dulu. Berkas tanpa ekstensi ekspor diabaikan.
pub fn daftar(dir_data: &Path) -> Hasil<Vec<Cadangan>> {
    let folder = folder_cadangan(dir_data)?;
    let mut kumpul: Vec<Cadangan> = Vec::new();
    for item in std::fs::read_dir(&folder)? {
        let jalur = item?.path();
        if jalur.extension().and_then(|e| e.to_str()) != Some(EKSTENSI_BERKAS) {
            continue;
        }
        let Some(nama) = jalur.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let metadata = std::fs::metadata(&jalur)?;
        let dibuat_pada = metadata
            .modified()
            .ok()
            .and_then(|waktu| waktu.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or_default();
        kumpul.push(Cadangan {
            nama: nama.to_string(),
            dibuat_pada,
            ukuran_byte: metadata.len(),
        });
    }
    kumpul.sort_by_key(|c| std::cmp::Reverse(c.dibuat_pada));
    Ok(kumpul)
}

/// Tulis satu berkas cadangan dari koleksi saat ini, lalu buang cadangan yang melebihi batas.
pub fn buat(koneksi: &Connection, dir_data: &Path) -> Hasil<Cadangan> {
    if crate::features::prompts::service::statistik(koneksi)?.jumlah_prompt == 0 {
        return Err(GalatAplikasi::validasi(
            "Belum ada prompt untuk dicadangkan. Simpan satu prompt lalu cadangkan lagi.",
        ));
    }
    let (_, teks) = transfer::susun(koneksi, CakupanEkspor::Semua, &[])?;
    let nama = nama_cadangan(sekarang_ms());
    std::fs::write(folder_cadangan(dir_data)?.join(&nama), teks.as_bytes())?;
    pangkas(dir_data)?;
    // Hasil diambil dari daftar berkas, bukan dari angka saat menulis, supaya baris yang
    // tampil di Pengaturan sama persis dengan yang akan dibaca ulang frontend.
    daftar(dir_data)?
        .into_iter()
        .find(|c| c.nama == nama)
        .ok_or_else(|| {
            GalatAplikasi::baru("sistem", "Berkas cadangan tidak terbaca setelah ditulis.")
        })
}

/// True bila cadangan terakhir sudah berumur satu minggu, atau belum ada cadangan sama sekali.
pub fn perlu(terakhir: Option<i64>, sekarang: i64) -> bool {
    match terakhir {
        Some(waktu) => sekarang - waktu >= JEDA_CADANGAN_MS,
        None => true,
    }
}

/// Jalur cadangan otomatis saat aplikasi start. Berkas lama tetap dipertahankan bila
/// cadangan terakhir belum berumur satu minggu, dan koleksi kosong tidak dicadangkan.
pub fn buat_terjadwal(koneksi: &Connection, dir_data: &Path) -> Hasil<Option<Cadangan>> {
    if !perlu(
        daftar(dir_data)?.first().map(|c| c.dibuat_pada),
        sekarang_ms(),
    ) {
        return Ok(None);
    }
    match buat(koneksi, dir_data) {
        Ok(cadangan) => Ok(Some(cadangan)),
        // Satu-satunya validasi di `buat` adalah koleksi kosong; itu bukan keadaan darurat.
        Err(sebab) if sebab.kode == "validasi" => Ok(None),
        Err(sebab) => Err(sebab),
    }
}
/// Pulihkan satu cadangan lewat jalur impor yang sudah ada: atomik dan bisa memilih strategi.
pub fn pulihkan(
    koneksi: &Connection,
    dir_data: &Path,
    nama: &str,
    strategi: StrategiKonflik,
) -> Hasil<RingkasanImpor> {
    let jalur = jalur_aman(dir_data, nama)?;
    transfer::impor(koneksi, &jalur.to_string_lossy(), strategi)
}

/// Hanya nama berkas cadangan yang boleh dipakai. Pemisah jalur dan `..` ditolak supaya
/// lapisan web tidak bisa membaca berkas di luar folder cadangan.
fn jalur_aman(dir_data: &Path, nama: &str) -> Hasil<PathBuf> {
    let bersih = !nama.is_empty()
        && !nama.contains('/')
        && !nama.contains('\\')
        && !nama.contains("..")
        && nama.ends_with(&format!(".{EKSTENSI_BERKAS}"));
    if !bersih {
        return Err(GalatAplikasi::validasi(
            "Nama cadangan tidak dikenali. Pilih dari daftar cadangan.",
        ));
    }
    let jalur = folder_cadangan(dir_data)?.join(nama);
    if !jalur.is_file() {
        return Err(GalatAplikasi::baru(
            "tidak_ditemukan",
            "Berkas cadangan tidak ada di perangkat ini.",
        ));
    }
    Ok(jalur)
}

fn pangkas(dir_data: &Path) -> Hasil<()> {
    for lebih in daftar(dir_data)?.into_iter().skip(MAKS_CADANGAN) {
        let _ = std::fs::remove_file(folder_cadangan(dir_data)?.join(lebih.nama));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;
    use crate::core::paths::dir_uji;

    fn isi_satu(koneksi: &Connection) {
        crate::features::prompts::service::buat(
            koneksi,
            &crate::features::prompts::model::DataPrompt {
                judul: Some("Prompt cadangan".into()),
                isi: "Isi yang harus ikut tercadang".into(),
                folder_id: None,
                tag_ids: vec![],
                tag_baru: vec![],
            },
        )
        .unwrap();
    }

    #[test]
    fn nama_cadangan_berguna_untuk_membedakan_dua_jam() {
        let pagi = nama_cadangan(1_700_000_000_000);
        let sore = nama_cadangan(1_700_003_600_000);
        assert!(pagi.starts_with("cadangan-2023-"));
        assert!(pagi.ends_with(EKSTENSI_BERKAS));
        assert_ne!(pagi, sore);
    }

    #[test]
    fn jadwal_berjalan_hanya_setelah_seminggu() {
        assert!(perlu(None, 1_000));
        assert!(!perlu(Some(1_000), 1_000 + JEDA_CADANGAN_MS - 1));
        assert!(perlu(Some(1_000), 1_000 + JEDA_CADANGAN_MS));
    }

    #[test]
    fn cadangan_bisa_didaftar_dan_dipulihkan() {
        let asal = koneksi_uji().unwrap();
        isi_satu(&asal);
        let dir = dir_uji("pulih");

        let hasil = buat(&asal, &dir).unwrap();
        assert!(hasil.ukuran_byte > 0);
        assert_eq!(daftar(&dir).unwrap().len(), 1);

        let tujuan = koneksi_uji().unwrap();
        let ringkas =
            pulihkan(&tujuan, &dir, &hasil.nama, StrategiKonflik::LewatiDuplikat).unwrap();
        assert_eq!(ringkas.ditambah, 1);
        assert_eq!(
            crate::features::prompts::service::daftar(&tujuan, &Default::default())
                .unwrap()
                .len(),
            1
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn hanya_lima_cadangan_terbaru_dipertahankan() {
        let koneksi = koneksi_uji().unwrap();
        isi_satu(&koneksi);
        let dir = dir_uji("pangkas");
        let folder = folder_cadangan(&dir).unwrap();

        for jam in 0..7 {
            std::fs::write(
                folder.join(nama_cadangan(1_700_000_000_000 + jam * 1_000)),
                br#"{"format":"promptsaver"}"#,
            )
            .unwrap();
        }
        buat(&koneksi, &dir).unwrap();

        assert_eq!(daftar(&dir).unwrap().len(), MAKS_CADANGAN);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn jadwal_lewati_koleksi_kosong_dan_cadangan_yang_baru_dibuat() {
        let koneksi = koneksi_uji().unwrap();
        let dir = dir_uji("jadwal");

        assert!(
            buat_terjadwal(&koneksi, &dir).unwrap().is_none(),
            "koleksi kosong tidak dicadangkan"
        );
        isi_satu(&koneksi);
        assert!(buat_terjadwal(&koneksi, &dir).unwrap().is_some());
        assert!(
            buat_terjadwal(&koneksi, &dir).unwrap().is_none(),
            "cadangan kedua pada minggu yang sama dilewati"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn cadangan_manual_ditolak_ketika_koleksi_kosong() {
        let koneksi = koneksi_uji().unwrap();
        let dir = dir_uji("kosong");

        let galat = buat(&koneksi, &dir).unwrap_err();
        assert_eq!(galat.kode, "validasi");
        assert!(galat.pesan.contains("Belum ada prompt"));
        assert!(
            daftar(&dir).unwrap().is_empty(),
            "tidak ada berkas yang tertinggal"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn nama_berkas_luar_ditolak_sebelum_menyentuh_disk() {
        let koneksi = koneksi_uji().unwrap();
        let dir = dir_uji("jalur");
        for nama in [
            "../../koleksi.promptsaver",
            "a/b.promptsaver",
            "catatan.txt",
        ] {
            assert!(
                jalur_aman(&dir, nama).is_err(),
                "nama {nama} seharusnya ditolak"
            );
        }
        assert!(pulihkan(
            &koneksi,
            &dir,
            "..\\x.promptsaver",
            StrategiKonflik::LewatiDuplikat
        )
        .is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
