//! Pintasan global desktop (PRD G3). Aktif hanya bila pengguna menyalakannya di pengaturan.

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::settings::service as settings;
use crate::features::widget::mode_jendela::jendela_utama;

/// Handler dipasang ke plugin saat aplikasi mulai. Menampilkan jendela bila tersembunyi,
/// menyembunyikan bila sedang tampak.
pub fn penanganan_pintasan(
    _app: &AppHandle,
    _shortcut: &Shortcut,
    event: tauri_plugin_global_shortcut::ShortcutEvent,
) {
    if event.state() != ShortcutState::Pressed {
        return;
    }
    toggle_jendela(_app);
}

fn toggle_jendela(app: &AppHandle) {
    let Ok(jendela) = jendela_utama(app) else {
        return;
    };

    if jendela.is_visible().unwrap_or(false) {
        let _ = jendela.hide();
    } else {
        let _ = jendela.show();
        let _ = jendela.unminimize();
        let _ = jendela.set_focus();
    }
}

/// Daftarkan pintasan sesuai pengaturan. Kegagalan dikembalikan ke frontend supaya
/// pengguna bisa memilih kombinasi lain (PRD G3 alur gagal).
pub fn daftarkan(app: &AppHandle) -> Result<(), GalatAplikasi> {
    batalkan(app)?;

    let Some(state) = app.try_state::<StateAplikasi>() else {
        return Ok(());
    };
    let Ok(koneksi) = state.db() else {
        return Ok(());
    };
    let Ok(penyimpanan) = settings::ambil(&koneksi) else {
        return Ok(());
    };
    drop(koneksi);

    if !penyimpanan.pintasan_global_aktif {
        return Ok(());
    }

    let kombinasi = penyimpanan.pintasan_global.clone();
    app.global_shortcut()
        .register(kombinasi.as_str())
        .map_err(|sebab| {
            GalatAplikasi::baru(
                "pintasan_bentrok",
                format!("Pintasan {kombinasi} tidak bisa dipakai: {sebab}"),
            )
        })
}

/// Hentikan semua pintasan global yang sedang terdaftar.
pub fn batalkan(app: &AppHandle) -> Result<(), GalatAplikasi> {
    app.global_shortcut().unregister_all().map_err(|sebab| {
        GalatAplikasi::baru(
            "pintasan",
            format!("Pintasan global gagal dibatalkan: {sebab}"),
        )
    })
}

/// Ulangi pendaftaran setelah pengguna mengubah kombinasi atau saklar di Pengaturan (PRD G3).
/// Kegagalan dikembalikan ke frontend supaya pengguna bisa memilih kombinasi lain.
#[tauri::command]
pub fn terapkan_pintasan_global(app: AppHandle) -> Result<(), GalatAplikasi> {
    daftarkan(&app)
}
