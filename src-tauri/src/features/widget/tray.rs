//! System tray desktop (PRD G3). Menu: tampil atau sembunyikan widget, buka jendela utama, keluar.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::core::state::StateAplikasi;
use crate::features::settings::service as settings;
use crate::features::widget::mode_jendela::jendela_utama;

pub const MENU_WIDGET: &str = "widget";
pub const MENU_UTAMA: &str = "utama";
pub const MENU_KELUAR: &str = "keluar";

pub fn buat(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let Some(ikon) = app.default_window_icon().cloned() else {
        // Tray tidak kritikal. Bila ikon belum tersedia, aplikasi tetap berjalan tanpa tray.
        return Ok(());
    };

    let tampil_widget =
        MenuItem::with_id(app, MENU_WIDGET, "Tampilkan widget", true, None::<&str>)?;
    let buka_utama = MenuItem::with_id(app, MENU_UTAMA, "Buka jendela utama", true, None::<&str>)?;
    let keluar = MenuItem::with_id(app, MENU_KELUAR, "Keluar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&tampil_widget, &buka_utama, &keluar])?;

    let _tray = TrayIconBuilder::with_id("tray-utama")
        .icon(ikon)
        .tooltip("PromptSaver")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_WIDGET => tampil_dari_tray(app, true),
            MENU_UTAMA => tampil_dari_tray(app, false),
            MENU_KELUAR => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                tampil_dari_tray(tray.app_handle(), true);
            }
        })
        .build(app);

    Ok(())
}

/// `widget = true` menampilkan dalam mode widget, `false` menampilkan jendela penuh.
fn tampil_dari_tray(app: &AppHandle, mode_widget: bool) {
    let Ok(jendela) = jendela_utama(app) else {
        return;
    };
    let _ = jendela.show();
    let _ = jendela.unminimize();
    let _ = jendela.set_focus();

    if !mode_widget {
        let Some(state) = app.try_state::<StateAplikasi>() else {
            return;
        };
        let Ok(koneksi) = state.db() else { return };
        let Ok(penyimpanan) = settings::ambil(&koneksi) else {
            return;
        };
        if let Some(penuh) = penyimpanan.widget_geometri_penuh {
            let _ = jendela.set_size(tauri::LogicalSize::new(
                penuh.lebar as f64,
                penuh.tinggi as f64,
            ));
            let _ = jendela.set_position(tauri::LogicalPosition::new(penuh.x, penuh.y));
        }
    }
}

/// Ditangkap saat tombol tutup jendela ditekan. Mengembalikan `true` bila jendela
/// hanya disembunyikan ke tray (PRD G3).
pub fn tutup_ke_tray(app: &AppHandle) -> bool {
    let Some(state) = app.try_state::<StateAplikasi>() else {
        return false;
    };
    // Koneksi dilepas sebelum operasi jendela, sama seperti command Mode Widget.
    let boleh = match state.dengan_koneksi(settings::ambil) {
        Ok(penyimpanan) => penyimpanan.widget_tutup_ke_tray,
        Err(_) => false,
    };
    if !boleh {
        return false;
    }

    if let Ok(jendela) = jendela_utama(app) {
        let _ = jendela.hide();
    }
    true
}
