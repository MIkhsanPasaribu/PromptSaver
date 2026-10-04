//! Logika bisnis prompt. Backend adalah sumber kebenaran validasi (AGENTS.md Bagian 4).

use rusqlite::Connection;
use uuid::Uuid;

use crate::core::database::sekarang_ms;
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::prompts::model::{
    DaftarFilter, DataPrompt, DrafPrompt, PromptTampil, Statistik, TagBaru, VersiPrompt,
    PANJANG_ISI_MAKS, PANJANG_JUDUL_MAKS, PANJANG_JUDUL_OTOMATIS,
};
use crate::features::prompts::repository::{self, KolomTanda};
use crate::features::tags::repository as tag_repo;
use crate::features::tags::service as tag_service;

/// Kunci baris draf tunggal di tabel draf.
pub const ID_DRAF_AKTIF: &str = "aktif";

pub fn daftar(koneksi: &Connection, filter: &DaftarFilter) -> Hasil<Vec<PromptTampil>> {
    repository::daftar(koneksi, filter)
}

pub fn ambil(koneksi: &Connection, id: &str) -> Hasil<PromptTampil> {
    repository::ambil(koneksi, id)?.ok_or_else(|| GalatAplikasi::tidak_ditemukan("Prompt"))
}

pub fn buat(koneksi: &Connection, data: &DataPrompt) -> Hasil<PromptTampil> {
    let (judul, isi) = validasi_data(data)?;
    if let Some(folder_id) = &data.folder_id {
        pastikan_folder_ada(koneksi, folder_id)?;
    }
    pastikan_tag_diketahui(koneksi, &data.tag_ids)?;

    let id = Uuid::now_v7().to_string();
    repository::simpan(
        koneksi,
        &id,
        &judul,
        &DataPrompt {
            isi,
            ..data.clone()
        },
    )?;
    terapkan_tag(koneksi, &id, &data.tag_ids, &data.tag_baru)?;
    repository::hapus_draf(koneksi, ID_DRAF_AKTIF)?;

    ambil(koneksi, &id)
}

pub fn perbarui(koneksi: &Connection, id: &str, data: &DataPrompt) -> Hasil<PromptTampil> {
    if !repository::ada(koneksi, id)? {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    let (judul, isi) = validasi_data(data)?;
    if let Some(folder_id) = &data.folder_id {
        pastikan_folder_ada(koneksi, folder_id)?;
    }
    pastikan_tag_diketahui(koneksi, &data.tag_ids)?;

    // PRD C3: keadaan sebelum perubahan disimpan sebagai riwayat, hanya bila isinya benar-benar
    // berubah, supaya menyimpan ulang tanpa edit tidak menggeser riwayat yang berguna.
    // Perbandingan memakai `isi` hasil validasi (sudah di-trim), bukan `data.isi` mentah, karena
    // menambah atau menghapus spasi di ujung tidak layak mencatat versi baru.
    if let Some(lama) = repository::ambil(koneksi, id)? {
        if lama.judul != judul || lama.isi != isi {
            repository::simpan_versi(
                koneksi,
                &Uuid::now_v7().to_string(),
                id,
                &lama.judul,
                &lama.isi,
                sekarang_ms(),
            )?;
        }
    }

    let berubah = repository::perbarui(
        koneksi,
        id,
        &judul,
        &DataPrompt {
            isi,
            ..data.clone()
        },
    )?;
    if berubah == 0 {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    terapkan_tag(koneksi, id, &data.tag_ids, &data.tag_baru)?;
    repository::hapus_draf(koneksi, ID_DRAF_AKTIF)?;

    ambil(koneksi, id)
}

/// Daftar riwayat versi sebuah prompt, terbaru lebih dulu (PRD C3).
pub fn riwayat(koneksi: &Connection, id: &str) -> Hasil<Vec<VersiPrompt>> {
    if !repository::ada(koneksi, id)? {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    repository::daftar_versi(koneksi, id)
}

/// Pulihkan satu versi. Keadaan sebelum pemulihan ikut tercatat sebagai versi baru, jadi
/// tindakan ini sendiri masih bisa dibatalkan dari daftar riwayat.
pub fn pulihkan_versi(koneksi: &Connection, id: &str, versi_id: &str) -> Hasil<PromptTampil> {
    let versi = repository::ambil_versi(koneksi, versi_id)?
        .filter(|v| v.prompt_id == id)
        .ok_or_else(|| GalatAplikasi::tidak_ditemukan("Versi"))?;
    let sekarang = ambil(koneksi, id)?;
    perbarui(
        koneksi,
        id,
        &DataPrompt {
            judul: Some(versi.judul.clone()),
            isi: versi.isi.clone(),
            folder_id: sekarang.folder_id.clone(),
            tag_ids: sekarang.tags.iter().map(|t| t.id.clone()).collect(),
            tag_baru: Vec::new(),
        },
    )
}

/// A4 duplikat prompt. Salinan berdiri sendiri dengan judul "judul (salinan)".
pub fn duplikat(koneksi: &Connection, id: &str) -> Hasil<PromptTampil> {
    let asal = ambil(koneksi, id)?;
    let judul = format!("{} (salinan)", asal.judul);
    let judul = if judul.chars().count() > PANJANG_JUDUL_MAKS {
        judul.chars().take(PANJANG_JUDUL_MAKS).collect()
    } else {
        judul
    };

    let baru = buat(
        koneksi,
        &DataPrompt {
            judul: Some(judul),
            isi: asal.isi,
            folder_id: asal.folder_id,
            tag_ids: asal.tags.iter().map(|tag| tag.id.clone()).collect(),
            tag_baru: vec![],
        },
    )?;
    Ok(baru)
}

pub fn ganti_favorit(koneksi: &Connection, id: &str, aktif: bool) -> Hasil<PromptTampil> {
    ubah_tanda(koneksi, id, KolomTanda::Favorit, aktif)
}

pub fn ganti_disemat(koneksi: &Connection, id: &str, aktif: bool) -> Hasil<PromptTampil> {
    ubah_tanda(koneksi, id, KolomTanda::Disemat, aktif)
}

fn ubah_tanda(
    koneksi: &Connection,
    id: &str,
    kolom: KolomTanda,
    aktif: bool,
) -> Hasil<PromptTampil> {
    if repository::ubah_tanda(koneksi, id, kolom, aktif)? == 0 {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    ambil(koneksi, id)
}

pub fn pindah_folder(
    koneksi: &Connection,
    id: &str,
    folder_id: Option<&str>,
) -> Hasil<PromptTampil> {
    if let Some(id_folder) = folder_id {
        pastikan_folder_ada(koneksi, id_folder)?;
    }
    if repository::pindah_folder(koneksi, id, folder_id)? == 0 {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    ambil(koneksi, id)
}

/// C1 salin cepat. Ditulis sebelum frontend menampilkan umpan balik.
pub fn tandai_dipakai(koneksi: &Connection, id: &str) -> Hasil<()> {
    if repository::tandai_dipakai(koneksi, id)? == 0 {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt"));
    }
    Ok(())
}

pub fn ke_sampah(koneksi: &Connection, id: &str) -> Hasil<usize> {
    repository::pindahkan_ke_sampah(koneksi, &[id.to_string()])
}

pub fn pulihkan(koneksi: &Connection, id: &str) -> Hasil<PromptTampil> {
    if repository::pulihkan(koneksi, id)? == 0 {
        return Err(GalatAplikasi::tidak_ditemukan("Prompt di Sampah"));
    }
    ambil(koneksi, id)
}

pub fn statistik(koneksi: &Connection) -> Hasil<Statistik> {
    repository::statistik(koneksi)
}

pub fn simpan_draf(koneksi: &Connection, data: &DataPrompt) -> Hasil<DrafPrompt> {
    // Draf boleh kosong atau belum valid, fungsinya menyelamatkan ketikan pengguna.
    repository::simpan_draf(koneksi, ID_DRAF_AKTIF, data)?;
    ambil_draf(koneksi)
}

pub fn ambil_draf(koneksi: &Connection) -> Hasil<DrafPrompt> {
    Ok(repository::ambil_draf(koneksi, ID_DRAF_AKTIF)?.unwrap_or_default())
}

pub fn buang_draf(koneksi: &Connection) -> Hasil<()> {
    repository::hapus_draf(koneksi, ID_DRAF_AKTIF)?;
    Ok(())
}

/// Validasi bersama untuk buat dan perbarui.
fn validasi_data(data: &DataPrompt) -> Hasil<(String, String)> {
    let isi = data.isi.trim().to_string();
    if isi.is_empty() {
        return Err(GalatAplikasi::validasi(
            "Isi prompt tidak boleh kosong. Tulis minimal satu kata.",
        ));
    }
    if data.isi.chars().count() > PANJANG_ISI_MAKS {
        return Err(GalatAplikasi::validasi(format!(
            "Isi prompt maksimal {PANJANG_ISI_MAKS} karakter."
        )));
    }

    let judul_mentah = data.judul.clone().unwrap_or_default().trim().to_string();
    let judul = if judul_mentah.is_empty() {
        judul_otomatis(&isi)
    } else {
        if judul_mentah.chars().count() > PANJANG_JUDUL_MAKS {
            return Err(GalatAplikasi::validasi(format!(
                "Judul maksimal {PANJANG_JUDUL_MAKS} karakter."
            )));
        }
        judul_mentah
    };

    Ok((judul, isi))
}

/// Judul otomatis dari 40 karakter pertama isi (PRD A1).
fn judul_otomatis(isi: &str) -> String {
    let rata = isi.split_whitespace().collect::<Vec<_>>().join(" ");
    if rata.chars().count() <= PANJANG_JUDUL_OTOMATIS {
        return rata;
    }
    let potongan: String = rata.chars().take(PANJANG_JUDUL_OTOMATIS).collect();
    let tanpa_sisa = match potongan.rfind(' ') {
        Some(index) if index > 20 => potongan[..index].to_string(),
        _ => potongan,
    };
    format!("{tanpa_sisa}…")
}

fn pastikan_folder_ada(koneksi: &Connection, folder_id: &str) -> Hasil<()> {
    if !crate::features::folders::repository::ada(koneksi, folder_id)? {
        return Err(GalatAplikasi::tidak_ditemukan("Folder"));
    }
    Ok(())
}

fn pastikan_tag_diketahui(koneksi: &Connection, tag_ids: &[String]) -> Hasil<()> {
    let tidak_diketahui = tag_repo::jumlah_yang_tidak_diketahui(koneksi, tag_ids)?;
    if tidak_diketahui > 0 {
        return Err(GalatAplikasi::validasi(
            "Ada tag yang tidak dikenal. Muat ulang lalu coba lagi.",
        ));
    }
    Ok(())
}

/// Pasang keanggotaan tag, termasuk membuat tag baru dari form (PRD B2).
fn terapkan_tag(
    koneksi: &Connection,
    prompt_id: &str,
    tag_ids: &[String],
    tag_baru: &[TagBaru],
) -> Hasil<()> {
    let mut id_final: Vec<String> = tag_ids.to_vec();

    for baru in tag_baru {
        let nama = baru.nama.trim();
        if nama.is_empty() {
            continue;
        }
        // Nama yang sudah ada dipakai ulang, tidak membuat duplikat.
        let tag = match tag_repo::cari_nama(koneksi, nama)? {
            Some(sudah_ada) => sudah_ada,
            None => tag_service::buat(koneksi, nama, baru.warna.as_deref())?,
        };
        if !id_final.contains(&tag.id) {
            id_final.push(tag.id.clone());
        }
    }

    tag_repo::tempel_prompt_tag(koneksi, prompt_id, &id_final)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;
    use crate::features::folders::service as folder_service;

    fn data(isi: &str) -> DataPrompt {
        DataPrompt {
            judul: None,
            isi: isi.to_string(),
            folder_id: None,
            tag_ids: vec![],
            tag_baru: vec![],
        }
    }

    #[test]
    fn isi_kosong_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let galat = buat(&koneksi, &data("   \n  ")).unwrap_err();
        assert_eq!(galat.kode, "validasi");
        assert!(galat.pesan.contains("tidak boleh kosong"));
    }

    /// Kontrak proyeksi daftar yang diandalkan `gunakanSalin` di frontend. Baris daftar sengaja
    /// TIDAK membawa isi penuh: `isi` kosong dan hanya `potongan` yang terisi, supaya daftar panjang
    /// dan Mode Widget tetap ringan. Frontend memakai tanda itu untuk mengambil teks lengkap
    /// sebelum menulis clipboard. Jika suatu hari `isi` ikut dikirim di sini, salinan dari daftar
    /// tetap terlihat benar padahal test ini memberi sinyal bahwa kontraknya berubah.
    #[test]
    fn baris_daftar_hanya_membawa_potongan_bukan_isi_penuh() {
        use crate::features::prompts::model::PANJANG_POTONGAN;

        let koneksi = koneksi_uji().unwrap();
        let panjang = "kalimat panjang untuk menguji potongan isi. ".repeat(6);
        let dibuat = buat(&koneksi, &data(panjang.trim_end())).unwrap();
        // Backend memangkas spasi di ujung, jadi nilai kanonisnya adalah `isi` hasil `buat`.
        let isi_penuh = dibuat.isi.clone();
        assert!(isi_penuh.chars().count() > PANJANG_POTONGAN);

        let baris = daftar(&koneksi, &DaftarFilter::default())
            .unwrap()
            .into_iter()
            .find(|p| p.id == dibuat.id)
            .expect("prompt hasil buat ada di daftar");
        assert_eq!(baris.isi, "", "daftar sengaja mengirim isi kosong");
        let potongan = baris.potongan.clone().expect("daftar mengirim potongan");
        // `buat_potongan` mengambil PANJANG_POTONGAN karakter lalu menambah satu tanda elipsis.
        assert_eq!(potongan.chars().count(), PANJANG_POTONGAN + 1);
        assert!(
            isi_penuh.starts_with(potongan.trim_end_matches('…')),
            "potongan harus awalan isi penuh, bukan teks lain"
        );
        assert_ne!(
            potongan, isi_penuh,
            "potongan harus lebih pendek dari isi penuh"
        );

        let penuh = ambil(&koneksi, &dibuat.id).unwrap();
        assert_eq!(penuh.isi, isi_penuh, "detail membawa isi penuh");
        assert!(
            penuh.potongan.is_none(),
            "detail tidak perlu mengirim potongan"
        );
    }

    #[test]
    fn riwayat_menyimpan_keadaan_sebelum_diubah() {
        let koneksi = koneksi_uji().unwrap();
        awal_riwayat(&koneksi);
    }

    #[test]
    fn riwayat_tidak_bertambah_saat_isi_tidak_berubah() {
        let koneksi = koneksi_uji().unwrap();
        let id = buat(&koneksi, &data("Isi pertama")).unwrap().id;

        perbarui(&koneksi, &id, &data("Isi pertama")).unwrap();

        assert!(riwayat(&koneksi, &id).unwrap().is_empty());
    }

    #[test]
    fn riwayat_abai_perubahan_spasi_di_ujung_isi() {
        let koneksi = koneksi_uji().unwrap();
        let id = buat(&koneksi, &data("Isi pertama")).unwrap().id;

        // Isi ini dipangkas menjadi teks yang sama oleh validasi, jadi tidak layak jadi versi baru.
        perbarui(&koneksi, &id, &data("Isi pertama  \n")).unwrap();

        assert!(
            riwayat(&koneksi, &id).unwrap().is_empty(),
            "menambah spasi di ujung tidak boleh menggeser riwayat"
        );
    }

    #[test]
    fn riwayat_dipangkas_ke_sepuluh_terbaru() {
        let koneksi = koneksi_uji().unwrap();
        let id = buat(&koneksi, &data("v0")).unwrap().id;

        for nomor in 1..=14 {
            perbarui(&koneksi, &id, &data(&format!("v{nomor}"))).unwrap();
        }

        let isi = riwayat(&koneksi, &id).unwrap();
        assert_eq!(isi.len(), 10, "hanya 10 versi terakhir yang disimpan");
        assert_eq!(isi[0].isi, "v13", "terbaru lebih dulu");
        assert_eq!(isi[9].isi, "v4");
    }

    #[test]
    fn pulihkan_versi_mengembalikan_isi_dan_mencatat_keadaan_sekarang() {
        let koneksi = koneksi_uji().unwrap();
        let id = buat(&koneksi, &data("rumus lama")).unwrap().id;
        perbarui(&koneksi, &id, &data("rumus baru")).unwrap();

        let versi = riwayat(&koneksi, &id).unwrap().remove(0);
        let hasil = pulihkan_versi(&koneksi, &id, &versi.id).unwrap();

        assert_eq!(hasil.isi, "rumus lama");
        let sesudah = riwayat(&koneksi, &id).unwrap();
        assert_eq!(
            sesudah[0].isi, "rumus baru",
            "keadaan sebelum pemulihan ikut tercatat"
        );
    }

    #[test]
    fn pulihkan_versi_milik_prompt_lain_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let a = buat(&koneksi, &data("milik a")).unwrap().id;
        let b = buat(&koneksi, &data("milik b")).unwrap().id;
        perbarui(&koneksi, &a, &data("milik a diubah")).unwrap();

        let versi = riwayat(&koneksi, &a).unwrap().remove(0);
        let galat = pulihkan_versi(&koneksi, &b, &versi.id).unwrap_err();

        assert_eq!(galat.kode, "tidak_ditemukan");
    }

    fn awal_riwayat(koneksi: &rusqlite::Connection) -> String {
        let id = buat(koneksi, &data("isi lama")).unwrap().id;
        perbarui(koneksi, &id, &data("isi baru")).unwrap();
        let riwayat = riwayat(koneksi, &id).unwrap();
        assert_eq!(riwayat.len(), 1);
        assert_eq!(riwayat[0].isi, "isi lama");
        assert_eq!(riwayat[0].prompt_id, id);
        id
    }

    #[test]
    fn judul_kosong_diambil_dari_isi() {
        let koneksi = koneksi_uji().unwrap();
        let prompt = buat(
            &koneksi,
            &data("Ringkas jurnal ini menjadi dua paragraf bahasa Indonesia"),
        )
        .unwrap();
        assert_eq!(prompt.judul, "Ringkas jurnal ini menjadi dua paragraf…");
        assert!(prompt.judul.chars().count() <= PANJANG_JUDUL_OTOMATIS + 1);
    }

    #[test]
    fn isi_sangat_panjang_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let panjang = "a".repeat(PANJANG_ISI_MAKS + 1);
        let galat = buat(&koneksi, &data(&panjang)).unwrap_err();
        assert_eq!(galat.kode, "validasi");
    }

    #[test]
    fn simpan_lalu_perbarui_mengubah_waktu() {
        let koneksi = koneksi_uji().unwrap();
        let awal = buat(&koneksi, &data("Prompt pertama")).unwrap();
        let ubah = DataPrompt {
            judul: Some("Judul baru".into()),
            isi: "Prompt pertama diedit".into(),
            ..Default::default()
        };
        let hasil = perbarui(&koneksi, &awal.id, &ubah).unwrap();
        assert_eq!(hasil.judul, "Judul baru");
        assert!(hasil.diubah_pada >= awal.diubah_pada);
    }

    #[test]
    fn folder_palsu_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let salah = DataPrompt {
            folder_id: Some("id-tidak-ada".into()),
            ..data("Isi valid")
        };
        let galat = buat(&koneksi, &salah).unwrap_err();
        assert_eq!(galat.kode, "tidak_ditemukan");
    }

    #[test]
    fn tag_baru_dibuat_dari_form_dan_dipakai_ulang() {
        let koneksi = koneksi_uji().unwrap();
        let dengan_tag = DataPrompt {
            isi: "Isi prompt".into(),
            tag_baru: vec![TagBaru {
                nama: "riset".into(),
                warna: Some("hijau".into()),
            }],
            ..Default::default()
        };
        let pertama = buat(&koneksi, &dengan_tag).unwrap();
        assert_eq!(pertama.tags.len(), 1);

        let kedua = buat(&koneksi, &dengan_tag).unwrap();
        assert_eq!(
            kedua.tags[0].id, pertama.tags[0].id,
            "nama sama memakai tag yang sama"
        );
        assert_eq!(tag_repo::daftar(&koneksi).unwrap().len(), 1);
    }

    #[test]
    fn duplikat_berdiri_sendiri() {
        let koneksi = koneksi_uji().unwrap();
        let asal = buat(&koneksi, &data("Prompt asli")).unwrap();
        let salinan = duplikat(&koneksi, &asal.id).unwrap();
        assert!(salinan.judul.ends_with("(salinan)"));
        assert_ne!(salinan.id, asal.id);
    }

    #[test]
    fn salin_mengisi_pemakaian_terakhir() {
        let koneksi = koneksi_uji().unwrap();
        let prompt = buat(&koneksi, &data("Prompt untuk disalin")).unwrap();
        assert!(prompt.dipakai_terakhir.is_none());
        tandai_dipakai(&koneksi, &prompt.id).unwrap();
        assert!(ambil(&koneksi, &prompt.id)
            .unwrap()
            .dipakai_terakhir
            .is_some());
    }

    #[test]
    fn draf_tersimpan_dan_hilang_setelah_simpan() {
        let koneksi = koneksi_uji().unwrap();
        simpan_draf(&koneksi, &data("Ketikan yang belum disimpan")).unwrap();
        assert_eq!(
            ambil_draf(&koneksi).unwrap().isi,
            "Ketikan yang belum disimpan"
        );
        buat(&koneksi, &data("Prompt jadi")).unwrap();
        assert_eq!(ambil_draf(&koneksi).unwrap().isi, "");
    }

    #[test]
    fn hapus_folder_dengan_pindahkan_tidak_menghapus_prompt() {
        let koneksi = koneksi_uji().unwrap();
        let folder = folder_service::buat(&koneksi, "Riset").unwrap();
        let prompt = buat(
            &koneksi,
            &DataPrompt {
                folder_id: Some(folder.id.clone()),
                ..data("Isi dalam folder")
            },
        )
        .unwrap();
        folder_service::hapus(
            &koneksi,
            &folder.id,
            crate::features::folders::model::AksiHapusFolder::Pindahkan,
        )
        .unwrap();
        assert_eq!(ambil(&koneksi, &prompt.id).unwrap().folder_id, None);
    }
}
