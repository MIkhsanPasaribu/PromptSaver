//! Command prompt. Tipis: ambil koneksi dari state, panggil service, petakan galat.

use crate::features::prompts::model::VersiPrompt;
use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::prompts::model::{
    DaftarFilter, DataPrompt, DrafPrompt, PromptTampil, Statistik,
};
use crate::features::prompts::service;

#[tauri::command]
pub fn daftar_prompt(
    state: State<'_, StateAplikasi>,
    filter: Option<DaftarFilter>,
) -> Result<Vec<PromptTampil>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::daftar(&koneksi, &filter.unwrap_or_default())
}

#[tauri::command]
pub fn ambil_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ambil(&koneksi, &id)
}

#[tauri::command]
pub fn buat_prompt(
    state: State<'_, StateAplikasi>,
    data: DataPrompt,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::buat(&koneksi, &data)
}

#[tauri::command]
pub fn ubah_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
    data: DataPrompt,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::perbarui(&koneksi, &id, &data)
}

/// Daftar riwayat versi sebuah prompt, terbaru lebih dulu (PRD C3).
#[tauri::command]
pub fn daftar_riwayat_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<Vec<VersiPrompt>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::riwayat(&koneksi, &id)
}

/// Kembalikan prompt ke salah satu versi lamanya (PRD C3).
#[tauri::command]
pub fn pulihkan_versi_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
    versi_id: String,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::pulihkan_versi(&koneksi, &id, &versi_id)
}

#[tauri::command]
pub fn duplikat_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::duplikat(&koneksi, &id)
}

#[tauri::command]
pub fn ganti_favorit_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
    aktif: bool,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ganti_favorit(&koneksi, &id, aktif)
}

#[tauri::command]
pub fn ganti_disemat_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
    aktif: bool,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ganti_disemat(&koneksi, &id, aktif)
}

#[tauri::command]
pub fn pindah_folder_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
    folder_id: Option<String>,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::pindah_folder(&koneksi, &id, folder_id.as_deref())
}

/// Dipanggil frontend tepat sebelum menulis clipboard, supaya hitungan terakhir dipakai akurat.
#[tauri::command]
pub fn tandai_prompt_dipakai(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    service::tandai_dipakai(&koneksi, &id)
}

#[tauri::command]
pub fn simpan_draf_prompt(
    state: State<'_, StateAplikasi>,
    data: DataPrompt,
) -> Result<DrafPrompt, GalatAplikasi> {
    let koneksi = state.db()?;
    service::simpan_draf(&koneksi, &data)
}

#[tauri::command]
pub fn ambil_draf_prompt(state: State<'_, StateAplikasi>) -> Result<DrafPrompt, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ambil_draf(&koneksi)
}

#[tauri::command]
pub fn buang_draf_prompt(state: State<'_, StateAplikasi>) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    service::buang_draf(&koneksi)
}

#[tauri::command]
pub fn statistik_koleksi(state: State<'_, StateAplikasi>) -> Result<Statistik, GalatAplikasi> {
    let koneksi = state.db()?;
    service::statistik(&koneksi)
}
