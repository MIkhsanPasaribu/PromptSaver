//! Command Sampah.

use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::prompts::model::PromptTampil;
use crate::features::trash::service;

#[tauri::command]
pub fn daftar_sampah(state: State<'_, StateAplikasi>) -> Result<Vec<PromptTampil>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::daftar(&koneksi)
}

#[tauri::command]
pub fn pulihkan_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<PromptTampil, GalatAplikasi> {
    let koneksi = state.db()?;
    service::pulihkan(&koneksi, &id)
}

#[tauri::command]
pub fn hapus_permanen_prompt(
    state: State<'_, StateAplikasi>,
    id: String,
) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    service::hapus_permanen(&koneksi, &id)
}

#[tauri::command]
pub fn hapus_prompt(state: State<'_, StateAplikasi>, id: String) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    crate::features::prompts::service::ke_sampah(&koneksi, &id)?;
    Ok(())
}

#[tauri::command]
pub fn kosongkan_sampah(state: State<'_, StateAplikasi>) -> Result<usize, GalatAplikasi> {
    let koneksi = state.db()?;
    service::kosongkan(&koneksi)
}
