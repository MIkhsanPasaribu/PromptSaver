//! Lokasi berkas milik aplikasi. Semua fitur yang menulis ke disk mengambil jalur dari sini
//! supaya tidak ada dua versi cara membaca direktori data.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::core::error::{GalatAplikasi, Hasil};

/// Direktori data privat aplikasi: tempat database, folder tukar ekspor, dan cadangan berada.
pub fn dir_data(app: &AppHandle) -> Hasil<PathBuf> {
    app.path().app_data_dir().map_err(|sebab| {
        GalatAplikasi::baru(
            "sistem",
            format!("Lokasi berkas aplikasi tidak dapat dibaca: {sebab}"),
        )
    })
}

/// Direktori sementara khusus test untuk jalur yang menyentuh disk. Namanya mengandung pid
/// supaya dua proses test tidak saling menimpa.
#[cfg(test)]
pub fn dir_uji(nama: &str) -> PathBuf {
    let mut jalur = std::env::temp_dir();
    jalur.push(format!("promptsaver-uji-{}-{nama}", std::process::id()));
    let _ = std::fs::remove_dir_all(&jalur);
    jalur
}

/// Hapus isi sebuah folder tanpa menghapus foldernya. Dipakai jalur "hapus semua data" supaya
/// salinan plaintext koleksi tidak tertinggal di disk. Folder yang belum ada dihitung nol.
pub fn hapus_isi_folder(folder: &Path) -> Hasil<usize> {
    let bacaan = match std::fs::read_dir(folder) {
        Ok(bacaan) => bacaan,
        Err(sebab) if sebab.kind() == std::io::ErrorKind::NotFound => return Ok(0),
        Err(sebab) => return Err(sebab.into()),
    };
    let mut jumlah = 0;
    for item in bacaan {
        let jalur = item?.path();
        let hasil = if jalur.is_dir() {
            std::fs::remove_dir_all(&jalur)
        } else {
            std::fs::remove_file(&jalur)
        };
        if hasil.is_ok() {
            jumlah += 1;
        }
    }
    Ok(jumlah)
}

/// Berkas dengan satu ekstensi di dalam satu folder, terbaru lebih dulu, beserta waktu ubah
/// (epoch milidetik) dan ukurannya. Dipakai daftar cadangan dan daftar berkas ekspor: keduanya
/// pernah menyalin pola yang sama, dan salinan seperti itu bisa melenceng saat salah satu lupa
/// menyaring ekstensi atau lupa membalik urutan. Folder yang belum ada dihitung kosong.
pub fn kumpulkan_berkas(folder: &Path, ekstensi: &str) -> Hasil<Vec<(PathBuf, i64, u64)>> {
    let bacaan = match std::fs::read_dir(folder) {
        Ok(bacaan) => bacaan,
        Err(sebab) if sebab.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(sebab) => return Err(sebab.into()),
    };

    let mut kumpul: Vec<(PathBuf, i64, u64)> = Vec::new();
    for item in bacaan {
        let item = item?;
        let jalur = item.path();
        if jalur.extension().and_then(|e| e.to_str()) != Some(ekstensi) {
            continue;
        }
        let metadata = item.metadata()?;
        let diubah_pada = metadata
            .modified()
            .ok()
            .and_then(|waktu| waktu.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|selisih| selisih.as_millis() as i64)
            .unwrap_or_default();
        kumpul.push((jalur, diubah_pada, metadata.len()));
    }

    kumpul.sort_by_key(|(_, diubah_pada, _)| std::cmp::Reverse(*diubah_pada));
    Ok(kumpul)
}
