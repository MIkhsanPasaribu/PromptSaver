//! Command folder. Lapisan tipis: ambil koneksi, panggil service, kembalikan hasil.

use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::folders::model::{AksiHapusFolder, Folder};
use crate::features::folders::service;

#[tauri::command]
pub fn daftar_folder(state: State<'_, StateAplikasi>) -> Result<Vec<Folder>, GalatAplikasi> {
    let koneksi = state.db()?;
    service::daftar(&koneksi)
}

#[tauri::command]
pub fn buat_folder(state: State<'_, StateAplikasi>, nama: String) -> Result<Folder, GalatAplikasi> {
    let koneksi = state.db()?;
    service::buat(&koneksi, &nama)
}

#[tauri::command]
pub fn ubah_nama_folder(
    state: State<'_, StateAplikasi>,
    id: String,
    nama: String,
) -> Result<Folder, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ubah_nama(&koneksi, &id, &nama)
}

#[tauri::command]
pub fn hapus_folder(
    state: State<'_, StateAplikasi>,
    id: String,
    aksi: AksiHapusFolder,
) -> Result<(), GalatAplikasi> {
    let koneksi = state.db()?;
    service::hapus(&koneksi, &id, aksi)
}
