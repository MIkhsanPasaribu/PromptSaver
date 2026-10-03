//! Model pengaturan. Nilainya disimpan sebagai teks di tabel `pengaturan`,
//! dan bentuk terstrukturnya dikirim ke frontend supaya satu sumber kebenaran.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Tema {
    IkutSistem,
    Terang,
    Gelap,
}

/// Bahasa antarmuka. Nilainya disengaja memakai kode ISO supaya sama dengan kunci sumber
/// daya di `src/lib/i18n/sumber/`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Bahasa {
    #[serde(rename = "en")]
    Inggris,
    #[serde(rename = "id")]
    Indonesia,
}

/// Geometri jendela. Mode penuh dan Mode Widget disimpan dengan kunci terpisah
/// sesuai AGENTS.md Bagian 5.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Geometri {
    pub x: i32,
    pub y: i32,
    pub lebar: u32,
    pub tinggi: u32,
    pub maksimum: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PengaturanAplikasi {
    pub tema: Tema,
    /// Bahasa teks antarmuka. Teks validasi backend tetap sumber kebenaran (PRD E1).
    pub bahasa: Bahasa,
    pub kurangi_animasi: bool,
    pub urutan_daftar: crate::features::prompts::model::UrutanPrompt,
    pub onboarding_selesai: bool,
    pub ingat_nilai_variabel: bool,
    pub widget_geometri_penuh: Option<Geometri>,
    pub widget_geometri_mode: Option<Geometri>,
    pub widget_selalu_di_atas: bool,
    /// Persen opasitas jendela, 80 sampai 100. Batas bawah dijaga di service.
    pub widget_transparansi: u8,
    pub widget_tutup_ke_tray: bool,
    pub pintasan_global_aktif: bool,
    pub pintasan_global: String,
    /// Cadangan otomatis mingguan di direktori data aplikasi (PRD D3).
    pub cadangan_otomatis: bool,
}

impl Default for PengaturanAplikasi {
    fn default() -> Self {
        Self {
            tema: Tema::IkutSistem,
            bahasa: Bahasa::Inggris,
            kurangi_animasi: false,
            urutan_daftar: crate::features::prompts::model::UrutanPrompt::Terbaru,
            onboarding_selesai: false,
            ingat_nilai_variabel: true,
            widget_geometri_penuh: None,
            widget_geometri_mode: None,
            widget_selalu_di_atas: false,
            widget_transparansi: 100,
            widget_tutup_ke_tray: true,
            // PRD G3: pintasan global tidak aktif otomatis pada pemakaian pertama.
            pintasan_global_aktif: false,
            pintasan_global: "Control+Alt+K".to_string(),
            cadangan_otomatis: true,
        }
    }
}

/// Patch kosong berarti tidak mengubah nilai apa pun.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PatchPengaturan {
    pub tema: Option<Tema>,
    pub bahasa: Option<Bahasa>,
    pub kurangi_animasi: Option<bool>,
    pub urutan_daftar: Option<crate::features::prompts::model::UrutanPrompt>,
    pub onboarding_selesai: Option<bool>,
    pub ingat_nilai_variabel: Option<bool>,
    pub widget_geometri_penuh: Option<Geometri>,
    pub widget_geometri_mode: Option<Geometri>,
    pub widget_selalu_di_atas: Option<bool>,
    pub widget_transparansi: Option<u8>,
    pub widget_tutup_ke_tray: Option<bool>,
    pub pintasan_global_aktif: Option<bool>,
    pub pintasan_global: Option<String>,
    pub cadangan_otomatis: Option<bool>,
}
