//! Perubahan bentuk jendela utama antara mode penuh dan mode widget.
//! Geometri kedua mode disimpan terpisah di tabel pengaturan (AGENTS.md Bagian 5).

use tauri::window::{Effect, EffectsBuilder};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize};

use crate::core::error::GalatAplikasi;
use crate::core::state::StateAplikasi;
use crate::features::settings::model::{Geometri, PatchPengaturan};
use crate::features::settings::service as settings;

pub const LABEL_UTAMA: &str = "utama";

/// Batas minimum widget: kolom cari dan tiga baris prompt tetap terlihat (PRD G1).
pub const UKURAN_WIDGET_MIN: (u32, u32) = (260, 280);
pub const UKURAN_WIDGET_BAKU: (u32, u32) = (288, 360);
/// Ambang atas widget. Harus sama dengan angka yang dipakai `deteksiModeJendela` di frontend,
/// karena mode dibaca ulang dari ukuran jendela: di atas ambang ini jendela dianggap penuh.
pub const UKURAN_WIDGET_MAKS: (u32, u32) = (420, 760);

/// Geometri tersimpan hanya dipakai kalau benar-benar masih berada di dalam pita widget.
/// Nilai di luar pita berasal dari sesi lama atau dari jendela penuh yang tersimpan sebagai
/// mode, dan kalau dipakai akan menghasilkan jendela pipih yang dirender sebagai mode penuh.
fn geometri_widget(diminta: Option<Geometri>) -> Geometri {
    let baku = Geometri {
        x: 80,
        y: 80,
        lebar: UKURAN_WIDGET_BAKU.0,
        tinggi: UKURAN_WIDGET_BAKU.1,
        maksimum: false,
    };
    match diminta {
        Some(g)
            if (UKURAN_WIDGET_MIN.0..=UKURAN_WIDGET_MAKS.0).contains(&g.lebar)
                && (UKURAN_WIDGET_MIN.1..=UKURAN_WIDGET_MAKS.1).contains(&g.tinggi) =>
        {
            g
        }
        _ => baku,
    }
}

#[tauri::command]
pub fn masuk_mode_widget(
    app: AppHandle,
    state: tauri::State<'_, StateAplikasi>,
) -> Result<Geometri, GalatAplikasi> {
    let jendela = jendela_utama(&app)?;
    let penuh = geometri_sekarang(&jendela)?;
    simpan_geometri(&state, KunciGeometri::Penuh, &penuh)?;

    let penyimpanan = state.dengan_koneksi(settings::ambil)?;
    let desired = geometri_widget(penyimpanan.widget_geometri_mode);

    let aman = pastikan_di_dalam_layar(&jendela, desired)?;
    jendela.set_decorations(false).map_err(galat_jendela)?;
    jendela.set_resizable(true).map_err(galat_jendela)?;
    jendela
        .set_always_on_top(penyimpanan.widget_selalu_di_atas)
        .map_err(galat_jendela)?;
    jendela
        .set_size(LogicalSize::new(
            aman.lebar.max(UKURAN_WIDGET_MIN.0) as f64,
            aman.tinggi.max(UKURAN_WIDGET_MIN.1) as f64,
        ))
        .map_err(galat_jendela)?;
    jendela
        .set_position(LogicalPosition::new(aman.x, aman.y))
        .map_err(galat_jendela)?;
    jendela.set_focus().map_err(galat_jendela)?;

    simpan_geometri(&state, KunciGeometri::Mode, &aman)?;
    Ok(aman)
}

#[tauri::command]
pub fn keluar_mode_widget(
    app: AppHandle,
    state: tauri::State<'_, StateAplikasi>,
) -> Result<Geometri, GalatAplikasi> {
    let jendela = jendela_utama(&app)?;
    let mode = geometri_sekarang(&jendela)?;
    simpan_geometri(&state, KunciGeometri::Mode, &mode)?;

    let penyimpanan = state.dengan_koneksi(settings::ambil)?;
    let penuh = penyimpanan.widget_geometri_penuh.unwrap_or(Geometri {
        x: 0,
        y: 0,
        lebar: 1120,
        tinggi: 760,
        maksimum: true,
    });

    jendela.set_decorations(true).map_err(galat_jendela)?;
    jendela.set_always_on_top(false).map_err(galat_jendela)?;
    let aman = pastikan_di_dalam_layar(&jendela, penuh)?;
    jendela
        .set_size(LogicalSize::new(aman.lebar as f64, aman.tinggi as f64))
        .map_err(galat_jendela)?;
    jendela
        .set_position(LogicalPosition::new(aman.x, aman.y))
        .map_err(galat_jendela)?;
    if aman.maksimum {
        jendela.maximize().map_err(galat_jendela)?;
    }
    jendela.set_focus().map_err(galat_jendela)?;
    Ok(aman)
}

/// Simpan geometri yang sedang tampak di layar. Dipakai frontend setelah resize atau drag
/// supaya posisi dan ukuran diingat setelah aplikasi ditutup (PRD G1).
#[tauri::command]
pub fn simpan_geometri_sekarang(
    app: AppHandle,
    state: tauri::State<'_, StateAplikasi>,
    mode_widget: bool,
) -> Result<Geometri, GalatAplikasi> {
    let jendela = jendela_utama(&app)?;
    let geometri = geometri_sekarang(&jendela)?;
    simpan_geometri(
        &state,
        if mode_widget {
            KunciGeometri::Mode
        } else {
            KunciGeometri::Penuh
        },
        &geometri,
    )?;
    Ok(geometri)
}

#[derive(Debug, Clone, Copy)]
pub enum KunciGeometri {
    Penuh,
    Mode,
}

fn simpan_geometri(
    state: &tauri::State<'_, StateAplikasi>,
    kunci: KunciGeometri,
    geometri: &Geometri,
) -> Result<(), GalatAplikasi> {
    let patch = match kunci {
        KunciGeometri::Penuh => PatchPengaturan {
            widget_geometri_penuh: Some(*geometri),
            ..Default::default()
        },
        KunciGeometri::Mode => PatchPengaturan {
            widget_geometri_mode: Some(*geometri),
            ..Default::default()
        },
    };
    state.dengan_koneksi(|koneksi| settings::simpan(koneksi, &patch).map(|_| ()))
}

pub fn jendela_utama(app: &AppHandle) -> Result<tauri::WebviewWindow, GalatAplikasi> {
    app.get_webview_window(LABEL_UTAMA).ok_or_else(|| {
        GalatAplikasi::baru(
            "jendela_tidak_ada",
            "Jendela utama tidak ditemukan. Buka ulang aplikasinya.",
        )
    })
}

/// Geometri jendela dalam satuan logis. Ukuran yang disimpan adalah ukuran **dalam**, karena
/// `set_size` juga mengatur ukuran dalam. Membaca `outer_size` membuat jendela membesar setiap
/// sesi di Windows 11: rect luar mencakup bingkai resize tak terlihat dan bayangan DWM, jadi
/// simpan-pulih menambah beberapa piksel tiap kali.
pub fn geometri_sekarang(jendela: &tauri::WebviewWindow) -> Result<Geometri, GalatAplikasi> {
    let posisi = jendela.outer_position().map_err(galat_jendela)?;
    let ukuran = jendela.inner_size().map_err(galat_jendela)?;
    let skala = jendela.scale_factor().unwrap_or(1.0);
    let ke_logis = |fisik: u32| (fisik as f64 / skala).round() as i32;

    Ok(Geometri {
        x: (posisi.x as f64 / skala).round() as i32,
        y: (posisi.y as f64 / skala).round() as i32,
        lebar: ke_logis(ukuran.width).max(1) as u32,
        tinggi: ke_logis(ukuran.height).max(1) as u32,
        maksimum: jendela.is_maximized().unwrap_or(false),
    })
}

/// Bila monitor berubah atau dicabut, kembalikan jendela ke area yang terlihat (PRD G1 alur gagal).
pub fn pastikan_di_dalam_layar(
    jendela: &tauri::WebviewWindow,
    diminta: Geometri,
) -> Result<Geometri, GalatAplikasi> {
    let monitor = jendela
        .primary_monitor()
        .map_err(galat_jendela)?
        .or(jendela.current_monitor().map_err(galat_jendela)?);

    let Some(monitor) = monitor else {
        return Ok(diminta);
    };
    let area = monitor.work_area();
    let kerja: PhysicalPosition<i32> = area.position;
    let ukuran_kerja: PhysicalSize<u32> = area.size;
    let skala = jendela.scale_factor().unwrap_or(1.0);
    let batas_lebar = (ukuran_kerja.width as f64 / skala).round() as i32;
    let batas_tinggi = (ukuran_kerja.height as f64 / skala).round() as i32;
    let asal_x = (kerja.x as f64 / skala).round() as i32;
    let asal_y = (kerja.y as f64 / skala).round() as i32;

    let lebar = diminta.lebar.max(UKURAN_WIDGET_MIN.0);
    let tinggi = diminta.tinggi.max(UKURAN_WIDGET_MIN.1);

    Ok(Geometri {
        x: diminta
            .x
            .clamp(asal_x, (asal_x + batas_lebar - lebar as i32).max(asal_x)),
        y: diminta
            .y
            .clamp(asal_y, (asal_y + batas_tinggi - tinggi as i32).max(asal_y)),
        lebar,
        tinggi,
        maksimum: diminta.maksimum,
    })
}

fn galat_jendela(sebab: tauri::Error) -> GalatAplikasi {
    GalatAplikasi::baru(
        "jendela",
        format!("Pengaturan jendela tidak dapat diterapkan: {sebab}"),
    )
}

/// Terapkan transparansi Mode Widget memakai efek jendela sistem Acrylic (PRD G2).
/// Nilai 100 persen berarti jendela opak penuh tanpa efek, supaya biaya performa Acrylic
/// hanya dibayar ketika pengguna benar-benar memakainya. Di bawah 100 persen Acrylic
/// aktif di belakang lapisan permukaan yang digambar frontend, dan teks tetap opaque.
#[tauri::command]
pub fn terapkan_transparansi(app: AppHandle, persen: u8) -> Result<(), GalatAplikasi> {
    let jendela = jendela_utama(&app)?;
    persen_valid(persen)?;

    if persen >= 100 {
        jendela.set_effects(None).map_err(galat_jendela)?;
    } else {
        jendela
            .set_effects(Some(
                EffectsBuilder::new().effects([Effect::Acrylic]).build(),
            ))
            .map_err(galat_jendela)?;
    }

    // Atribut DOM untuk gaya permukaan widget ditulis frontend dari store pengaturan, jadi
    // backend cukup memasang efek jendela. Dua penulis untuk satu atribut akan saling merebut.
    Ok(())
}

/// Sembunyikan jendela ketika Mode Widget sedang aktif (PRD G3). Membuka kembali lewat
/// pintasan global atau ikon tray, sesuai alur gagal pada dokumen yang sama.
#[tauri::command]
pub fn sembunyikan_widget(app: AppHandle) -> Result<(), GalatAplikasi> {
    let jendela = jendela_utama(&app)?;
    jendela.hide().map_err(galat_jendela)?;
    // Peristiwa fokus jendela tidak dijamin muncul saat jendela disembunyikan, dan `visibilityState`
    // WebView2 tetap "visible" (terukur pada build rilis), jadi penguncian otomatis dimulai dari sini.
    crate::features::kunci::command::jadwalkan_kunci_otomatis(&app);
    Ok(())
}

fn persen_valid(persen: u8) -> Result<(), GalatAplikasi> {
    let min = settings::TRANSPARANSI_MIN;
    let maks = settings::TRANSPARANSI_MAKS;
    if (min..=maks).contains(&persen) {
        Ok(())
    } else {
        Err(GalatAplikasi::validasi(format!(
            "Transparansi widget hanya boleh {min} sampai {maks} persen agar teks tetap terbaca."
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        geometri_widget, persen_valid, Geometri, UKURAN_WIDGET_BAKU, UKURAN_WIDGET_MAKS,
        UKURAN_WIDGET_MIN,
    };

    #[test]
    fn rentang_transparansi_dijaga_di_backend() {
        assert!(persen_valid(80).is_ok());
        assert!(persen_valid(100).is_ok());
        assert_eq!(persen_valid(60).unwrap_err().kode, "validasi");
        assert_eq!(persen_valid(200).unwrap_err().kode, "validasi");
    }

    /// Ukuran bawaan harus berada di atas minimum dan tetap di bawah ambang frontend
    /// (`deteksiModeJendela` memakai angka yang sama dengan `UKURAN_WIDGET_MAKS`), supaya
    /// jendela yang baru saja menyusut masih terbaca sebagai widget.
    #[test]
    fn geometri_widget_muat_di_atas_minimum_dan_di_bawah_ambang() {
        assert!(UKURAN_WIDGET_BAKU.0 >= UKURAN_WIDGET_MIN.0);
        assert!(UKURAN_WIDGET_BAKU.1 >= UKURAN_WIDGET_MIN.1);
        assert!(UKURAN_WIDGET_BAKU.0 <= UKURAN_WIDGET_MAKS.0);
        assert!(UKURAN_WIDGET_BAKU.1 <= UKURAN_WIDGET_MAKS.1);
    }

    fn geometri(lebar: u32, tinggi: u32) -> Geometri {
        Geometri {
            x: 10,
            y: 20,
            lebar,
            tinggi,
            maksimum: false,
        }
    }

    #[test]
    fn geometri_tersimpan_dilanjutkan_selama_masih_di_pita_widget() {
        let tersimpan = geometri(300, 400);
        assert_eq!(geometri_widget(Some(tersimpan)), tersimpan);
    }

    #[test]
    fn geometri_tersimpan_dari_luar_pita_diganti_bawaan() {
        // 866 x 280 adalah keadaan nyata: mode penuh lama tersimpan sebagai geometri mode.
        assert_eq!(
            geometri_widget(Some(geometri(866, 280))).lebar,
            UKURAN_WIDGET_BAKU.0
        );
        assert_eq!(
            geometri_widget(Some(geometri(288, 360))).tinggi,
            UKURAN_WIDGET_BAKU.1
        );
        assert_eq!(geometri_widget(None).lebar, UKURAN_WIDGET_BAKU.0);
    }
}
