//! Model prompt. Batas panjang di bawah ini adalah kontrak tunggal yang juga dipakai
//! skema Zod di frontend (PRD A1: isi minimal 50.000 karakter, judul otomatis 40 karakter).

use serde::{Deserialize, Serialize};

use crate::features::tags::model::Tag;

pub const PANJANG_ISI_MAKS: usize = 50_000;
pub const PANJANG_JUDUL_MAKS: usize = 300;
pub const PANJANG_JUDUL_OTOMATIS: usize = 40;
pub const PANJANG_POTONGAN: usize = 160;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
#[derive(Default)]
pub enum UrutanPrompt {
    /// Terbaru menurut waktu diubah.
    #[default]
    Terbaru,
    /// Terakhir dipakai atau disalin.
    Dipakai,
    /// Abjad berdasarkan judul.
    Abjad,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DaftarFilter {
    pub folder_id: Option<String>,
    /// Saring prompt yang tidak berada di folder mana pun.
    pub tanpa_folder: bool,
    pub tag_ids: Vec<String>,
    pub hanya_favorit: bool,
    /// `true` = hanya isi Sampah. `false` dengan `sertakan_sampah` menentukan apakah
    /// prompt yang sedang di Sampah ikut diambil.
    pub hanya_sampah: bool,
    /// Untuk ekspor: ambil prompt aktif dan yang ada di Sampah sekaligus.
    pub sertakan_sampah: bool,
    pub urutan: UrutanPrompt,
    pub batas: Option<i64>,
    pub kursor: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PromptTampil {
    pub id: String,
    pub judul: String,
    pub isi: String,
    pub folder_id: Option<String>,
    pub nama_folder: Option<String>,
    pub tags: Vec<Tag>,
    pub favorit: bool,
    pub disemat: bool,
    pub dibuat_pada: i64,
    pub diubah_pada: i64,
    pub dipakai_terakhir: Option<i64>,
    pub sampah_pada: Option<i64>,
    /// Potongan isi untuk daftar dan Mode Widget. Tidak dikirim saat membuka detail.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub potongan: Option<String>,
}

/// Satu entri riwayat versi prompt (PRD C3). Yang disimpan adalah keadaan sebelum diubah.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersiPrompt {
    pub id: String,
    pub prompt_id: String,
    pub judul: String,
    pub isi: String,
    pub disimpan_pada: i64,
}

/// Data masuk untuk membuat atau mengubah prompt.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DataPrompt {
    pub judul: Option<String>,
    pub isi: String,
    pub folder_id: Option<String>,
    pub tag_ids: Vec<String>,
    /// Nama tag baru yang dibuat langsung dari form prompt (PRD B2).
    pub tag_baru: Vec<TagBaru>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TagBaru {
    pub nama: String,
    pub warna: Option<String>,
}

/// Draf belum tersimpan, dipulihkan saat aplikasi dibuka lagi (PRD A1).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DrafPrompt {
    pub judul: String,
    pub isi: String,
    pub folder_id: Option<String>,
    pub tag_ids: Vec<String>,
    pub diubah_pada: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Statistik {
    pub jumlah_prompt: i64,
    pub jumlah_folder: i64,
    pub jumlah_tag: i64,
    pub jumlah_sampah: i64,
    pub ukuran_database_kb: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HasilKotor {
    pub id: String,
    pub judul: String,
    pub isi: String,
    pub folder_id: Option<String>,
    pub nama_folder: Option<String>,
    pub favorit: bool,
    pub disemat: bool,
    pub dibuat_pada: i64,
    pub diubah_pada: i64,
    pub dipakai_terakhir: Option<i64>,
    pub sampah_pada: Option<i64>,
}
