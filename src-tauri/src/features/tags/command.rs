//! Command tag.

use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::tags::model::Tag;
use crate::features::tags::service;

#[tauri::command]
pub fn daftar_tag(state: State<'_, StateAplikasi>) -> Result<Vec<Tag>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::daftar(&koneksi)
}

#[tauri::command]
pub fn buat_tag(
    state: State<'_, StateAplikasi>,
    nama: String,
    warna: Option<String>,
) -> Result<Tag, GalatAplikasi> {
    let koneksi = state.db()?;
    service::buat(&koneksi, &nama, warna.as_deref())
}

#[tauri::command]
pub fn ubah_tag(
    state: State<'_, StateAplikasi>,
    id: String,
    nama: String,
    warna: Option<String>,
) -> Result<Tag, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ubah(&koneksi, &id, &nama, warna.as_deref())
}

#[tauri::command]
pub fn hapus_tag(state: State<'_, StateAplikasi>, id: String) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    service::hapus(&koneksi, &id)
}

#[tauri::command]
pub fn saran_tag(
    state: State<'_, StateAplikasi>,
    potongan: String,
    batas: Option<i64>,
) -> Result<Vec<Tag>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::cari_saran(&koneksi, &potongan, batas.unwrap_or(8))
}
