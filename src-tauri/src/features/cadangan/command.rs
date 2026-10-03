//! Command cadangan lokal. Frontend hanya mengirim nama berkas, tidak pernah jalur lengkap,
//! dan nama itu divalidasi di service sebelum menyentuh disk (PRD D3).

use tauri::{AppHandle, Manager};

use crate::core::error::GalatAplikasi;
use crate::core::paths::dir_data;
use crate::core::state::StateAplikasi;
use crate::core::task::dengan_koneksi_di_latar;
use crate::features::cadangan::service;
use crate::features::cadangan::service::Cadangan;
use crate::features::transfer::model::{RingkasanImpor, StrategiKonflik};

#[tauri::command]
pub fn daftar_cadangan(app: AppHandle) -> Result<Vec<Cadangan>, GalatAplikasi> {
    service::daftar(&dir_data(&app)?)
}

/// Menulis seluruh koleksi ke disk, jadi dikerjakan di luar thread utama.
#[tauri::command]
pub async fn cadangkan_sekarang(app: AppHandle) -> Result<Cadangan, GalatAplikasi> {
    let dir = dir_data(&app)?;
    dengan_koneksi_di_latar(app, move |koneksi| service::buat(koneksi, &dir)).await
}

#[tauri::command]
pub async fn pulihkan_cadangan(
    app: AppHandle,
    nama: String,
    strategi: StrategiKonflik,
) -> Result<RingkasanImpor, GalatAplikasi> {
    let dir = dir_data(&app)?;
    dengan_koneksi_di_latar(app, move |koneksi| {
        service::pulihkan(koneksi, &dir, &nama, strategi)
    })
    .await
}

/// Cadangan terjadwal untuk saat aplikasi mulai. Dipanggil dari thread kerja supaya cold start
/// tidak menunggu penulisan berkas (PRD Bagian 5).
pub fn jadwalkan_cadangan_saat_start(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let Some(dir) = dir_data(&handle).ok() else {
            return;
        };
        let Some(state) = handle.try_state::<StateAplikasi>() else {
            return;
        };
        let otomatis = state
            .dengan_koneksi(crate::features::settings::service::ambil)
            .map(|pengaturan| pengaturan.cadangan_otomatis)
            .unwrap_or(true);
        if !otomatis {
            return;
        }
        // Kode galat saja yang dicatat; isi prompt tidak pernah masuk log.
        if let Err(sebab) = state.dengan_koneksi(|koneksi| service::buat_terjadwal(koneksi, &dir)) {
            eprintln!("Cadangan otomatis tidak dibuat: {}", sebab.kode);
        }
    });
}
