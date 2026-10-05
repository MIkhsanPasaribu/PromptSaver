//! Command ekspor dan impor. Path dipilih pengguna lewat dialog bawaan OS di frontend desktop,
//! sedangkan mobile membaca isinya lewat pemilih berkas WebView lalu mengirim teksnya ke command
//! `*_teks` di bawah. Aplikasi tidak pernah menyentuh jaringan (PRD D1).

use tauri::{AppHandle, State};

use crate::core::error::GalatAplikasi;
use crate::core::paths::{dir_data, dir_tukar};
use crate::core::state::StateAplikasi;
use crate::core::task::dengan_koneksi_di_latar;
use crate::features::transfer::model::{
    CakupanEkspor, DaftarBerkasEkspor, PratinjauImpor, RingkasanEkspor, RingkasanImpor,
    StrategiKonflik,
};
use crate::features::transfer::service;

/// Empat command di bawah ini membaca atau menulis seluruh koleksi. Mereka `async` supaya
/// thread event loop tetap melayani jendela dan animasi sementara pekerjaan berjalan.
#[tauri::command]
pub async fn ekspor_koleksi(
    app: AppHandle,
    path: String,
    cakupan: CakupanEkspor,
    ids: Option<Vec<String>>,
) -> Result<RingkasanEkspor, GalatAplikasi> {
    let ids = ids.unwrap_or_default();
    dengan_koneksi_di_latar(app, move |koneksi| {
        service::ekspor(koneksi, &path, cakupan, &ids)
    })
    .await
}

#[tauri::command]
pub async fn pratinjau_impor(
    app: AppHandle,
    path: String,
) -> Result<PratinjauImpor, GalatAplikasi> {
    dengan_koneksi_di_latar(app, move |koneksi| service::pratinjau(koneksi, &path)).await
}

/// Pratinjau berkas yang isinya dibacakan pemilih berkas WebView (mobile).
#[tauri::command]
pub async fn pratinjau_impor_teks(
    app: AppHandle,
    teks: String,
) -> Result<PratinjauImpor, GalatAplikasi> {
    dengan_koneksi_di_latar(app, move |koneksi| service::pratinjau_teks(koneksi, &teks)).await
}

#[tauri::command]
pub async fn impor_koleksi(
    app: AppHandle,
    path: String,
    strategi: StrategiKonflik,
) -> Result<RingkasanImpor, GalatAplikasi> {
    dengan_koneksi_di_latar(app, move |koneksi| service::impor(koneksi, &path, strategi)).await
}

/// Impor berkas yang isinya dibacakan pemilih berkas WebView (mobile).
#[tauri::command]
pub async fn impor_koleksi_teks(
    app: AppHandle,
    teks: String,
    strategi: StrategiKonflik,
) -> Result<RingkasanImpor, GalatAplikasi> {
    dengan_koneksi_di_latar(app, move |koneksi| {
        service::impor_teks(koneksi, &teks, strategi)
    })
    .await
}

/// Ekspor ke folder tukar yang bisa dijangkau pengguna. `lokasi` pada hasil berisi path lengkap
/// berkas yang baru ditulis, supaya layar bisa memakainya untuk impor tanpa memilih ulang
/// (PRD D1).
#[tauri::command]
pub async fn ekspor_ke_folder(
    app: AppHandle,
    cakupan: CakupanEkspor,
    ids: Option<Vec<String>>,
) -> Result<RingkasanEkspor, GalatAplikasi> {
    let dir = dir_tukar(&app)?;
    let ids = ids.unwrap_or_default();
    dengan_koneksi_di_latar(app, move |koneksi| {
        service::ekspor_ke_folder(koneksi, &dir, cakupan, &ids)
    })
    .await
}

/// Berkas ekspor yang ada di folder tukar dan di transit "Bagikan", terbaru lebih dulu (PRD D2).
#[tauri::command]
pub fn daftar_berkas_ekspor(app: AppHandle) -> Result<DaftarBerkasEkspor, GalatAplikasi> {
    let (folder, berkas) = service::daftar_berkas_ekspor(&dir_tukar(&app)?, &dir_data(&app)?)?;
    Ok(DaftarBerkasEkspor { folder, berkas })
}

/// Nama berkas bawaan untuk dialog simpan, misalnya
/// `koleksi-promptsaver-2026-10-01.promptsaver`. Perhitungannya hidup di service.
#[tauri::command]
pub fn nama_berkas_baku() -> String {
    service::nama_berkas_baku()
}

/// Ambil berkas promptsaver yang membuat aplikasi dibuka, sekali saja (PRD D2).
#[tauri::command]
pub fn ambil_berkas_terbuka(
    state: State<'_, StateAplikasi>,
) -> Result<Option<String>, GalatAplikasi> {
    state.ambil_berkas()
}
