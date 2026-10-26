//! Mulai otomatis saat pengguna masuk ke Windows.
//!
//! Plugin resmi Tauri hanya menulis satu nilai di
//! `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. Nama nilai itu kita kunci ke
//! "PromptSaver" supaya pembersihan yang sudah ada di template NSIS
//! (`DeleteRegValue HKCU "Software\...\Run" "${PRODUCTNAME}"`) ikut membereskannya saat
//! uninstal, dan supaya entri yang tampil di Settings > Apps > Startup memakai nama produk,
//! bukan nama paket Cargo.

use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Manager};

use crate::core::error::Hasil;
use crate::core::state::StateAplikasi;
use crate::features::widget::mode_jendela;

/// Harus sama dengan `productName` di `tauri.conf.json`.
const NAMA_ENTRI_START: &str = "PromptSaver";

/// Argumen yang ditulis ke entri start dan dibaca lagi saat aplikasi menyala, supaya aplikasi
/// tahu ia dijalankan oleh Windows dan bukan oleh pengguna.
pub const ARGUMEN_MULAI_OTOMATIS: &str = "--mulai-otomatis";

/// Plugin untuk dipasang di `tauri::Builder`. Hanya desktop: Android dan iOS tidak punya
/// entri start seperti ini.
pub fn plugin() -> TauriPlugin<tauri::Wry> {
    tauri_plugin_autostart::Builder::new()
        .app_name(NAMA_ENTRI_START)
        .args([ARGUMEN_MULAI_OTOMATIS])
        .build()
}

/// Apakah proses ini dijalankan oleh entri start?
pub fn diminta() -> bool {
    std::env::args().any(|argumen| argumen == ARGUMEN_MULAI_OTOMATIS)
}

/// Rupa jendela saat aplikasi baru dinyalakan oleh Windows.
///
/// Tujuan utamanya satu: aplikasi tidak boleh menutupi layar tepat setelah pengguna login,
/// jadi jendela langsung dikecilkan ke Mode Widget. Itu berlaku juga ketika PIN terpasang:
/// layar kunci ikut ditampilkan di dalam bingkai widget (lihat frontend), karena jendela
/// penuh 1120x760 justru menutupi seluruh layar tepat pada saat pengguna belum apa-apa.
pub fn siapkan_jendela(app: &AppHandle) -> Hasil<()> {
    let jendela = mode_jendela::jendela_utama(app)?;
    // Disembunyikan dulu supaya pengguna tidak melihat jendela penuh berkedip sebelum
    // ukurannya berubah.
    jendela.hide().map_err(mode_jendela::galat_jendela)?;

    let state = app.state::<StateAplikasi>();
    if state.sedang_terkunci() {
        mode_jendela::masuk_bawaan(app)?;
    } else {
        mode_jendela::masuk(app, &state)?;
    }

    jendela.show().map_err(mode_jendela::galat_jendela)?;
    jendela.unminimize().map_err(mode_jendela::galat_jendela)?;
    jendela.set_focus().map_err(mode_jendela::galat_jendela)?;
    Ok(())
}
