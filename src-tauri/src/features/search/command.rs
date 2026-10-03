//! Command pencarian.

use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::prompts::model::PromptTampil;
use crate::features::search::model::FilterCari;
use crate::features::search::service;

#[tauri::command]
pub fn cari_prompt(
    state: State<'_, StateAplikasi>,
    filter: FilterCari,
) -> Result<Vec<PromptTampil>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::cari(&koneksi, &filter)
}
