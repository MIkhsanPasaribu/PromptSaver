//! Galat aplikasi. Satu tipe galat untuk seluruh lapisan, dipetakan ke pesan Bahasa
//! Indonesia yang ramah. Isi prompt pengguna tidak pernah masuk ke pesan galat.

use std::fmt;

use serde::{Deserialize, Serialize};

/// Bentuk galat yang dipahami frontend. Kontrak command memakai `Result<T, GalatAplikasi>`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GalatAplikasi {
    /// Kode stabil untuk logika UI, misalnya "validasi" atau "konflik".
    pub kode: String,
    /// Pesan Bahasa Indonesia yang boleh ditampilkan apa adanya ke pengguna.
    pub pesan: String,
}

impl GalatAplikasi {
    pub fn baru(kode: &str, pesan: impl Into<String>) -> Self {
        Self {
            kode: kode.to_string(),
            pesan: pesan.into(),
        }
    }

    pub fn validasi(pesan: impl Into<String>) -> Self {
        Self::baru("validasi", pesan)
    }

    pub fn tidak_ditemukan(entitas: &str) -> Self {
        Self::baru("tidak_ditemukan", format!("{entitas} tidak ditemukan."))
    }

    pub fn konflik(pesan: impl Into<String>) -> Self {
        Self::baru("konflik", pesan)
    }
}

impl fmt::Display for GalatAplikasi {
    fn fmt(&self, penyaji: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(penyaji, "{} ({})", self.pesan, self.kode)
    }
}

impl std::error::Error for GalatAplikasi {}

/// Galat SQLite dipetakan ke pesan ramah. Detail teknis mentah tidak ditampilkan supaya
/// tidak membocorkan struktur data, dan tetap tidak memuat isi prompt.
impl From<rusqlite::Error> for GalatAplikasi {
    fn from(sebab: rusqlite::Error) -> Self {
        let teks = sebab.to_string();
        if teks.contains("UNIQUE constraint failed") {
            Self::konflik("Nama sudah dipakai. Gunakan nama lain.")
        } else if teks.contains("FOREIGN KEY constraint failed") {
            Self::baru(
                "relasi_data",
                "Data terkait tidak ditemukan. Muat ulang aplikasi lalu coba lagi.",
            )
        } else if teks.contains("database is locked") {
            Self::baru(
                "database_sibuk",
                "Database sedang dipakai proses lain. Coba lagi sebentar.",
            )
        } else if teks.contains("no such function: rank") || teks.contains("misuse of aggregate") {
            // Hanya mungkin muncul saat pengembangan, jangan ditampilkan sebagai galat user.
            Self::baru(
                "database",
                "Pertanyaan pencarian tidak valid untuk susunan database ini.",
            )
        } else if teks.contains("disk I/O error") || teks.contains("full") {
            Self::baru(
                "penyimpanan",
                "Penyimpanan perangkat tidak cukup atau gagal ditulis.",
            )
        } else {
            Self::baru(
                "database",
                "Terjadi masalah pada database lokal. Data Anda tidak dihapus.",
            )
        }
    }
}

impl From<std::io::Error> for GalatAplikasi {
    fn from(_sebab: std::io::Error) -> Self {
        Self::baru(
            "berkas",
            "Gagal membaca atau menulis berkas. Periksa izin dan ruang penyimpanan.",
        )
    }
}

impl From<serde_json::Error> for GalatAplikasi {
    fn from(_sebab: serde_json::Error) -> Self {
        Self::baru(
            "format_data",
            "Format data tidak dikenali. Perbarui aplikasi ke versi terbaru.",
        )
    }
}

pub type Hasil<T> = Result<T, GalatAplikasi>;
