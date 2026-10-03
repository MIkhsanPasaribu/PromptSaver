//! Command pengaturan.

use tauri::{AppHandle, State};

use crate::core::error::GalatAplikasi;
use crate::core::paths::dir_data;
use crate::core::state::StateAplikasi;
use crate::core::task::dengan_koneksi_di_latar;
use crate::features::settings::model::{PatchPengaturan, PengaturanAplikasi};
use crate::features::settings::service;

#[tauri::command]
pub fn ambil_pengaturan(
    state: State<'_, StateAplikasi>,
) -> Result<PengaturanAplikasi, GalatAplikasi> {
    let koneksi = state.db()?;
    service::ambil(&koneksi)
}

#[tauri::command]
pub fn simpan_pengaturan(
    state: State<'_, StateAplikasi>,
    patch: PatchPengaturan,
) -> Result<PengaturanAplikasi, GalatAplikasi> {
    let koneksi = state.db()?;
    service::simpan(&koneksi, &patch)
}

#[tauri::command]
pub fn atur_ulang_pengaturan(
    state: State<'_, StateAplikasi>,
) -> Result<PengaturanAplikasi, GalatAplikasi> {
    let koneksi = state.db()?;
    service::atur_ulang(&koneksi)
}

/// F3 hapus semua data. Frontend wajib mengirim konfirmasi dua langkah sebelum memanggil ini.
/// `sertakan_berkas` ikut menghapus isi folder cadangan dan tukar ekspor (PRD F3). Dikerjakan di
/// luar thread utama karena menyentuh database sekaligus seluruh isi folder di disk.
#[tauri::command]
pub async fn hapus_semua_data(
    app: AppHandle,
    sertakan_berkas: bool,
) -> Result<usize, GalatAplikasi> {
    let dir = dir_data(&app)?;
    dengan_koneksi_di_latar(app, move |koneksi| {
        service::hapus_semua_data(koneksi, &dir, sertakan_berkas)
    })
    .await
}
