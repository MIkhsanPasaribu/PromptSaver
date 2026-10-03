//! Lapisan akses data tag.

use rusqlite::{params, Connection, Row};

use crate::core::database::{placeholder_banyak, sekarang_ms};
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::tags::model::Tag;

fn baris_ke_tag(baris: &Row<'_>) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: baris.get("id")?,
        nama: baris.get("nama")?,
        warna: baris.get("warna")?,
        jumlah_prompt: baris.get("jumlah_prompt")?,
        dibuat_pada: baris.get("dibuat_pada")?,
    })
}

const QUERY_DASAR: &str = "SELECT t.id,
       t.nama,
       t.warna,
       t.dibuat_pada,
       (SELECT count(*)
          FROM prompt_tag pt
          JOIN prompt p ON p.id = pt.prompt_id
         WHERE pt.tag_id = t.id AND p.sampah_pada IS NULL) AS jumlah_prompt
  FROM tag t";

pub fn daftar(koneksi: &Connection) -> Hasil<Vec<Tag>> {
    let pernyataan = format!("{QUERY_DASAR} ORDER BY t.nama COLLATE NOCASE ASC");
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let baris = pernyataan_siap.query_map([], baris_ke_tag)?;
    let mut hasil = Vec::new();
    for tag in baris {
        hasil.push(tag?);
    }
    Ok(hasil)
}

pub fn ambil(koneksi: &Connection, id: &str) -> Hasil<Option<Tag>> {
    let pernyataan = format!("{QUERY_DASAR} WHERE t.id = ?1");
    isi_opsional(koneksi, &pernyataan, params![id])
}

pub fn cari_nama(koneksi: &Connection, nama: &str) -> Hasil<Option<Tag>> {
    let pernyataan = format!("{QUERY_DASAR} WHERE t.nama = ?1 COLLATE NOCASE");
    isi_opsional(koneksi, &pernyataan, params![nama])
}

fn isi_opsional(
    koneksi: &Connection,
    pernyataan: &str,
    nilai: impl rusqlite::Params,
) -> Hasil<Option<Tag>> {
    let mut pernyataan_siap = koneksi.prepare(pernyataan)?;
    let mut baris = pernyataan_siap.query_map(nilai, baris_ke_tag)?;
    match baris.next() {
        Some(tag) => Ok(Some(tag?)),
        None => Ok(None),
    }
}

pub fn simpan(koneksi: &Connection, id: &str, nama: &str, warna: &str) -> Hasil<Tag> {
    koneksi.execute(
        "INSERT INTO tag (id, nama, warna, dibuat_pada) VALUES (?1, ?2, ?3, ?4)",
        params![id, nama, warna, sekarang_ms()],
    )?;
    ambil(koneksi, id)?.ok_or_else(|| GalatAplikasi::tidak_ditemukan("Tag"))
}

pub fn ubah(koneksi: &Connection, id: &str, nama: &str, warna: &str) -> Hasil<Option<Tag>> {
    let berubah = koneksi.execute(
        "UPDATE tag SET nama = ?2, warna = ?3 WHERE id = ?1",
        params![id, nama, warna],
    )?;
    if berubah == 0 {
        return Ok(None);
    }
    ambil(koneksi, id)
}

pub fn hapus(koneksi: &Connection, id: &str) -> Hasil<usize> {
    Ok(koneksi.execute("DELETE FROM tag WHERE id = ?1", params![id])?)
}

pub fn ada(koneksi: &Connection, id: &str) -> Hasil<bool> {
    crate::core::database::ada_baris(koneksi, "SELECT 1 FROM tag WHERE id = ?1", params![id])
}

pub fn nama_terpakai(koneksi: &Connection, nama: &str, kecuali_id: Option<&str>) -> Hasil<bool> {
    let ada = match kecuali_id {
        Some(kecuali) => crate::core::database::ada_baris(
            koneksi,
            "SELECT 1 FROM tag WHERE nama = ?1 COLLATE NOCASE AND id <> ?2",
            params![nama, kecuali],
        )?,
        None => crate::core::database::ada_baris(
            koneksi,
            "SELECT 1 FROM tag WHERE nama = ?1 COLLATE NOCASE",
            params![nama],
        )?,
    };
    Ok(ada)
}

/// Jumlah id tag yang tidak ada di tabel tag. Dipakai service untuk menolak id palsu.
pub fn jumlah_yang_tidak_diketahui(koneksi: &Connection, ids: &[String]) -> Hasil<usize> {
    if ids.is_empty() {
        return Ok(0);
    }
    let penanda = placeholder_banyak(ids.len());
    let pernyataan = format!("SELECT count(*) FROM tag WHERE id IN {penanda}");
    let nilai: Vec<&dyn rusqlite::ToSql> =
        ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
    let diketahui: i64 = koneksi
        .prepare(&pernyataan)?
        .query_row(rusqlite::params_from_iter(nilai), |baris| baris.get(0))?;
    Ok(ids.len().saturating_sub(diketahui as usize))
}

/// Ganti seluruh keanggotaan tag sebuah prompt.
pub fn tempel_prompt_tag(koneksi: &Connection, prompt_id: &str, tag_ids: &[String]) -> Hasil<()> {
    koneksi.execute(
        "DELETE FROM prompt_tag WHERE prompt_id = ?1",
        params![prompt_id],
    )?;
    for tag_id in tag_ids {
        koneksi.execute(
            "INSERT OR IGNORE INTO prompt_tag (prompt_id, tag_id) VALUES (?1, ?2)",
            params![prompt_id, tag_id],
        )?;
    }
    Ok(())
}

/// Ambil tag untuk banyak prompt sekaligus. Dipakai lapisan repository prompt.
pub fn untuk_prompt(koneksi: &Connection, prompt_ids: &[String]) -> Hasil<Vec<(String, Tag)>> {
    if prompt_ids.is_empty() {
        return Ok(Vec::new());
    }
    let penanda = placeholder_banyak(prompt_ids.len());
    let pernyataan = format!(
        "SELECT pt.prompt_id,
                t.id,
                t.nama,
                t.warna,
                t.dibuat_pada,
                (SELECT count(*)
                   FROM prompt_tag p2
                   JOIN prompt p3 ON p3.id = p2.prompt_id
                  WHERE p2.tag_id = t.id AND p3.sampah_pada IS NULL) AS jumlah_prompt
           FROM prompt_tag pt
           JOIN tag t ON t.id = pt.tag_id
          WHERE pt.prompt_id IN {penanda}
          ORDER BY t.nama COLLATE NOCASE ASC"
    );
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let nilai: Vec<&dyn rusqlite::ToSql> = prompt_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    let baris = pernyataan_siap.query_map(rusqlite::params_from_iter(nilai), |baris| {
        let prompt_id: String = baris.get(0)?;
        Ok((
            prompt_id,
            Tag {
                id: baris.get(1)?,
                nama: baris.get(2)?,
                warna: baris.get(3)?,
                dibuat_pada: baris.get(4)?,
                jumlah_prompt: baris.get(5)?,
            },
        ))
    })?;

    let mut hasil = Vec::new();
    for baris_tag in baris {
        hasil.push(baris_tag?);
    }
    Ok(hasil)
}
