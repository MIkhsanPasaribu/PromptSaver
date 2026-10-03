//! Model berkas ekspor dan hasil impor.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IsiEkspor {
    pub folders: Vec<EksporFolder>,
    pub tags: Vec<EksporTag>,
    pub prompts: Vec<EksporPrompt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EksporFolder {
    pub id: String,
    pub nama: String,
    pub dibuat_pada: i64,
    pub diubah_pada: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EksporTag {
    pub id: String,
    pub nama: String,
    pub warna: String,
    pub dibuat_pada: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EksporPrompt {
    pub id: String,
    pub judul: String,
    pub isi: String,
    pub folder_id: Option<String>,
    pub tag_ids: Vec<String>,
    pub favorit: bool,
    pub disemat: bool,
    pub dibuat_pada: i64,
    pub diubah_pada: i64,
    pub dipakai_terakhir: Option<i64>,
    pub sampah_pada: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CakupanEkspor {
    Semua,
    Pilihan,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum StrategiKonflik {
    /// Prompt dengan id yang sama dilewati.
    LewatiDuplikat,
    /// Prompt dengan id yang sama ditimpa bila berkas lebih baru.
    TimpaJikaLebihBaru,
    /// Prompt duplikat disimpan sebagai entri baru dengan id baru.
    SimpanSebagaiSalinan,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RingkasanEkspor {
    pub jumlah_prompt: usize,
    pub jumlah_folder: usize,
    pub jumlah_tag: usize,
    pub ukuran_byte: usize,
    pub lokasi: String,
}

/// Folder tukar berkas dan path berkas ekspor yang ada di dalamnya, terbaru lebih dulu.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaftarBerkasEkspor {
    pub folder: String,
    pub berkas: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PratinjauImpor {
    pub jumlah_prompt: usize,
    pub jumlah_folder: usize,
    pub jumlah_tag: usize,
    pub bentrok: usize,
    pub versi_skema: i64,
    pub ukuran_byte: usize,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RingkasanImpor {
    pub ditambah: usize,
    pub dilewati: usize,
    pub ditimpa: usize,
    pub gagal: usize,
    pub pesan: Vec<String>,
}
