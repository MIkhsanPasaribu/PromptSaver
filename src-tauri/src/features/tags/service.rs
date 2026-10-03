//! Logika bisnis tag.

use rusqlite::Connection;
use uuid::Uuid;

use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::tags::model::{Tag, WARNA_TAG_VALID};
use crate::features::tags::repository;

pub const PANJANG_NAMA_MAKS: usize = 40;

pub fn daftar(koneksi: &Connection) -> Hasil<Vec<Tag>> {
    repository::daftar(koneksi)
}

pub fn buat(koneksi: &Connection, nama: &str, warna: Option<&str>) -> Hasil<Tag> {
    let nama_bersih = normalisasi_nama(nama)?;
    let warna_pilihan = normalisasi_warna(warna)?;
    if repository::nama_terpakai(koneksi, &nama_bersih, None)? {
        return Err(GalatAplikasi::konflik(format!(
            "Tag \"{nama_bersih}\" sudah ada."
        )));
    }
    repository::simpan(
        koneksi,
        &Uuid::now_v7().to_string(),
        &nama_bersih,
        &warna_pilihan,
    )
}

pub fn ubah(koneksi: &Connection, id: &str, nama: &str, warna: Option<&str>) -> Hasil<Tag> {
    let nama_bersih = normalisasi_nama(nama)?;
    let warna_pilihan = normalisasi_warna(warna)?;
    if repository::nama_terpakai(koneksi, &nama_bersih, Some(id))? {
        return Err(GalatAplikasi::konflik(format!(
            "Tag \"{nama_bersih}\" sudah ada."
        )));
    }
    repository::ubah(koneksi, id, &nama_bersih, &warna_pilihan)?
        .ok_or_else(|| GalatAplikasi::tidak_ditemukan("Tag"))
}

pub fn hapus(koneksi: &Connection, id: &str) -> Hasil<()> {
    if !repository::ada(koneksi, id)? {
        return Err(GalatAplikasi::tidak_ditemukan("Tag"));
    }
    repository::hapus(koneksi, id)?;
    Ok(())
}

/// Cari tag berdasarkan nama, dipakai frontend untuk saran otomatis saat mengetik.
pub fn cari_saran(koneksi: &Connection, potongan: &str, batas: i64) -> Hasil<Vec<Tag>> {
    let semua = repository::daftar(koneksi)?;
    let kunci = potongan.trim().to_lowercase();
    Ok(semua
        .into_iter()
        .filter(|tag| kunci.is_empty() || tag.nama.to_lowercase().contains(&kunci))
        .take(batas.max(1) as usize)
        .collect())
}

fn normalisasi_nama(nama: &str) -> Hasil<String> {
    let bersih = nama.trim();
    if bersih.is_empty() {
        return Err(GalatAplikasi::validasi("Nama tag tidak boleh kosong."));
    }
    if bersih.chars().count() > PANJANG_NAMA_MAKS {
        return Err(GalatAplikasi::validasi(format!(
            "Nama tag maksimal {PANJANG_NAMA_MAKS} karakter."
        )));
    }
    if bersih.contains('#') || bersih.contains(['\n', '\r']) {
        return Err(GalatAplikasi::validasi(
            "Nama tag tidak boleh mengandung # atau baris baru.",
        ));
    }
    Ok(bersih.to_string())
}

fn normalisasi_warna(warna: Option<&str>) -> Hasil<String> {
    let dipilih = warna.unwrap_or("kuning").trim().to_lowercase();
    if WARNA_TAG_VALID.contains(&dipilih.as_str()) {
        Ok(dipilih)
    } else {
        Err(GalatAplikasi::validasi(format!(
            "Warna tag harus salah satu dari {}",
            WARNA_TAG_VALID.join(", ")
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;

    #[test]
    fn warna_tidak_valid_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let galat = buat(&koneksi, "riset", Some("ungu-neon")).unwrap_err();
        assert_eq!(galat.kode, "validasi");
    }

    #[test]
    fn tag_dengan_nama_sama_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        buat(&koneksi, "Jurnal", None).unwrap();
        let galat = buat(&koneksi, "jurnal", None).unwrap_err();
        assert_eq!(galat.kode, "konflik");
    }

    #[test]
    fn saran_menurut_potongan_kata() {
        let koneksi = koneksi_uji().unwrap();
        buat(&koneksi, "ringkas jurnal", None).unwrap();
        buat(&koneksi, "coding", None).unwrap();
        let saran = cari_saran(&koneksi, "jurn", 5).unwrap();
        assert_eq!(saran.len(), 1);
        assert_eq!(saran[0].nama, "ringkas jurnal");
    }
}
