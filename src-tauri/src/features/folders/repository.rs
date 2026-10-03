//! Lapisan akses data folder. Satu-satunya tempat kode SQL folder dieksekusi.

use rusqlite::{params, Connection, Row};

use crate::core::database::sekarang_ms;
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::folders::model::Folder;

fn baris_ke_folder(baris: &Row<'_>) -> rusqlite::Result<Folder> {
    Ok(Folder {
        id: baris.get("id")?,
        nama: baris.get("nama")?,
        jumlah_prompt: baris.get("jumlah_prompt")?,
        dibuat_pada: baris.get("dibuat_pada")?,
        diubah_pada: baris.get("diubah_pada")?,
    })
}

const QUERY_DASAR: &str = "SELECT f.id,
       f.nama,
       f.dibuat_pada,
       f.diubah_pada,
       (SELECT count(*) FROM prompt p WHERE p.folder_id = f.id AND p.sampah_pada IS NULL) AS jumlah_prompt
  FROM folder f";

pub fn daftar(koneksi: &Connection) -> Hasil<Vec<Folder>> {
    let pernyataan = format!("{QUERY_DASAR} ORDER BY f.nama COLLATE NOCASE ASC");
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let baris = pernyataan_siap.query_map([], baris_ke_folder)?;
    let mut hasil = Vec::new();
    for folder in baris {
        hasil.push(folder?);
    }
    Ok(hasil)
}

pub fn simpan(koneksi: &Connection, id: &str, nama: &str) -> Hasil<Folder> {
    let waktu = sekarang_ms();
    koneksi.execute(
        "INSERT INTO folder (id, nama, dibuat_pada, diubah_pada) VALUES (?1, ?2, ?3, ?3)",
        params![id, nama, waktu],
    )?;
    ambil(koneksi, id)?.ok_or(GalatAplikasi::tidak_ditemukan("Folder"))
}

pub fn ambil(koneksi: &Connection, id: &str) -> Hasil<Option<Folder>> {
    let pernyataan = format!("{QUERY_DASAR} WHERE f.id = ?1");
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let mut baris = pernyataan_siap.query_map(params![id], baris_ke_folder)?;
    match baris.next() {
        Some(folder) => Ok(Some(folder?)),
        None => Ok(None),
    }
}

pub fn ubah_nama(koneksi: &Connection, id: &str, nama: &str) -> Hasil<Option<Folder>> {
    let waktu = sekarang_ms();
    let berubah = koneksi.execute(
        "UPDATE folder SET nama = ?2, diubah_pada = ?3 WHERE id = ?1",
        params![id, nama, waktu],
    )?;
    if berubah == 0 {
        return Ok(None);
    }
    ambil(koneksi, id)
}

pub fn hapus(koneksi: &Connection, id: &str) -> Hasil<usize> {
    Ok(koneksi.execute("DELETE FROM folder WHERE id = ?1", params![id])?)
}

pub fn nama_terpakai(koneksi: &Connection, nama: &str, kecuali_id: Option<&str>) -> Hasil<bool> {
    let ada = match kecuali_id {
        Some(kecuali) => crate::core::database::ada_baris(
            koneksi,
            "SELECT 1 FROM folder WHERE nama = ?1 COLLATE NOCASE AND id <> ?2",
            params![nama, kecuali],
        )?,
        None => crate::core::database::ada_baris(
            koneksi,
            "SELECT 1 FROM folder WHERE nama = ?1 COLLATE NOCASE",
            params![nama],
        )?,
    };
    Ok(ada)
}

pub fn ada(koneksi: &Connection, id: &str) -> Hasil<bool> {
    crate::core::database::ada_baris(koneksi, "SELECT 1 FROM folder WHERE id = ?1", params![id])
}
