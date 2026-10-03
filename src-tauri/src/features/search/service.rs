//! Logika bisnis pencarian. Menyusun ekspresi FTS5 dengan aman dan menyediakan
//! fallback LIKE supaya potongan kata di tengah kata tetap ditemukan (PRD B3).

use rusqlite::Connection;

use crate::core::error::Hasil;
use crate::features::prompts::model::PromptTampil;
use crate::features::prompts::repository;
use crate::features::search::model::FilterCari;
use crate::features::search::repository as repo_cari;

pub const BATAS_AWAL: i64 = 100;

/// Ubah teks mentah pengguna menjadi ekspresi FTS5.
/// Karakter sintaks FTS dibuang, tiap kata dijadikan frasa terkutip, dan kata terakhir
/// diberi tanda awalan supaya ketikan belum selesai tetap cocok.
pub fn bangun_ekspresi_fts(kueri: &str) -> Option<String> {
    let token: Vec<String> = kueri
        .split_whitespace()
        .map(|kata| {
            kata.replace(
                ['"', '*', '(', ')', ':', '^', '-', '{', '}', '[', ']', '"'],
                "",
            )
        })
        .filter(|kata| !kata.is_empty())
        .collect();

    if token.is_empty() {
        return None;
    }

    let indeks_terakhir = token.len() - 1;
    Some(
        token
            .iter()
            .enumerate()
            .map(|(i, kata)| {
                let frasa = format!("\"{kata}\"");
                if i == indeks_terakhir {
                    format!("{frasa}*")
                } else {
                    frasa
                }
            })
            .collect::<Vec<_>>()
            .join(" AND "),
    )
}

pub fn cari(
    koneksi: &Connection,
    filter: &FilterCari,
) -> Result<Vec<PromptTampil>, crate::core::error::GalatAplikasi> {
    let kueri = filter.kueri.trim();
    if kueri.is_empty() {
        return Ok(Vec::new());
    }

    let mut tanpa_batas = filter.clone();
    tanpa_batas.batas = Some(filter.batas.unwrap_or(BATAS_AWAL));

    let ids = match bangun_ekspresi_fts(kueri) {
        Some(ekspresi) => {
            let lewat_fts = repo_cari::id_tercocok_fts(koneksi, &ekspresi, &tanpa_batas)?;
            if lewat_fts.is_empty() {
                repo_cari::id_tercocok_like(koneksi, kueri, &tanpa_batas)?
            } else {
                lewat_fts
            }
        }
        None => repo_cari::id_tercocok_like(koneksi, kueri, &tanpa_batas)?,
    };

    urutkan(koneksi, &ids)
}

fn urutkan(koneksi: &Connection, ids: &[String]) -> Hasil<Vec<PromptTampil>> {
    let ditemukan = repository::ambil_many(koneksi, ids)?;
    Ok(ids
        .iter()
        .filter_map(|id| ditemukan.iter().find(|prompt| &prompt.id == id).cloned())
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;
    use crate::features::prompts::model::DataPrompt;
    use crate::features::prompts::service as service_prompt;
    use crate::features::tags::service as service_tag;

    /// Ukur target skalabilitas PRD Bagian 5: pencarian pada 5.000 prompt harus di bawah
    /// 200 ms. Ditandai `ignore` supaya suite harian tetap cepat; jalankan dengan
    /// `cargo test -- --ignored`.
    #[test]
    #[ignore = "mengisi 5.000 prompt lebih dulu"]
    fn pencarian_pada_5000_prompt_di_bawah_200_md() {
        let koneksi = koneksi_uji().unwrap();
        koneksi.execute("BEGIN", []).unwrap();
        for i in 0..5_000_i64 {
            koneksi
                .execute(
                    "insert into prompt (id, judul, isi, dibuat_pada, diubah_pada)
                     values (?1, ?2, ?3, ?4, ?4)",
                    rusqlite::params![
                        format!("p-{i}"),
                        format!("Prompt {i}"),
                        format!("Ringkas jurnal penelitian nomor {i} menjadi dua paragraf"),
                        i
                    ],
                )
                .unwrap();
        }
        koneksi.execute("COMMIT", []).unwrap();

        let total = koneksi
            .query_row("select count(*) from prompt", [], |b| b.get::<_, i64>(0))
            .unwrap();
        assert_eq!(total, 5_000);

        let mulai = std::time::Instant::now();
        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "jurnal".to_string(),
                ..Default::default()
            },
        )
        .unwrap();
        let durasi = mulai.elapsed();
        println!(
            "5000 prompt: {} hasil dalam {} ms",
            hasil.len(),
            durasi.as_millis()
        );
        assert!(!hasil.is_empty());
        assert!(
            durasi.as_millis() < 200,
            "pencarian {} ms melewati target PRD 200 ms",
            durasi.as_millis()
        );
    }

    fn siapkan() -> Connection {
        let koneksi = koneksi_uji().unwrap();
        for isi in [
            "Ringkas jurnal penelitian menjadi dua paragraf",
            "Terjemahkan teks berikut ke bahasa Indonesia",
            "Buat outline presentasi hasil riset",
        ] {
            service_prompt::buat(
                &koneksi,
                &DataPrompt {
                    isi: isi.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();
        }
        koneksi
    }

    #[test]
    fn ekspresi_fts_membuang_karakter_sintaks() {
        let ekspresi = bangun_ekspresi_fts("jurnal \"riset\" (2024)").unwrap();
        assert_eq!(ekspresi, "\"jurnal\" AND \"riset\" AND \"2024\"*");
    }

    #[test]
    fn ekspresi_fts_kosong_untuk_tanpa_huruf_efektif() {
        assert!(bangun_ekspresi_fts("   \"*\"  ").is_none());
    }

    #[test]
    fn mencari_kata_di_judul_dan_isi() {
        let koneksi = siapkan();
        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "jurnal".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(hasil.len(), 1);
        assert!(hasil[0]
            .potongan
            .clone()
            .unwrap_or_default()
            .contains("jurnal"));
    }

    #[test]
    fn mencari_dengan_huruf_kecil_semua() {
        let koneksi = siapkan();
        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "RINGKAS".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(hasil.len(), 1, "pencarian tidak peka huruf besar/kecil");
    }

    #[test]
    fn potongan_kata_ditengah_kata_ditemukan_lewat_fallback() {
        let koneksi = siapkan();
        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "penelit".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(
            hasil.len(),
            1,
            "FTS awalan mungkin lolos, fallback LIKE harus menangkap"
        );
    }

    #[test]
    fn mencari_lewat_nama_tag() {
        let koneksi = siapkan();
        let tag = service_tag::buat(&koneksi, "akademik", None).unwrap();
        let prompt = service_prompt::daftar(&koneksi, &Default::default())
            .unwrap()
            .remove(0);
        crate::features::tags::repository::tempel_prompt_tag(&koneksi, &prompt.id, &[tag.id])
            .unwrap();

        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "akademik".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(hasil.len(), 1);
    }

    #[test]
    fn prompt_di_sampah_tidak_muncul_di_hasil_cari() {
        let koneksi = siapkan();
        let target = service_prompt::daftar(&koneksi, &Default::default())
            .unwrap()
            .into_iter()
            .find(|p| p.potongan.clone().unwrap_or_default().contains("outline"))
            .expect("prompt contoh harus ada di daftar");
        service_prompt::ke_sampah(&koneksi, &target.id).unwrap();

        let hasil = cari(
            &koneksi,
            &FilterCari {
                kueri: "outline".into(),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(hasil.is_empty(), "Sampah dikecualikan dari pencarian biasa");
    }

    #[test]
    fn kueri_kosong_menghasilkan_tanpa_isi() {
        let koneksi = siapkan();
        assert!(cari(&koneksi, &FilterCari::default()).unwrap().is_empty());
    }
}
