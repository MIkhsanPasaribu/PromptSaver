//! Logika bisnis folder. Validasi di sini adalah sumber kebenaran, bukan validasi client.

use rusqlite::Connection;
use uuid::Uuid;

use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::folders::model::{AksiHapusFolder, Folder};
use crate::features::folders::repository;

/// Batas panjang nama folder. Nilai sama dipakai di skema Zod frontend.
pub const PANJANG_NAMA_MAKS: usize = 60;

pub fn daftar(koneksi: &Connection) -> Hasil<Vec<Folder>> {
    repository::daftar(koneksi)
}

pub fn buat(koneksi: &Connection, nama: &str) -> Hasil<Folder> {
    let nama_bersih = normalisasi_nama(nama)?;
    if repository::nama_terpakai(koneksi, &nama_bersih, None)? {
        return Err(GalatAplikasi::konflik(format!(
            "Folder \"{nama_bersih}\" sudah ada."
        )));
    }
    repository::simpan(koneksi, &Uuid::now_v7().to_string(), &nama_bersih)
}

pub fn ubah_nama(koneksi: &Connection, id: &str, nama: &str) -> Hasil<Folder> {
    let nama_bersih = normalisasi_nama(nama)?;
    if repository::nama_terpakai(koneksi, &nama_bersih, Some(id))? {
        return Err(GalatAplikasi::konflik(format!(
            "Folder \"{nama_bersih}\" sudah ada."
        )));
    }
    repository::ubah_nama(koneksi, id, &nama_bersih)?
        .ok_or_else(|| GalatAplikasi::tidak_ditemukan("Folder"))
}

/// Hapus folder tanpa pernah menghapus prompt secara diam-diam (PRD B1).
pub fn hapus(koneksi: &Connection, id: &str, aksi: AksiHapusFolder) -> Hasil<()> {
    if !repository::ada(koneksi, id)? {
        return Err(GalatAplikasi::tidak_ditemukan("Folder"));
    }

    // SQL ke tabel prompt dimiliki repository prompt; lapisan folder hanya memutuskan aksinya.
    match aksi {
        AksiHapusFolder::Pindahkan => {
            crate::features::prompts::repository::lepaskan_dari_folder(koneksi, id)?;
        }
        AksiHapusFolder::PindahkanKeSampah => {
            crate::features::prompts::repository::sampah_dari_folder(koneksi, id)?;
        }
    }

    repository::hapus(koneksi, id)?;
    Ok(())
}

fn normalisasi_nama(nama: &str) -> Hasil<String> {
    let bersih = nama.trim();
    if bersih.is_empty() {
        return Err(GalatAplikasi::validasi("Nama folder tidak boleh kosong."));
    }
    if bersih.chars().count() > PANJANG_NAMA_MAKS {
        return Err(GalatAplikasi::validasi(format!(
            "Nama folder maksimal {PANJANG_NAMA_MAKS} karakter."
        )));
    }
    if bersih.contains(['\n', '\r']) {
        return Err(GalatAplikasi::validasi(
            "Nama folder tidak boleh mengandung baris baru.",
        ));
    }
    Ok(bersih.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;

    #[test]
    fn buat_folder_dengan_nama_sama_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        buat(&koneksi, "Riset").unwrap();
        let galat = buat(&koneksi, "riset").unwrap_err();
        assert_eq!(galat.kode, "konflik");
        assert!(galat.pesan.contains("sudah ada"));
    }

    #[test]
    fn nama_kosong_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let galat = buat(&koneksi, "   ").unwrap_err();
        assert_eq!(galat.kode, "validasi");
    }

    #[test]
    fn hapus_folder_memindahkan_prompt_ke_tanpa_folder() {
        let koneksi = koneksi_uji().unwrap();
        let folder = buat(&koneksi, "Kerja").unwrap();
        crate::features::prompts::service::buat(
            &koneksi,
            &crate::features::prompts::model::DataPrompt {
                judul: Some("Prompt kerja".to_string()),
                isi: "Isi prompt kerja".into(),
                folder_id: Some(folder.id.clone()),
                tag_ids: vec![],
                tag_baru: vec![],
            },
        )
        .unwrap();

        assert_eq!(folder_jumlah(&koneksi, &folder.id), 1);
        hapus(&koneksi, &folder.id, AksiHapusFolder::Pindahkan).unwrap();

        assert_eq!(repository::daftar(&koneksi).unwrap().len(), 0);
        let tanpa_folder: i64 = koneksi
            .query_row(
                "SELECT count(*) FROM prompt WHERE folder_id IS NULL",
                [],
                |baris| baris.get(0),
            )
            .unwrap();
        assert_eq!(tanpa_folder, 1, "prompt tidak boleh ikut terhapus");
    }

    fn folder_jumlah(koneksi: &Connection, id: &str) -> i64 {
        repository::daftar(koneksi)
            .unwrap()
            .into_iter()
            .find(|f| f.id == id)
            .map(|f| f.jumlah_prompt)
            .unwrap_or(-1)
    }
}
