//! Koneksi SQLite dan migrasi berversi.
//! Hanya modul ini dan lapisan repository yang menyentuh SQLite. Frontend tidak pernah
//! mengakses database langsung (AGENTS.md Bagian 3 dan 5).

use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::core::error::{GalatAplikasi, Hasil};

/// Daftar migrasi berversi. Nomor urut naik, jangan menyisipkan di tengah.
/// File migrasi yang sudah dirilis bersifat immutable.
const DAFTAR_MIGRASI: &[(i32, &str)] = &[
    (
        1,
        include_str!("../../database/migrations/0001_skema_awal.sql"),
    ),
    (
        2,
        include_str!("../../database/migrations/0002_versi_prompt.sql"),
    ),
];

/// Versi skema database tertinggi yang dikenal build ini. Beda konsep dari
/// `transfer::format::VERSI_SKEMA_BERKAS`, yang menghitung struktur berkas `.promptsaver`.
pub const VERSI_SKEMA_DATABASE: i32 = 2;

pub fn path_database(dir_data: &Path) -> PathBuf {
    dir_data.join("promptsaver.db")
}

/// Buka database pada jalur tertentu dan siapkan pragma serta migrasi.
pub fn buka_koneksi(path_db: &Path) -> Hasil<Connection> {
    if let Some(induk) = path_db.parent() {
        std::fs::create_dir_all(induk)?;
    }
    let koneksi = Connection::open(path_db)?;
    siapkan(&koneksi)?;
    Ok(koneksi)
}

/// Koneksi in-memory untuk pengujian.
/// Koneksi in-memory untuk pengujian.
#[cfg(test)]
pub fn koneksi_uji() -> Hasil<Connection> {
    let koneksi = Connection::open_in_memory()?;
    siapkan(&koneksi)?;
    Ok(koneksi)
}

fn siapkan(koneksi: &Connection) -> Hasil<()> {
    koneksi.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 3000;",
    )?;
    jalankan_migrasi(koneksi)?;
    Ok(())
}

/// Terapkan migrasi yang belum berjalan berdasarkan `PRAGMA user_version`.
pub fn jalankan_migrasi(koneksi: &Connection) -> Hasil<()> {
    let versi_sekarang: i32 = koneksi.query_row("PRAGMA user_version", [], |baris| baris.get(0))?;

    if versi_sekarang > VERSI_SKEMA_DATABASE {
        return Err(GalatAplikasi::baru(
            "skema_lebih_baru",
            format!(
                "Skema database versi {versi_sekarang} lebih baru dari yang didukung aplikasi ini."
            ),
        ));
    }

    for (versi, sql) in DAFTAR_MIGRASI {
        if versi_sekarang >= *versi {
            continue;
        }
        // Satu migrasi = satu transaksi, supaya kegagalan tidak meninggalkan skema setengah jadi.
        koneksi.execute("SAVEPOINT migrasi", [])?;
        match koneksi
            .execute_batch(sql)
            .and_then(|_| koneksi.execute_batch(&format!("PRAGMA user_version = {versi}")))
        {
            Ok(_) => {
                let _ = koneksi.execute("RELEASE SAVEPOINT migrasi", [])?;
            }
            Err(sebab) => {
                let _ = koneksi.execute("ROLLBACK TO SAVEPOINT migrasi", [])?;
                let _ = koneksi.execute("RELEASE SAVEPOINT migrasi", [])?;
                return Err(GalatAplikasi::from(sebab));
            }
        }
    }

    Ok(())
}

/// Cek apakah sebuah query menghasilkan baris.rusqlite::Connection::exists tidak publik,
/// jadi kebutuhan "apakah ada" ditulis lewat query_row yang mengabaikan isinya.
pub fn ada_baris(
    koneksi: &Connection,
    pernyataan: &str,
    nilai: impl rusqlite::Params,
) -> Hasil<bool> {
    Ok(koneksi
        .query_row(pernyataan, nilai, |_baris| Ok::<(), rusqlite::Error>(()))
        .is_ok())
}

/// Epoch milidetik, format waktu baku aplikasi (AGENTS.md Bagian 4).
pub fn sekarang_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|selisih| selisih.as_millis() as i64)
        .unwrap_or(0)
}

/// Buat daftar tanda tanya untuk klausa `IN`. Jumlah placeholder ditentukan dari banyaknya
/// nilai, bukan dari isi nilai, sehingga tidak ada teks pengguna yang masuk ke SQL.
pub fn placeholder_banyak(jumlah: usize) -> String {
    match jumlah {
        0 => "(NULL)".to_string(),
        1 => "(?1)".to_string(),
        n => format!(
            "({})",
            (1..=n)
                .map(|i| format!("?{i}"))
                .collect::<Vec<_>>()
                .join(", ")
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrasi_membuat_seluruh_tabel() {
        let koneksi = koneksi_uji().expect("koneksi in-memory harus berhasil");
        let jumlah: i64 = koneksi
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%'",
                [],
                |baris| baris.get(0),
            )
            .unwrap();
        assert!(
            jumlah > 10,
            "skema awal harus membuat tabel dan indeks, ditemukan {jumlah}"
        );
    }

    #[test]
    fn migrasi_idempoten_saat_dijalankan_duakali() {
        let koneksi = koneksi_uji().expect("koneksi in-memory harus berhasil");
        jalankan_migrasi(&koneksi).expect("migrasi ulang tidak boleh gagal");
        let versi: i32 = koneksi
            .query_row("PRAGMA user_version", [], |baris| baris.get(0))
            .unwrap();
        assert_eq!(versi, VERSI_SKEMA_DATABASE);
    }

    #[test]
    fn pragma_pengaturan_terpasang() {
        let koneksi = koneksi_uji().unwrap();
        let mode: String = koneksi
            .query_row("PRAGMA journal_mode", [], |baris| baris.get(0))
            .unwrap();
        assert_eq!(
            mode.to_lowercase(),
            "memory",
            "in-memory memakai journal mode memory"
        );

        let fk: i64 = koneksi
            .query_row("PRAGMA foreign_keys", [], |baris| baris.get(0))
            .unwrap();
        assert_eq!(fk, 1, "foreign_keys wajib aktif");
    }
}
