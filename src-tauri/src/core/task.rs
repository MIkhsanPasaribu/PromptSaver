//! Eksekusi pekerjaan database yang berat di luar thread utama.
//!
//! Command sinkron dijalankan pada thread event loop. Impor atau ekspor koleks besar di sana
//! membekukan jendela dan animasi (PRD Bagian 5 soal responsif), jadi perintah semacam itu
//! dideklarasikan `async` dan mengambil koneksi lewat helper di modul ini.

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::core::error::{GalatAplikasi, Hasil};
use crate::core::state::StateAplikasi;

/// Jalankan `aksi` pada thread kerja dengan koneksi dari state aplikasi.
/// Tauri tidak mengizinkan `State<'_, _>` menyeberang ke `spawn_blocking`, jadi state-nya
/// diambil sendiri dari `AppHandle` di dalam thread kerja.
pub async fn dengan_koneksi_di_latar<T, F>(app: AppHandle, aksi: F) -> Hasil<T>
where
    T: Send + 'static,
    F: FnOnce(&Connection) -> Hasil<T> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<StateAplikasi>();
        state.dengan_koneksi(aksi)
    })
    .await
    .map_err(|sebab| {
        GalatAplikasi::baru(
            "sistem",
            format!("Pekerjaan latar belakang tidak selesai: {sebab}"),
        )
    })?
}
