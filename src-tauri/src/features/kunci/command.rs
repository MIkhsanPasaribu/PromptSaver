//! Command kunci aplikasi. Semua command di fitur ini memakai jalur tanpa gerbang
//! (`dengan_koneksi_tanpa_gerbang`) karena justru dibutuhkan saat data lain ditolak.

use tauri::{AppHandle, Emitter, Manager, State};

// Hanya jalur desktop yang menyentuh jendela dan menunda penguncian, jadi impor ini tidak terpakai
// pada build Android dan akan gagal di `cargo clippy -- -D warnings` kalau dibiarkan.
#[cfg(desktop)]
use std::time::Duration;

use crate::core::error::{GalatAplikasi, Hasil};
use crate::core::state::StateAplikasi;
use crate::features::kunci::service;
use crate::features::kunci::service::StatusKunci;
use crate::features::settings::service as settings;

/// Sidik jari hanya ditawarkan bila perangkat benar-benar punya sensor yang terdaftar. Diukur lewat
/// API plugin di sisi Rust, bukan lewat frontend, supaya tombolnya tidak muncul kalau gagal dipakai.
#[cfg(target_os = "android")]
fn biometrik_siap(app: &AppHandle) -> bool {
    use tauri_plugin_biometric::BiometricExt;
    app.biometric()
        .status()
        .map(|status| status.is_available)
        .unwrap_or(false)
}

#[cfg(not(target_os = "android"))]
fn biometrik_siap(_app: &AppHandle) -> bool {
    false
}

/// Satu guard koneksi untuk status dan preferensi tampil: layar kunci harus bisa membaca keduanya
/// padahal command pengaturan berada di balik gerbang.
fn baca_status(app: &AppHandle, state: &StateAplikasi) -> Hasil<StatusKunci> {
    let biometrik = biometrik_siap(app);
    state.dengan_koneksi_tanpa_gerbang(|koneksi| {
        let tampilan = settings::ambil(koneksi)?;
        service::status(koneksi, state.sedang_terkunci(), biometrik, &tampilan)
    })
}

/// Keadaan kunci untuk layar kunci dan kartu pengaturan.
#[tauri::command]
pub fn status_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
) -> Result<StatusKunci, GalatAplikasi> {
    baca_status(&app, &state)
}

/// Kabari frontend setiap kali gerbang berubah. Kunci otomatis lahir di thread Rust yang tidak punya
/// pemanggil, jadi tanpa peristiwa ini layar tetap menampilkan koleksi padahal command data sudah
/// mulai ditolak.
fn umumkan(app: &AppHandle, status: &StatusKunci) {
    let _ = app.emit("kunci-berubah", *status);
}

/// Baca status terbaru lalu kabari frontend. Dipakai setiap jalur yang mengubah gerbang.
fn umumkan_status(app: &AppHandle, state: &StateAplikasi) -> Hasil<StatusKunci> {
    let status = baca_status(app, state)?;
    umumkan(app, &status);
    Ok(status)
}

/// Masukkan PIN. PIN salah dikembalikan sebagai status biasa (masih terkunci) supaya layar kunci
/// bisa menampilkan pesan tanpa galat sistem; hanya masa tunggu yang menjadi galat.
#[tauri::command]
pub fn buka_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
    pin: String,
) -> Result<StatusKunci, GalatAplikasi> {
    if state.dengan_koneksi_tanpa_gerbang(service::sisa_blokir)? > 0 {
        return Err(GalatAplikasi::baru(
            "kunci_terblokir",
            "Terlalu banyak percobaan gagal. Tunggu sebentar lalu coba lagi.",
        ));
    }

    let cocok = state.dengan_koneksi_tanpa_gerbang(|koneksi| service::cocok(koneksi, &pin))?;
    if cocok {
        state.dengan_koneksi_tanpa_gerbang(service::bersihkan_gagal)?;
        state.set_terkunci(false);
        // Aplikasi yang menyala dalam keadaan terkunci melewatkan pencetan cadangan saat start;
        // kerjakan sekarang, setelah gerbang terbuka.
        crate::features::cadangan::command::jadwalkan_cadangan_saat_start(&app);
    } else {
        state.dengan_koneksi_tanpa_gerbang(service::catat_gagal)?;
        state.set_terkunci(true);
    }
    terapkan_ke_jendela(&app, state.sedang_terkunci());
    umumkan_status(&app, &state)
}

/// Pasang PIN dari layar pengaturan. Command ini berada di belakang gerbang: memasang kunci saat
/// aplikasi terkunci tidak mungkin terjadi, dan menolak jalur itu menutup celah tebak PIN lewat IPC.
#[tauri::command]
pub fn setel_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
    pin: String,
    jeda_detik: u32,
) -> Result<StatusKunci, GalatAplikasi> {
    state.dengan_koneksi(|koneksi| service::setel(koneksi, &pin, jeda_detik))?;
    state.set_terkunci(false);
    terapkan_ke_jendela(&app, false);
    umumkan_status(&app, &state)
}

#[tauri::command]
pub fn ganti_pin_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
    pin_lama: String,
    pin_baru: String,
) -> Result<StatusKunci, GalatAplikasi> {
    state.dengan_koneksi(|koneksi| service::ganti_pin(koneksi, &pin_lama, &pin_baru))?;
    baca_status(&app, &state)
}

#[tauri::command]
pub fn ubah_jeda_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
    jeda_detik: u32,
) -> Result<StatusKunci, GalatAplikasi> {
    state.dengan_koneksi(|koneksi| service::ubah_jeda(koneksi, jeda_detik))?;
    baca_status(&app, &state)
}

/// Lepas PIN. Setelah berhasil, gerbang dibuka sampai pengguna memasangnya lagi.
#[tauri::command]
pub fn hapus_kunci(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
    pin: String,
) -> Result<StatusKunci, GalatAplikasi> {
    state.dengan_koneksi(|koneksi| service::hapus(koneksi, &pin))?;
    state.set_terkunci(false);
    terapkan_ke_jendela(&app, false);
    umumkan_status(&app, &state)
}

/// Kunci sekarang juga. Dipakai tombol "Kunci sekarang" dan oleh frontend mobile ketika aplikasi
/// pindah ke latar: di Android tidak ada peristiwa fokus yang dapat diandalkan, jadi perpindahan
/// ke latar adalah sinyal kuncinya.
#[tauri::command]
pub fn kunci_sekarang(
    app: AppHandle,
    state: State<'_, StateAplikasi>,
) -> Result<(), GalatAplikasi> {
    if !state.dengan_koneksi_tanpa_gerbang(service::aktif)? {
        return Ok(());
    }
    state.set_terkunci(true);
    terapkan_ke_jendela(&app, true);
    umumkan_status(&app, &state).map(|_| ())
}

/// Buka kunci dengan sidik jari (Android). Verifikasinya berjalan di Rust, bukan di JS, supaya
/// frontend tidak bisa mengaku sudah terautentikasi. Kegagalan biometrik sengaja TIDAK menambah
/// penghitung salah PIN: membatalkan dialog sistem adalah tindakan biasa, bukan percobaan paksa.
#[tauri::command]
pub async fn buka_kunci_biometrik(app: AppHandle) -> Result<StatusKunci, GalatAplikasi> {
    sideik_jari_terverifikasi(&app).await?;
    let hasil = {
        let state = app.state::<StateAplikasi>();
        state.set_terkunci(false);
        umumkan_status(&app, &state)
    };
    terapkan_ke_jendela(&app, false);
    hasil
}

/// `authenticate` menampilkan dialog sistem dan menunggu pengguna, jadi tidak boleh berjalan di
/// thread yang sama dengan antarmuka.
#[cfg(target_os = "android")]
async fn sideik_jari_terverifikasi(app: &AppHandle) -> Hasil<()> {
    use tauri_plugin_biometric::{AuthOptions, BiometricExt};

    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        handle.biometric().authenticate(
            "Membuka PromptSaver".to_string(),
            AuthOptions {
                allow_device_credential: true,
                title: Some("PromptSaver".to_string()),
                ..Default::default()
            },
        )
    })
    .await
    .map_err(|sebab| GalatAplikasi::baru("sistem", format!("Autentikasi tidak selesai: {sebab}")))?
    .map_err(|_| {
        GalatAplikasi::baru(
            "biometrik_gagal",
            "Sidik jari tidak dikenali atau dibatalkan.",
        )
    })
}

#[cfg(not(target_os = "android"))]
async fn sideik_jari_terverifikasi(_app: &AppHandle) -> Hasil<()> {
    Err(GalatAplikasi::baru(
        "biometrik_gagal",
        "Sidik jari hanya tersedia di Android.",
    ))
}

/// Jadwalkan penguncian otomatis untuk desktop. Setelah jendela kehilangan fokus dan jeda pilihan
/// pengguna lewat, kunci dipakai lagi. Bila pengguna kembali sebelum jeda habis, tidak ada yang
/// terjadi dan tidak ada keadaan yang perlu dibatalkan.
#[cfg(desktop)]
pub fn jadwalkan_kunci_otomatis(app: &AppHandle) {
    // PIN belum dipasang, atau aplikasi sudah terkunci (gerbang menolak): tidak ada yang
    // perlu dijadwalkan.
    let baca = {
        let Some(state) = app.try_state::<StateAplikasi>() else {
            return;
        };
        state
            .dengan_koneksi(|koneksi| Ok((service::jeda_detik(koneksi)?, service::aktif(koneksi)?)))
    };
    let Ok((jeda, ada_pin)) = baca else {
        return;
    };
    if !ada_pin {
        return;
    }

    let handle = app.clone();
    let hasil = std::thread::Builder::new()
        .name("kunci-otomatis".into())
        .spawn(move || {
            std::thread::sleep(Duration::from_secs(u64::from(jeda)));
            // Baca ulang: PIN bisa dilepas atau jeda berubah selama tidur, dan guard koneksi
            // harus sudah lepas sebelum jendela disentuh.
            let masih_ada_pin = {
                let Some(state) = handle.try_state::<StateAplikasi>() else {
                    return;
                };
                state.dengan_koneksi(service::aktif).unwrap_or(false)
            };
            if !masih_ada_pin {
                return;
            }
            let Ok(jendela) = crate::features::widget::mode_jendela::jendela_utama(&handle) else {
                return;
            };
            // Pengguna sudah kembali: jendela fokus lagi, jadi tidak ada yang perlu dikunci.
            if jendela.is_focused().unwrap_or(false) {
                return;
            }
            let penutup = handle.clone();
            let _ = handle.run_on_main_thread(move || {
                if let Some(state) = penutup.try_state::<StateAplikasi>() {
                    state.set_terkunci(true);
                    terapkan_ke_jendela(&penutup, true);
                    // Tidak ada pemanggil di jalur ini, jadi frontend hanya bisa tahu lewat peristiwa.
                    let _ = umumkan_status(&penutup, &state);
                }
            });
        });
    let _ = hasil;
}

#[cfg(mobile)]
pub fn jadwalkan_kunci_otomatis(_app: &AppHandle) {}

/// Lapisan jendela dari keadaan kunci. Saat terkunci, isi jendela tidak boleh terbaca lewat
/// pratinjau taskbar maupun tangkapan layar, jadi kontennya dilindungi dan jendela diminimalkan.
/// Pengguna tetap bisa membuka layar PIN dari taskbar.
#[cfg(desktop)]
fn terapkan_ke_jendela(app: &AppHandle, terkunci: bool) {
    let Ok(jendela) = crate::features::widget::mode_jendela::jendela_utama(app) else {
        return;
    };
    let _ = jendela.set_content_protected(terkunci);
    if terkunci {
        let _ = jendela.minimize();
    } else {
        let _ = jendela.unminimize();
        let _ = jendela.set_focus();
    }
}

/// Di Android layar kunci tampil di depan, dan sistem sudah membuang pratinjau tugas saat
/// aplikasi masuk latar, jadi tidak ada tindakan jendela yang perlu dilakukan.
#[cfg(mobile)]
fn terapkan_ke_jendela(_app: &AppHandle, _terkunci: bool) {}
