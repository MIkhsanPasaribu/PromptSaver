//! Bootstrap aplikasi: plugin, state, migrasi, dan registrasi command.

mod core;
mod features;

use tauri::Manager;

use crate::core::{database, state::StateAplikasi};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[cfg_attr(mobile, allow(unused_variables))]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init());

    // F4: sidik jari hanya ada di mobile. Crate-nya ikut cfg(mobile) di Cargo.toml karena
    // seluruh isinya `#![cfg(mobile)]`, jadi jalur ini memang tidak ada di desktop.
    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_biometric::init());

    #[cfg(desktop)]
    let builder = {
        use features::widget::pintasan;
        use tauri::Emitter;

        builder
            .plugin(tauri_plugin_single_instance::init(
                |app, argumen, _direktori| {
                    // Aplikasi sudah berjalan: berkas yang dibuka pengguna diteruskan ke layar impor.
                    if let Some(jalur) = cari_berkas_promptsaver(&argumen) {
                        if let Some(state) = app.try_state::<StateAplikasi>() {
                            let _ = state.catat_berkas(&jalur);
                        }
                        let _ = app.emit("berkas-impor", jalur);
                    }
                    if let Ok(jendela) = features::widget::mode_jendela::jendela_utama(app) {
                        let _ = jendela.show();
                        let _ = jendela.unminimize();
                        let _ = jendela.set_focus();
                    }
                },
            ))
            .plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(pintasan::penanganan_pintasan)
                    .build(),
            )
    };

    let hasil = builder
        .setup(|app| {
            let dir_data = app.path().app_data_dir()?;
            let koneksi = database::buka_koneksi(&database::path_database(&dir_data))?;
            // F4: bila PIN terpasang, aplikasi menyala dalam keadaan terkunci. Data tidak pernah
            // sempat dibaca sebelum PIN masuk.
            let terkunci_awal = features::kunci::service::aktif(&koneksi)?;
            app.manage(StateAplikasi::baru(koneksi, terkunci_awal));

            // D3: cadangan otomatis mingguan dikerjakan di thread kerja, jadi cold start tidak
            // menunggu penulisan berkas. Saat terkunci command data ditolak, jadi pencetannya
            // ditunda ke pembukaan kunci (lihat `kunci::command::buka_kunci`).
            if !terkunci_awal {
                features::cadangan::command::jadwalkan_cadangan_saat_start(app.handle());
            }

            #[cfg(desktop)]
            {
                // Aplikasi baru dibuka karena pengguna klik ganda berkas .promptsaver.
                if let Some(jalur) = cari_berkas_promptsaver(&std::env::args().collect::<Vec<_>>())
                {
                    if let Some(state) = app.try_state::<StateAplikasi>() {
                        let _ = state.catat_berkas(&jalur);
                    }
                }
                features::widget::tray::buat(app.handle())?;
                // Pintasan global hanya didaftarkan bila pengguna sudah mengaktifkannya.
                if let Err(sebab) = features::widget::pintasan::daftarkan(app.handle()) {
                    eprintln!("Pintasan global tidak terdaftar: {}", sebab.kode);
                }
            }

            Ok(())
        })
        .on_window_event(|jendela, event| {
            #[cfg(desktop)]
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    if features::widget::tray::tutup_ke_tray(jendela.app_handle()) {
                        api.prevent_close();
                    }
                }
                // F4: kunci otomatis bekerja dari satu arah, yaitu kehilangan fokus jendela.
                tauri::WindowEvent::Focused(false) => {
                    features::kunci::command::jadwalkan_kunci_otomatis(jendela.app_handle());
                }
                _ => {}
            }
            #[cfg(mobile)]
            let _ = (jendela, event);
        })
        .invoke_handler(tauri::generate_handler![
            // Prompt
            features::prompts::command::daftar_prompt,
            features::prompts::command::ambil_prompt,
            features::prompts::command::buat_prompt,
            features::prompts::command::ubah_prompt,
            features::prompts::command::duplikat_prompt,
            features::prompts::command::daftar_riwayat_prompt,
            features::prompts::command::pulihkan_versi_prompt,
            features::prompts::command::ganti_favorit_prompt,
            features::prompts::command::ganti_disemat_prompt,
            features::prompts::command::pindah_folder_prompt,
            features::prompts::command::tandai_prompt_dipakai,
            features::prompts::command::simpan_draf_prompt,
            features::prompts::command::ambil_draf_prompt,
            features::prompts::command::buang_draf_prompt,
            features::prompts::command::statistik_koleksi,
            // Sampah
            features::trash::command::hapus_prompt,
            features::trash::command::daftar_sampah,
            features::trash::command::pulihkan_prompt,
            features::trash::command::hapus_permanen_prompt,
            features::trash::command::kosongkan_sampah,
            // Folder dan tag
            features::folders::command::daftar_folder,
            features::folders::command::buat_folder,
            features::folders::command::ubah_nama_folder,
            features::folders::command::hapus_folder,
            features::tags::command::daftar_tag,
            features::tags::command::buat_tag,
            features::tags::command::ubah_tag,
            features::tags::command::hapus_tag,
            features::tags::command::saran_tag,
            // Pencarian
            features::search::command::cari_prompt,
            // Variabel template
            features::variabel::command::susun_variabel,
            features::variabel::command::ambil_nilai_variabel_terakhir,
            features::variabel::command::simpan_nilai_variabel_terakhir,
            // Pengaturan
            features::settings::command::ambil_pengaturan,
            features::settings::command::simpan_pengaturan,
            features::settings::command::atur_ulang_pengaturan,
            features::settings::command::hapus_semua_data,
            // Ekspor dan impor
            features::transfer::command::ekspor_koleksi,
            features::transfer::command::pratinjau_impor,
            features::transfer::command::impor_koleksi,
            features::transfer::command::nama_berkas_baku,
            features::transfer::command::ekspor_ke_folder,
            features::transfer::command::daftar_berkas_ekspor,
            // Cadangan otomatis lokal
            features::cadangan::command::daftar_cadangan,
            features::cadangan::command::cadangkan_sekarang,
            features::cadangan::command::pulihkan_cadangan,
            // Kunci aplikasi (F4)
            features::kunci::command::status_kunci,
            features::kunci::command::buka_kunci,
            features::kunci::command::setel_kunci,
            features::kunci::command::ganti_pin_kunci,
            features::kunci::command::ubah_jeda_kunci,
            features::kunci::command::hapus_kunci,
            features::kunci::command::kunci_sekarang,
            features::kunci::command::buka_kunci_biometrik,
            // Mode Widget (desktop)
            #[cfg(desktop)]
            features::widget::mode_jendela::masuk_mode_widget,
            #[cfg(desktop)]
            features::widget::mode_jendela::keluar_mode_widget,
            #[cfg(desktop)]
            features::widget::mode_jendela::simpan_geometri_sekarang,
            #[cfg(desktop)]
            features::widget::mode_jendela::terapkan_transparansi,
            #[cfg(desktop)]
            features::widget::mode_jendela::sembunyikan_widget,
            features::transfer::command::ambil_berkas_terbuka,
            #[cfg(desktop)]
            features::widget::pintasan::terapkan_pintasan_global,
        ])
        .run(tauri::generate_context!());

    match hasil {
        Ok(()) => {}
        Err(sebab) => {
            eprintln!("PromptSaver gagal dimulai: {sebab}");
            std::process::exit(1);
        }
    }
}

/// Ambil argumen pertama yang berupa berkas berekstensi promptsaver (PRD D2,
/// aplikasi terdaftar sebagai pembuka berkas ini). Argumen lain diabaikan.
#[cfg_attr(mobile, allow(dead_code))]
fn cari_berkas_promptsaver(argumen: &[String]) -> Option<String> {
    argumen
        .iter()
        .find(|a| a.ends_with(".promptsaver") && std::path::Path::new(a).is_file())
        .cloned()
}
