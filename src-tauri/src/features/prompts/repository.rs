//! Lapisan akses data prompt. Satu-satunya tempat SQL prompt dieksekusi.
//! Semua nilai masuk lewat parameter. Nama kolom dan tabel adalah konstanta kode,
//! tidak pernah teks pengguna (AGENTS.md Bagian 7).

use rusqlite::OptionalExtension;
use rusqlite::{params, params_from_iter, Connection, Row, ToSql};

use crate::core::database::{placeholder_banyak, sekarang_ms};
use crate::core::error::Hasil;
use crate::features::prompts::model::{
    DaftarFilter, DataPrompt, DrafPrompt, HasilKotor, PromptTampil, Statistik, UrutanPrompt,
    VersiPrompt, PANJANG_POTONGAN,
};
use crate::features::tags::repository as tag_repo;

const KOLOM_DASAR: &str = "p.id, p.judul, p.isi, p.folder_id, f.nama, p.favorit, p.disemat,
       p.dibuat_pada, p.diubah_pada, p.dipakai_terakhir, p.sampah_pada";

/// Kolom penanda yang boleh diubah lewat command. Nama kolom diambil dari enum,
/// bukan dari teks pengguna.
#[derive(Debug, Clone, Copy)]
pub enum KolomTanda {
    Favorit,
    Disemat,
}

impl KolomTanda {
    fn nama_kolom(self) -> &'static str {
        match self {
            KolomTanda::Favorit => "favorit",
            KolomTanda::Disemat => "disemat",
        }
    }
}

fn baris_ke_hasil(baris: &Row<'_>) -> rusqlite::Result<HasilKotor> {
    Ok(HasilKotor {
        id: baris.get(0)?,
        judul: baris.get(1)?,
        isi: baris.get(2)?,
        folder_id: baris.get(3)?,
        nama_folder: baris.get(4)?,
        favorit: baris.get(5)?,
        disemat: baris.get(6)?,
        dibuat_pada: baris.get(7)?,
        diubah_pada: baris.get(8)?,
        dipakai_terakhir: baris.get(9)?,
        sampah_pada: baris.get(10)?,
    })
}

/// Ambil satu prompt lengkap, termasuk isi penuh.
pub fn ambil(koneksi: &Connection, id: &str) -> Hasil<Option<PromptTampil>> {
    let pernyataan = format!(
        "SELECT {KOLOM_DASAR}
           FROM prompt p
           LEFT JOIN folder f ON f.id = p.folder_id
          WHERE p.id = ?1"
    );
    let mentah = koneksi
        .prepare(&pernyataan)?
        .query_map(params![id], baris_ke_hasil)?
        .next()
        .transpose()?;

    match mentah {
        Some(baris) => Ok(Some(rakit(koneksi, vec![baris], true)?.remove(0))),
        None => Ok(None),
    }
}

/// Ambil banyak prompt sesuai filter. Digunakan daftar, Sampah, dan Mode Widget.
pub fn daftar(koneksi: &Connection, filter: &DaftarFilter) -> Hasil<Vec<PromptTampil>> {
    let (pernyataan, nilai) = bangun_query(filter);
    let rujukan: Vec<&dyn ToSql> = nilai.iter().map(|v| v.as_ref()).collect();
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let baris = pernyataan_siap.query_map(params_from_iter(rujukan), baris_ke_hasil)?;

    let mut mentah = Vec::new();
    for hasil in baris {
        mentah.push(hasil?);
    }
    rakit(koneksi, mentah, false)
}

/// Kondisi penyaring yang sama dipakai daftar prompt dan hasil pencarian: folder, favorit, dan
/// aturan "prompt harus memiliki SEMUA tag yang diminta" (PRD B2, diiris dengan INTERSECT).
/// Digabung di satu tempat supaya penjelajahan dan pencarian tidak bisa berbeda kesimpulan
/// tentang baris mana yang lolos. Kondisi dan nilai didorong berpasangan sehingga urutan
/// placeholder tidak mungkin meleset dari urutan nilai.
pub fn tambah_kondisi_bersama(
    folder_id: Option<&String>,
    hanya_favorit: bool,
    tag_ids: &[String],
    kondisi: &mut Vec<String>,
    nilai: &mut Vec<Box<dyn ToSql>>,
) {
    if let Some(id) = folder_id {
        kondisi.push("p.folder_id = ?".to_string());
        nilai.push(Box::new(id.clone()));
    }
    if hanya_favorit {
        kondisi.push("p.favorit = 1".to_string());
    }
    if !tag_ids.is_empty() {
        let gabung = tag_ids
            .iter()
            .map(|_| "SELECT pt.prompt_id FROM prompt_tag pt WHERE pt.tag_id = ?")
            .collect::<Vec<_>>()
            .join(" INTERSECT ");
        kondisi.push(format!("p.id IN ({gabung})"));
        for tag_id in tag_ids {
            nilai.push(Box::new(tag_id.clone()));
        }
    }
}

fn bangun_query(filter: &DaftarFilter) -> (String, Vec<Box<dyn ToSql>>) {
    let mut kondisi: Vec<String> = Vec::new();
    let mut nilai: Vec<Box<dyn ToSql>> = Vec::new();

    if filter.hanya_sampah {
        kondisi.push("p.sampah_pada IS NOT NULL".to_string());
    } else if !filter.sertakan_sampah {
        kondisi.push("p.sampah_pada IS NULL".to_string());
    }
    if filter.tanpa_folder {
        kondisi.push("p.folder_id IS NULL".to_string());
    }
    tambah_kondisi_bersama(
        filter.folder_id.as_ref(),
        filter.hanya_favorit,
        &filter.tag_ids,
        &mut kondisi,
        &mut nilai,
    );

    let urutan = match filter.urutan {
        UrutanPrompt::Terbaru => "p.diubah_pada DESC",
        UrutanPrompt::Dipakai => "coalesce(p.dipakai_terakhir, 0) DESC, p.diubah_pada DESC",
        UrutanPrompt::Abjad => {
            "CASE WHEN p.judul = '' THEN p.isi ELSE p.judul END COLLATE NOCASE ASC"
        }
    };

    // Daftar ekspor bisa tidak punya syarat sampah sama sekali, jadi klausa WHERE
    // disusun hanya bila ada kondisi. Tanpa ini SQL menghasilkan "WHERE ORDER BY".
    let klausa_where = if kondisi.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", kondisi.join(" AND "))
    };

    let pernyataan = format!(
        "SELECT {KOLOM_DASAR}
           FROM prompt p
           LEFT JOIN folder f ON f.id = p.folder_id
          {klausa_where}
          ORDER BY p.disemat DESC, {urutan}
          LIMIT ? OFFSET ?"
    );
    nilai.push(Box::new(filter.batas.unwrap_or(200).max(1)));
    nilai.push(Box::new(filter.kursor.unwrap_or(0).max(0)));

    (pernyataan, nilai)
}

/// Riwayat versi prompt dijaga maksimal 10 entri terbaru per prompt (PRD C3).
pub const MAKS_VERSI: i64 = 10;

/// Simpan satu keadaan lama lalu buang entri yang melewati batas. Satu pernyataan DELETE
/// dengan subquery menjaga pemangkasan terjadi dalam transaksi yang sama dengan INSERT.
pub fn simpan_versi(
    koneksi: &Connection,
    versi_id: &str,
    prompt_id: &str,
    judul: &str,
    isi: &str,
    disimpan_pada: i64,
) -> Hasil<()> {
    koneksi.execute(
        "insert into versi_prompt (id, prompt_id, judul, isi, disimpan_pada)
         values (?1, ?2, ?3, ?4, ?5)",
        params![versi_id, prompt_id, judul, isi, disimpan_pada],
    )?;
    koneksi.execute(
        "delete from versi_prompt
          where prompt_id = ?1
            and id not in (
              select id from versi_prompt where prompt_id = ?1
               order by disimpan_pada desc, id desc limit ?2
            )",
        params![prompt_id, MAKS_VERSI],
    )?;
    Ok(())
}

fn baris_versi(baris: &rusqlite::Row) -> rusqlite::Result<VersiPrompt> {
    Ok(VersiPrompt {
        id: baris.get(0)?,
        prompt_id: baris.get(1)?,
        judul: baris.get(2)?,
        isi: baris.get(3)?,
        disimpan_pada: baris.get(4)?,
    })
}

/// Riwayat sebuah prompt, terbaru lebih dulu.
pub fn daftar_versi(koneksi: &Connection, prompt_id: &str) -> Hasil<Vec<VersiPrompt>> {
    let mut pernyataan = koneksi.prepare(
        "select id, prompt_id, judul, isi, disimpan_pada
           from versi_prompt where prompt_id = ?1
          order by disimpan_pada desc, id desc",
    )?;
    let baris = pernyataan.query_map(params![prompt_id], baris_versi)?;
    let mut hasil = Vec::new();
    for satu in baris {
        hasil.push(satu?);
    }
    Ok(hasil)
}

pub fn ambil_versi(koneksi: &Connection, versi_id: &str) -> Hasil<Option<VersiPrompt>> {
    let hasil = koneksi
        .query_row(
            "select id, prompt_id, judul, isi, disimpan_pada from versi_prompt where id = ?1",
            params![versi_id],
            baris_versi,
        )
        .optional()?;
    Ok(hasil)
}

/// Pasang tag dan potongan isi pada hasil mentah.
fn rakit(
    koneksi: &Connection,
    mentah: Vec<HasilKotor>,
    sertakan_isi: bool,
) -> Hasil<Vec<PromptTampil>> {
    let ids: Vec<String> = mentah.iter().map(|p| p.id.clone()).collect();
    let semua_tag = tag_repo::untuk_prompt(koneksi, &ids)?;

    Ok(mentah
        .into_iter()
        .map(|baris| {
            let tags = semua_tag
                .iter()
                .filter(|(prompt_id, _)| *prompt_id == baris.id)
                .map(|(_, tag)| tag.clone())
                .collect();
            PromptTampil {
                id: baris.id,
                judul: baris.judul.clone(),
                isi: if sertakan_isi {
                    baris.isi.clone()
                } else {
                    String::new()
                },
                folder_id: baris.folder_id,
                nama_folder: baris.nama_folder,
                tags,
                favorit: baris.favorit,
                disemat: baris.disemat,
                dibuat_pada: baris.dibuat_pada,
                diubah_pada: baris.diubah_pada,
                dipakai_terakhir: baris.dipakai_terakhir,
                sampah_pada: baris.sampah_pada,
                potongan: if sertakan_isi {
                    None
                } else {
                    Some(buat_potongan(&baris.isi))
                },
            }
        })
        .collect())
}

/// Ambil banyak prompt sekaligus tanpa isi penuh. Urutan hasil diatur pemanggil.
pub fn ambil_many(koneksi: &Connection, ids: &[String]) -> Hasil<Vec<PromptTampil>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let penanda = placeholder_banyak(ids.len());
    let pernyataan = format!(
        "SELECT {KOLOM_DASAR}
           FROM prompt p
           LEFT JOIN folder f ON f.id = p.folder_id
          WHERE p.id IN {penanda}"
    );
    let rujukan: Vec<&dyn ToSql> = ids.iter().map(|id| id as &dyn ToSql).collect();
    let mut pernyataan_siap = koneksi.prepare(&pernyataan)?;
    let baris = pernyataan_siap.query_map(params_from_iter(rujukan), baris_ke_hasil)?;

    let mut mentah = Vec::new();
    for hasil in baris {
        mentah.push(hasil?);
    }
    rakit(koneksi, mentah, false)
}

pub fn buat_potongan(isi: &str) -> String {
    let rata: String = isi
        .chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .collect();
    let rata = rata.split_whitespace().collect::<Vec<_>>().join(" ");
    if rata.chars().count() <= PANJANG_POTONGAN {
        return rata;
    }
    let potong: String = rata.chars().take(PANJANG_POTONGAN).collect();
    format!("{potong}…")
}

pub fn simpan(koneksi: &Connection, id: &str, judul: &str, data: &DataPrompt) -> Hasil<()> {
    let waktu = sekarang_ms();
    koneksi.execute(
        "INSERT INTO prompt (id, judul, isi, folder_id, dibuat_pada, diubah_pada)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, judul, data.isi, data.folder_id, waktu],
    )?;
    Ok(())
}

pub fn perbarui(koneksi: &Connection, id: &str, judul: &str, data: &DataPrompt) -> Hasil<usize> {
    let waktu = sekarang_ms();
    Ok(koneksi.execute(
        "UPDATE prompt
            SET judul = ?2, isi = ?3, folder_id = ?4, diubah_pada = ?5
          WHERE id = ?1",
        params![id, judul, data.isi, data.folder_id, waktu],
    )?)
}

pub fn ubah_tanda(koneksi: &Connection, id: &str, kolom: KolomTanda, aktif: bool) -> Hasil<usize> {
    let pernyataan = format!(
        "UPDATE prompt SET {} = ?2, diubah_pada = ?3 WHERE id = ?1",
        kolom.nama_kolom()
    );
    Ok(koneksi.execute(&pernyataan, params![id, aktif, sekarang_ms()])?)
}

pub fn pindah_folder(koneksi: &Connection, id: &str, folder_id: Option<&str>) -> Hasil<usize> {
    Ok(koneksi.execute(
        "UPDATE prompt SET folder_id = ?2, diubah_pada = ?3 WHERE id = ?1",
        params![id, folder_id, sekarang_ms()],
    )?)
}

pub fn tandai_dipakai(koneksi: &Connection, id: &str) -> Hasil<usize> {
    Ok(koneksi.execute(
        "UPDATE prompt SET dipakai_terakhir = ?2 WHERE id = ?1",
        params![id, sekarang_ms()],
    )?)
}

/// Soft delete ke Sampah (PRD A2 dan A3). Per id supaya tidak perlu menomornya ulang.
pub fn pindahkan_ke_sampah(koneksi: &Connection, ids: &[String]) -> Hasil<usize> {
    let waktu = sekarang_ms();
    let mut berubah = 0;
    for id in ids {
        berubah += koneksi.execute(
            "UPDATE prompt SET sampah_pada = ?2, diubah_pada = ?2
              WHERE id = ?1 AND sampah_pada IS NULL",
            params![id, waktu],
        )?;
    }
    Ok(berubah)
}

/// Lepas semua prompt dari satu folder tanpa menghapus promptnya (PRD B1, aksi "Pindahkan").
/// Dimiliki lapisan ini karena lapisan folder tidak boleh menulis SQL ke tabel prompt.
pub fn lepaskan_dari_folder(koneksi: &Connection, folder_id: &str) -> Hasil<usize> {
    Ok(koneksi.execute(
        "UPDATE prompt SET folder_id = NULL, diubah_pada = ?2 WHERE folder_id = ?1",
        params![folder_id, sekarang_ms()],
    )?)
}

/// Pindahkan seluruh prompt sebuah folder ke Sampah dalam satu pernyataan (PRD B1).
pub fn sampah_dari_folder(koneksi: &Connection, folder_id: &str) -> Hasil<usize> {
    let waktu = sekarang_ms();
    Ok(koneksi.execute(
        "UPDATE prompt
            SET sampah_pada = ?2, diubah_pada = ?2
          WHERE folder_id = ?1 AND sampah_pada IS NULL",
        params![folder_id, waktu],
    )?)
}

/// Pulih ke folder asal, atau ke "Tanpa Folder" bila foldernya sudah dihapus (PRD A3).
pub fn pulihkan(koneksi: &Connection, id: &str) -> Hasil<usize> {
    Ok(koneksi.execute(
        "UPDATE prompt
            SET sampah_pada = NULL,
                folder_id = CASE WHEN folder_id IS NOT NULL
                                  AND EXISTS (SELECT 1 FROM folder fo WHERE fo.id = prompt.folder_id)
                                 THEN folder_id ELSE NULL END,
                diubah_pada = ?2
          WHERE id = ?1 AND sampah_pada IS NOT NULL",
        params![id, sekarang_ms()],
    )?)
}

pub fn hapus_permanen(koneksi: &Connection, ids: &[String]) -> Hasil<usize> {
    if ids.is_empty() {
        return Ok(0);
    }
    let penanda = placeholder_banyak(ids.len());
    let pernyataan = format!("DELETE FROM prompt WHERE id IN {penanda}");
    let rujukan: Vec<&dyn ToSql> = ids.iter().map(|id| id as &dyn ToSql).collect();
    Ok(koneksi
        .prepare(&pernyataan)?
        .execute(params_from_iter(rujukan))?)
}

pub fn kosongkan_sampah(koneksi: &Connection) -> Hasil<usize> {
    Ok(koneksi.execute("DELETE FROM prompt WHERE sampah_pada IS NOT NULL", [])?)
}

pub fn ada(koneksi: &Connection, id: &str) -> Hasil<bool> {
    crate::core::database::ada_baris(koneksi, "SELECT 1 FROM prompt WHERE id = ?1", params![id])
}

pub fn statistik(koneksi: &Connection) -> Hasil<Statistik> {
    let jumlah_prompt: i64 = koneksi.query_row(
        "SELECT count(*) FROM prompt WHERE sampah_pada IS NULL",
        [],
        |baris| baris.get(0),
    )?;
    let jumlah_sampah: i64 = koneksi.query_row(
        "SELECT count(*) FROM prompt WHERE sampah_pada IS NOT NULL",
        [],
        |baris| baris.get(0),
    )?;
    let jumlah_folder: i64 = koneksi.query_row("SELECT count(*) FROM folder", [], |b| b.get(0))?;
    let jumlah_tag: i64 = koneksi.query_row("SELECT count(*) FROM tag", [], |b| b.get(0))?;
    let halaman: i64 = koneksi.query_row("PRAGMA page_count", [], |b| b.get(0))?;
    let ukuran_halaman: i64 = koneksi.query_row("PRAGMA page_size", [], |b| b.get(0))?;

    Ok(Statistik {
        jumlah_prompt,
        jumlah_folder,
        jumlah_tag,
        jumlah_sampah,
        ukuran_database_kb: halaman * ukuran_halaman / 1024,
    })
}

pub fn simpan_draf(koneksi: &Connection, id: &str, data: &DataPrompt) -> Hasil<()> {
    koneksi.execute(
        "INSERT INTO draf (id, judul, isi, folder_id, tag_ids, diubah_pada)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            judul = excluded.judul,
            isi = excluded.isi,
            folder_id = excluded.folder_id,
            tag_ids = excluded.tag_ids,
            diubah_pada = excluded.diubah_pada",
        params![
            id,
            data.judul.clone().unwrap_or_default(),
            data.isi,
            data.folder_id,
            serde_json::to_string(&data.tag_ids)?,
            sekarang_ms()
        ],
    )?;
    Ok(())
}

pub fn ambil_draf(koneksi: &Connection, id: &str) -> Hasil<Option<DrafPrompt>> {
    let draf = koneksi
        .prepare("SELECT judul, isi, folder_id, tag_ids, diubah_pada FROM draf WHERE id = ?1")?
        .query_map(params![id], |baris| {
            let tag_ids_json: String = baris.get(3)?;
            Ok(DrafPrompt {
                judul: baris.get(0)?,
                isi: baris.get(1)?,
                folder_id: baris.get(2)?,
                tag_ids: serde_json::from_str(&tag_ids_json).unwrap_or_default(),
                diubah_pada: baris.get(4)?,
            })
        })?
        .next()
        .transpose()?;
    Ok(draf)
}

pub fn hapus_draf(koneksi: &Connection, id: &str) -> Hasil<usize> {
    Ok(koneksi.execute("DELETE FROM draf WHERE id = ?1", params![id])?)
}
