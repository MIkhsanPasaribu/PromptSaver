//! Lapisan akses data transfer. Berkas ekspor dibaca penuh dan divalidasi di service
//! sebelum satu baris pun masuk ke sini.

use rusqlite::{params, Connection};

use crate::core::database::sekarang_ms;
use crate::core::error::Hasil;
use crate::features::prompts::model::PromptTampil;
use crate::features::transfer::model::{EksporFolder, EksporPrompt, EksporTag};

pub fn daftar_folder(koneksi: &Connection) -> Hasil<Vec<EksporFolder>> {
    Ok(crate::features::folders::repository::daftar(koneksi)?
        .iter()
        .map(crate::features::transfer::format::folder_ke_ekspor)
        .collect())
}

pub fn daftar_tag(koneksi: &Connection) -> Hasil<Vec<EksporTag>> {
    Ok(crate::features::tags::repository::daftar(koneksi)?
        .iter()
        .map(crate::features::transfer::format::tag_ke_ekspor)
        .collect())
}

fn baris_id_isi(baris: &rusqlite::Row<'_>) -> rusqlite::Result<(String, String)> {
    Ok((baris.get(0)?, baris.get(1)?))
}

/// Ambil prompt lengkap dengan tag dan isi penuh untuk diekspor.
pub fn daftar_prompt(koneksi: &Connection, ids: Option<&[String]>) -> Hasil<Vec<PromptTampil>> {
    let semua = crate::features::prompts::repository::daftar(
        koneksi,
        &crate::features::prompts::model::DaftarFilter {
            sertakan_sampah: true,
            batas: Some(i64::MAX),
            ..Default::default()
        },
    )?;

    let dipilih: Vec<PromptTampil> = match ids {
        Some(batasi) => semua
            .into_iter()
            .filter(|prompt| batasi.contains(&prompt.id))
            .collect(),
        None => semua,
    };
    if dipilih.is_empty() {
        return Ok(Vec::new());
    }

    // Isi penuh diambil sekali jalan lewat peta id, supaya tidak satu query per prompt.
    let id_dipilih: Vec<String> = dipilih.iter().map(|p| p.id.clone()).collect();
    let penanda = crate::core::database::placeholder_banyak(id_dipilih.len());
    let pernyataan = format!("SELECT id, isi FROM prompt WHERE id IN {penanda}");
    let rujukan: Vec<&dyn rusqlite::ToSql> = id_dipilih
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let baris = pernyataan_siap.query_map(rusqlite::params_from_iter(rujukan), baris_id_isi)?;
    let mut isi: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for pasangan in baris {
        let (id, teks) = pasangan?;
        isi.insert(id, teks);
    }

    Ok(dipilih
        .into_iter()
        .map(|prompt| PromptTampil {
            isi: isi.get(&prompt.id).cloned().unwrap_or_default(),
            ..prompt
        })
        .collect())
}

pub fn prompt_ada(koneksi: &Connection, id: &str) -> Hasil<bool> {
    crate::features::prompts::repository::ada(koneksi, id)
}

pub fn waktu_prompt(koneksi: &Connection, id: &str) -> Hasil<Option<i64>> {
    Ok(koneksi
        .query_row(
            "SELECT diubah_pada FROM prompt WHERE id = ?1",
            params![id],
            |baris| baris.get::<_, i64>(0),
        )
        .ok())
}

pub fn simpan_folder(koneksi: &Connection, folder: &EksporFolder) -> Hasil<()> {
    koneksi.execute(
        "INSERT INTO folder (id, nama, dibuat_pada, diubah_pada) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET nama = excluded.nama, diubah_pada = excluded.diubah_pada",
        params![
            folder.id,
            folder.nama,
            folder.dibuat_pada,
            folder.diubah_pada
        ],
    )?;
    Ok(())
}

pub fn simpan_tag(koneksi: &Connection, tag: &EksporTag) -> Hasil<()> {
    koneksi.execute(
        "INSERT INTO tag (id, nama, warna, dibuat_pada) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET nama = excluded.nama, warna = excluded.warna",
        params![tag.id, tag.nama, tag.warna, tag.dibuat_pada],
    )?;
    Ok(())
}

pub fn simpan_prompt(koneksi: &Connection, prompt: &EksporPrompt) -> Hasil<()> {
    koneksi.execute(
        "INSERT INTO prompt (id, judul, isi, folder_id, favorit, disemat, dibuat_pada, diubah_pada,
                              dipakai_terakhir, sampah_pada)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            judul = excluded.judul,
            isi = excluded.isi,
            folder_id = excluded.folder_id,
            favorit = excluded.favorit,
            disemat = excluded.disemat,
            diubah_pada = excluded.diubah_pada,
            dipakai_terakhir = excluded.dipakai_terakhir,
            sampah_pada = excluded.sampah_pada",
        params![
            prompt.id,
            prompt.judul,
            prompt.isi,
            prompt.folder_id,
            prompt.favorit,
            prompt.disemat,
            prompt.dibuat_pada,
            prompt.diubah_pada,
            prompt.dipakai_terakhir,
            prompt.sampah_pada
        ],
    )?;
    Ok(())
}

pub fn tempel_tag(koneksi: &Connection, prompt_id: &str, tag_ids: &[String]) -> Hasil<()> {
    crate::features::tags::repository::tempel_prompt_tag(koneksi, prompt_id, tag_ids)?;
    Ok(())
}

/// Id baru untuk mode "simpan sebagai salinan", mengikuti kebiasaan UUID v7 aplikasi.
pub fn id_baru() -> String {
    uuid::Uuid::now_v7().to_string()
}

pub fn waktu_sekarang() -> i64 {
    sekarang_ms()
}
