//! Command variabel template.

use std::collections::HashMap;

use rusqlite::Connection;
use tauri::State;

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::settings::service as layanan_pengaturan;
use crate::features::variabel::service;

#[tauri::command]
pub fn susun_variabel(
    isi: String,
    nilai: HashMap<String, String>,
) -> Result<String, GalatAplikasi> {
    Ok(service::isi_variabel(&isi, &nilai))
}

/// Nilai terakhir per nama variabel, dipakai sebagai saran pada pemakaian berikutnya (PRD C2).
#[tauri::command]
pub fn ambil_nilai_variabel_terakhir(
    state: State<'_, StateAplikasi>,
) -> Result<HashMap<String, String>, GalatAplikasi> {
    let gembok = state.db()?;
    let koneksi: &Connection = &gembok;
    layanan_pengaturan::ambil_peta_variabel(koneksi)
}

#[tauri::command]
pub fn simpan_nilai_variabel_terakhir(
    state: State<'_, StateAplikasi>,
    nilai: HashMap<String, String>,
) -> Result<(), GalatAplikasi> {
    let gembok = state.db()?;
    let koneksi: &Connection = &gembok;
    layanan_pengaturan::simpan_peta_variabel(koneksi, &nilai)
}
