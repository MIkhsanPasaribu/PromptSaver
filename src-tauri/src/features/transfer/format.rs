//! Skema tunggal file ekspor `.promptsaver` (AGENTS.md Bagian 5).
//! Perubahan skema wajib menaikkan `VERSI_SKEMA_BERKAS`, menyertakan migrasi baca versi lama,
//! dan menambah fixture baru di `database/fixtures/`.

use sha2::{Digest, Sha256};

pub const NAMA_FORMAT: &str = "promptsaver";
/// Versi struktur berkas `.promptsaver`. Bukan versi skema database (`core::database`).
pub const VERSI_SKEMA_BERKAS: i64 = 1;
pub const EKSTENSI_BERKAS: &str = "promptsaver";

/// Batas keamanan sebelum file disentuh database (AGENTS.md Bagian 7).
pub const UKURAN_BERKAS_MAKS: usize = 50 * 1024 * 1024;
pub const JUMLAH_PROMPT_MAKS: usize = 50_000;
pub const JUMLAH_FOLDER_MAKS: usize = 5_000;
pub const JUMLAH_TAG_MAKS: usize = 5_000;
pub const PANJANG_ISI_MAKS: usize = 50_000;
pub const PANJANG_JUDUL_MAKS: usize = 300;
pub const PANJANG_NAMA_FOLDER_MAKS: usize = 60;
pub const PANJANG_NAMA_TAG_MAKS: usize = 40;

use crate::features::transfer::model::{EksporFolder, EksporTag, IsiEkspor};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BerkasEkspor {
    pub format: String,
    pub schema_version: i64,
    pub exported_at: i64,
    pub checksum: String,
    pub data: IsiEkspor,
}

impl BerkasEkspor {
    /// Susun berkas lengkap dengan checksum sha256 atas bagian `data`.
    pub fn baru(data: IsiEkspor, waktu: i64) -> crate::core::error::Hasil<Self> {
        Ok(Self {
            format: NAMA_FORMAT.to_string(),
            schema_version: VERSI_SKEMA_BERKAS,
            exported_at: waktu,
            checksum: hitung_checksum(&data)?,
            data,
        })
    }

    pub fn serialisasi(&self) -> crate::core::error::Hasil<String> {
        Ok(serde_json::to_string_pretty(self)?)
    }
}

/// Hash kanonik atas isi data. Urutan field ditentukan struct, bukan oleh input pengguna.
pub fn hitung_checksum(data: &IsiEkspor) -> crate::core::error::Hasil<String> {
    let teks = serde_json::to_string(data)?;
    let hasil = Sha256::digest(teks.as_bytes());
    Ok(hasil.iter().map(|b| format!("{b:02x}")).collect::<String>())
}

/// Validasi struktur dan batas sebelum menyentuh database. Impor bersifat atomik,
/// jadi semua pemeriksaan terjadi lebih dulu.
pub fn validasi(berkas: &BerkasEkspor) -> Result<(), crate::core::error::GalatAplikasi> {
    if berkas.format != NAMA_FORMAT {
        return Err(crate::core::error::GalatAplikasi::baru(
            "bukan_promptsaver",
            "Berkas ini bukan file ekspor PromptSaver.",
        ));
    }
    if berkas.schema_version > VERSI_SKEMA_BERKAS {
        return Err(crate::core::error::GalatAplikasi::baru(
            "versi_lebih_baru",
            "File ini dibuat oleh PromptSaver versi lebih baru. Perbarui aplikasi lalu coba lagi.",
        ));
    }
    if berkas.schema_version < 1 {
        return Err(crate::core::error::GalatAplikasi::baru(
            "versi_tidak_dikenal",
            "Versi skema file tidak dikenal.",
        ));
    }

    let dihitung = hitung_checksum(&berkas.data).map_err(|_| {
        crate::core::error::GalatAplikasi::baru("checksum", "Isi berkas tidak dapat diperiksa.")
    })?;
    if dihitung != berkas.checksum {
        return Err(crate::core::error::GalatAplikasi::baru(
            "checksum_beda",
            "Isi berkas tidak cocok dengan checksum-nya. File mungkin rusak atau diubah.",
        ));
    }

    if berkas.data.prompts.len() > JUMLAH_PROMPT_MAKS {
        return Err(crate::core::error::GalatAplikasi::baru(
            "terlalu_besar",
            format!("Jumlah prompt pada file melebihi batas {JUMLAH_PROMPT_MAKS}."),
        ));
    }
    if berkas.data.folders.len() > JUMLAH_FOLDER_MAKS {
        return Err(crate::core::error::GalatAplikasi::baru(
            "terlalu_besar",
            format!("Jumlah folder pada file melebihi batas {JUMLAH_FOLDER_MAKS}."),
        ));
    }
    if berkas.data.tags.len() > JUMLAH_TAG_MAKS {
        return Err(crate::core::error::GalatAplikasi::baru(
            "terlalu_besar",
            format!("Jumlah tag pada file melebihi batas {JUMLAH_TAG_MAKS}."),
        ));
    }

    for folder in &berkas.data.folders {
        periksa_teks(
            &folder.nama,
            PANJANG_NAMA_FOLDER_MAKS,
            "nama folder",
            &folder.id,
        )?;
        if folder.dibuat_pada <= 0 || folder.diubah_pada <= 0 {
            return Err(crate::core::error::GalatAplikasi::baru(
                "struktur_rusak",
                "Waktu folder pada file tidak valid.",
            ));
        }
    }
    for tag in &berkas.data.tags {
        periksa_teks(&tag.nama, PANJANG_NAMA_TAG_MAKS, "nama tag", &tag.id)?;
        if !crate::features::tags::model::WARNA_TAG_VALID.contains(&tag.warna.as_str()) {
            return Err(crate::core::error::GalatAplikasi::baru(
                "struktur_rusak",
                "Warna tag pada file tidak dikenali.",
            ));
        }
    }

    let id_folder: Vec<&str> = berkas.data.folders.iter().map(|f| f.id.as_str()).collect();
    let id_tag: Vec<&str> = berkas.data.tags.iter().map(|t| t.id.as_str()).collect();

    for prompt in &berkas.data.prompts {
        if prompt.id.trim().is_empty() {
            return Err(crate::core::error::GalatAplikasi::baru(
                "struktur_rusak",
                "Ada prompt tanpa identitas pada file.",
            ));
        }
        if prompt.isi.is_empty() || prompt.isi.trim().is_empty() {
            return Err(crate::core::error::GalatAplikasi::baru(
                "struktur_rusak",
                format!("Prompt {} isinya kosong.", ringkas_id(&prompt.id)),
            ));
        }
        if prompt.isi.chars().count() > PANJANG_ISI_MAKS {
            return Err(crate::core::error::GalatAplikasi::baru(
                "terlalu_besar",
                format!(
                    "Prompt {} melebihi batas {PANJANG_ISI_MAKS} karakter.",
                    ringkas_id(&prompt.id)
                ),
            ));
        }
        if prompt.judul.chars().count() > PANJANG_JUDUL_MAKS {
            return Err(crate::core::error::GalatAplikasi::baru(
                "terlalu_besar",
                format!("Judul prompt {} terlalu panjang.", ringkas_id(&prompt.id)),
            ));
        }
        if let Some(folder_id) = &prompt.folder_id {
            if !id_folder.contains(&folder_id.as_str()) {
                return Err(crate::core::error::GalatAplikasi::baru(
                    "relasi_rusak",
                    format!(
                        "Prompt {} menunjuk folder yang tidak ada di file.",
                        ringkas_id(&prompt.id)
                    ),
                ));
            }
        }
        for tag_id in &prompt.tag_ids {
            if !id_tag.contains(&tag_id.as_str()) {
                return Err(crate::core::error::GalatAplikasi::baru(
                    "relasi_rusak",
                    format!(
                        "Prompt {} menunjuk tag yang tidak ada di file.",
                        ringkas_id(&prompt.id)
                    ),
                ));
            }
        }
    }

    Ok(())
}

fn periksa_teks(
    teks: &str,
    batas: usize,
    nama_bagian: &str,
    id: &str,
) -> Result<(), crate::core::error::GalatAplikasi> {
    if teks.trim().is_empty() {
        return Err(crate::core::error::GalatAplikasi::baru(
            "struktur_rusak",
            format!("{nama_bagian} kosong pada entri {}.", ringkas_id(id)),
        ));
    }
    if teks.chars().count() > batas {
        return Err(crate::core::error::GalatAplikasi::baru(
            "terlalu_besar",
            format!("{nama_bagian} lebih panjang dari {batas} karakter."),
        ));
    }
    Ok(())
}

fn ringkas_id(id: &str) -> String {
    id.chars().take(8).collect()
}

/// Konversi model simpan ke model ekspor, dan sebaliknya.
pub fn folder_ke_ekspor(folder: &crate::features::folders::model::Folder) -> EksporFolder {
    EksporFolder {
        id: folder.id.clone(),
        nama: folder.nama.clone(),
        dibuat_pada: folder.dibuat_pada,
        diubah_pada: folder.diubah_pada,
    }
}

pub fn tag_ke_ekspor(tag: &crate::features::tags::model::Tag) -> EksporTag {
    EksporTag {
        id: tag.id.clone(),
        nama: tag.nama.clone(),
        warna: tag.warna.clone(),
        dibuat_pada: tag.dibuat_pada,
    }
}
