//! Lapisan akses data pengaturan.

use rusqlite::{params, Connection};

use crate::core::database::sekarang_ms;
use crate::core::error::Hasil;

pub fn ambil_nilai(koneksi: &Connection, kunci: &str) -> Hasil<Option<String>> {
    Ok(koneksi
        .query_row(
            "SELECT nilai FROM pengaturan WHERE kunci = ?1",
            params![kunci],
            |baris| baris.get::<_, String>(0),
        )
        .ok())
}

pub fn simpan_nilai(koneksi: &Connection, kunci: &str, nilai: &str) -> Hasil<()> {
    koneksi.execute(
        "INSERT INTO pengaturan (kunci, nilai, diubah_pada) VALUES (?1, ?2, ?3)
         ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai, diubah_pada = excluded.diubah_pada",
        params![kunci, nilai, sekarang_ms()],
    )?;
    Ok(())
}

pub fn hapus_nilai(koneksi: &Connection, kunci: &str) -> Hasil<()> {
    koneksi.execute("DELETE FROM pengaturan WHERE kunci = ?1", params![kunci])?;
    Ok(())
}

/// Kosongkan tabel pengaturan kecuali baris yang disebut di `dikecualikan`. Baris kunci aplikasi
/// masuk daftar itu supaya "Atur ulang" tidak bisa melepas kunci tanpa PIN. Nama baris dibaca dari
/// database lalu dihapus satu per satu dengan parameter, jadi tidak ada SQL yang disusun dari teks.
pub fn kosongkan_pengaturan(koneksi: &Connection, dikecualikan: &[&str]) -> Hasil<usize> {
    let daftar: Vec<String> = koneksi
        .prepare("SELECT kunci FROM pengaturan")?
        .query_map([], |baris| baris.get::<_, String>(0))?
        .filter_map(Result::ok)
        .collect();
    let mut jumlah = 0usize;
    for kunci in daftar {
        if dikecualikan.contains(&kunci.as_str()) {
            continue;
        }
        jumlah += koneksi.execute("DELETE FROM pengaturan WHERE kunci = ?1", params![kunci])?;
    }
    Ok(jumlah)
}

/// Hapus seluruh data pengguna. Skema dan migrasi tetap utuh (PRD F3).
pub fn hapus_semua_data(koneksi: &Connection) -> Hasil<()> {
    koneksi.execute("DELETE FROM prompt_tag", [])?;
    koneksi.execute("DELETE FROM prompt", [])?;
    koneksi.execute("DELETE FROM tag", [])?;
    koneksi.execute("DELETE FROM folder", [])?;
    koneksi.execute("DELETE FROM draf", [])?;
    koneksi.execute("DELETE FROM prompt_carik", [])?;
    koneksi.execute("DELETE FROM pengaturan", [])?;
    Ok(())
}
