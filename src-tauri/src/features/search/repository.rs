//! Lapisan akses data pencarian. Hanya query FTS5 dan fallback LIKE yang tinggal di sini.
//! Urutan placeholder selalu sama dengan urutan nilai yang di-push, supaya tidak meleset.

use rusqlite::{params_from_iter, Connection, ToSql};

use crate::core::error::Hasil;
use crate::features::prompts::model::UrutanPrompt;
use crate::features::search::model::FilterCari;

/// Bangun kondisi tambahan selain pencocokan teks. Nilai didorong dalam urutan yang sama
/// dengan tanda `?` yang ditambahkan.
fn bangun_kondisi(filter: &FilterCari, nilai: &mut Vec<Box<dyn ToSql>>) -> Vec<String> {
    let mut kondisi = vec!["p.sampah_pada IS NULL".to_string()];

    if let Some(folder_id) = &filter.folder_id {
        kondisi.push("p.folder_id = ?".to_string());
        nilai.push(Box::new(folder_id.clone()));
    }
    if filter.hanya_favorit {
        kondisi.push("p.favorit = 1".to_string());
    }
    if !filter.tag_ids.is_empty() {
        let gabung = filter
            .tag_ids
            .iter()
            .map(|_| "SELECT pt.prompt_id FROM prompt_tag pt WHERE pt.tag_id = ?")
            .collect::<Vec<_>>()
            .join(" INTERSECT ");
        kondisi.push(format!("p.id IN ({gabung})"));
        for tag_id in &filter.tag_ids {
            nilai.push(Box::new(tag_id.clone()));
        }
    }

    kondisi
}

pub fn id_tercocok_fts(
    koneksi: &Connection,
    kueri_fts: &str,
    filter: &FilterCari,
) -> Hasil<Vec<String>> {
    let mut nilai: Vec<Box<dyn ToSql>> = vec![Box::new(kueri_fts.to_string())];
    let kondisi = bangun_kondisi(filter, &mut nilai);
    let urutan = match filter.urutan {
        UrutanPrompt::Abjad => {
            "CASE WHEN p.judul = '' THEN p.isi ELSE p.judul END COLLATE NOCASE ASC"
        }
        UrutanPrompt::Terbaru => "bm25(prompt_carik) ASC",
        UrutanPrompt::Dipakai => "coalesce(p.dipakai_terakhir, 0) DESC, bm25(prompt_carik) ASC",
    };

    // Tabel FTS5 ditulis tanpa alias karena bm25() hanya menerima nama tabel aslinya,
    // sedangkan tabel prompt tetap memakai alias p karena kondisi lain merujuk ke sana.
    let pernyataan = format!(
        "SELECT p.id
           FROM prompt_carik
           JOIN prompt p ON p.id = prompt_carik.prompt_id
          WHERE prompt_carik MATCH ? AND {}
          ORDER BY {urutan}
          LIMIT ? OFFSET ?",
        kondisi.join(" AND ")
    );
    nilai.push(Box::new(filter.batas.unwrap_or(100).max(1)));
    nilai.push(Box::new(filter.kursor.unwrap_or(0).max(0)));

    jalankan(koneksi, &pernyataan, &nilai)
}

/// Fallback saat FTS tidak menghasilkan apa pun. Mencocokkan potongan kata di tengah kata,
/// termasuk yang belum terpenggal spasi, dan ikut mencari di nama tag.
pub fn id_tercocok_like(
    koneksi: &Connection,
    kueri: &str,
    filter: &FilterCari,
) -> Hasil<Vec<String>> {
    let pola = format!("%{}%", lindungi_pola(kueri.trim()));
    let mut nilai: Vec<Box<dyn ToSql>> = Vec::new();
    let mut kondisi = bangun_kondisi(filter, &mut nilai);

    kondisi.push(
        "(p.judul LIKE ? ESCAPE '\\'
          OR p.isi LIKE ? ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM prompt_tag pt
                      JOIN tag t ON t.id = pt.tag_id
                     WHERE pt.prompt_id = p.id AND t.nama LIKE ? ESCAPE '\\'))"
            .to_string(),
    );
    nilai.push(Box::new(pola.clone()));
    nilai.push(Box::new(pola.clone()));
    nilai.push(Box::new(pola));

    let pernyataan = format!(
        "SELECT p.id
           FROM prompt p
          WHERE {}
          ORDER BY p.diubah_pada DESC
          LIMIT ? OFFSET ?",
        kondisi.join(" AND ")
    );
    nilai.push(Box::new(filter.batas.unwrap_or(100).max(1)));
    nilai.push(Box::new(filter.kursor.unwrap_or(0).max(0)));

    jalankan(koneksi, &pernyataan, &nilai)
}

fn lindungi_pola(teks: &str) -> String {
    teks.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn jalankan(
    koneksi: &Connection,
    pernyataan: &str,
    nilai: &[Box<dyn ToSql>],
) -> Hasil<Vec<String>> {
    let rujukan: Vec<&dyn ToSql> = nilai.iter().map(|v| v.as_ref()).collect();
    let mut pernyataan_siap = koneksi.prepare(pernyataan)?;
    let baris =
        pernyataan_siap.query_map(params_from_iter(rujukan), |baris| baris.get::<_, String>(0))?;

    let mut ids = Vec::new();
    for id in baris {
        ids.push(id?);
    }
    Ok(ids)
}
