//! Model folder. Nama kolom database memakai Bahasa Indonesia snake_case,
//! sedangkan JSON yang dikirim ke frontend memakai camelCase.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub nama: String,
    pub jumlah_prompt: i64,
    pub dibuat_pada: i64,
    pub diubah_pada: i64,
}

/// Cara menangani prompt di dalam folder yang akan dihapus (PRD B1, alur gagal).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AksiHapusFolder {
    /// Pindahkan prompt ke "Tanpa Folder".
    Pindahkan,
    /// Pindahkan prompt ke Sampah.
    PindahkanKeSampah,
}
