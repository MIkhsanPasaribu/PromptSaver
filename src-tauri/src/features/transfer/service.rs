//! Logika bisnis ekspor dan impor. Impor berjalan dalam satu transaksi dan
//! rollback penuh bila gagal di tengah (AGENTS.md Bagian 5).

use std::path::Path;

use rusqlite::Connection;

use crate::core::database::sekarang_ms;
use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::prompts::model::PANJANG_JUDUL_MAKS;
use crate::features::transfer::format::{self, BerkasEkspor, EKSTENSI_BERKAS};
use crate::features::transfer::model::{
    CakupanEkspor, EksporPrompt, IsiEkspor, PratinjauImpor, RingkasanEkspor, RingkasanImpor,
    StrategiKonflik,
};
use crate::features::transfer::repository;

/// Nama folder tukar berkas di dalam direktori data aplikasi.
const NAMA_FOLDER_EKSPOR: &str = "ekspor";

/// Susun berkas ekspor di memori tanpa menyentuh disk. `ekspor` menulisnya ke path pilihan
/// pengguna (desktop), `ekspor_ke_folder` menulisnya ke folder tukar (mobile), dan pemanggil
/// lain bisa memakai teks hasilnya tanpa menulis disk sama sekali (PRD D1).
pub fn susun(
    koneksi: &Connection,
    cakupan: CakupanEkspor,
    ids: &[String],
) -> Hasil<(BerkasEkspor, String)> {
    let id_prompt = resolusi_id_prompt(koneksi, cakupan, ids)?;
    let prompt = match cakupan {
        CakupanEkspor::Semua => repository::daftar_prompt(koneksi, None)?,
        CakupanEkspor::Pilihan => repository::daftar_prompt(koneksi, Some(&id_prompt))?,
    };

    if prompt.is_empty() {
        return Err(GalatAplikasi::baru(
            "tidak_ada_yang_dipilih",
            "Tidak ada prompt untuk diekspor. Pilih minimal satu prompt.",
        ));
    }

    // Folder dan tag ikut hanya yang dipakai prompt terpilih, kecuali cakupan semua.
    let folder_needed: Vec<String> = prompt.iter().filter_map(|p| p.folder_id.clone()).collect();
    let tag_needed: Vec<String> = prompt
        .iter()
        .flat_map(|p| p.tags.iter().map(|t| t.id.clone()))
        .collect();

    let semua_folder = repository::daftar_folder(koneksi)?;
    let semua_tag = repository::daftar_tag(koneksi)?;
    let folders = match cakupan {
        CakupanEkspor::Semua => semua_folder,
        CakupanEkspor::Pilihan => semua_folder
            .into_iter()
            .filter(|f| folder_needed.contains(&f.id))
            .collect(),
    };
    let tags = match cakupan {
        CakupanEkspor::Semua => semua_tag,
        CakupanEkspor::Pilihan => semua_tag
            .into_iter()
            .filter(|t| tag_needed.contains(&t.id))
            .collect(),
    };

    let data = IsiEkspor {
        folders,
        tags,
        prompts: prompt
            .iter()
            .map(|p| EksporPrompt {
                id: p.id.clone(),
                judul: p.judul.clone(),
                isi: p.isi.clone(),
                folder_id: p.folder_id.clone(),
                tag_ids: p.tags.iter().map(|t| t.id.clone()).collect(),
                favorit: p.favorit,
                disemat: p.disemat,
                dibuat_pada: p.dibuat_pada,
                diubah_pada: p.diubah_pada,
                dipakai_terakhir: p.dipakai_terakhir,
                sampah_pada: p.sampah_pada,
            })
            .collect(),
    };

    let berkas = BerkasEkspor::baru(data, sekarang_ms())?;
    let teks = berkas.serialisasi()?;

    Ok((berkas, teks))
}

pub fn ringkasan(berkas: &BerkasEkspor, ukuran_byte: usize, lokasi: &str) -> RingkasanEkspor {
    RingkasanEkspor {
        jumlah_prompt: berkas.data.prompts.len(),
        jumlah_folder: berkas.data.folders.len(),
        jumlah_tag: berkas.data.tags.len(),
        ukuran_byte,
        lokasi: lokasi.to_string(),
    }
}

/// Ekspor ke path absolut. Jalur desktop: dialog OS mengembalikan path nyata sehingga Rust
/// yang menulis berkasnya dan isi prompt tidak pernah keluar ke lapisan frontend.
pub fn ekspor(
    koneksi: &Connection,
    path: &str,
    cakupan: CakupanEkspor,
    ids: &[String],
) -> Hasil<RingkasanEkspor> {
    let (berkas, teks) = susun(koneksi, cakupan, ids)?;
    std::fs::write(Path::new(path), teks.as_bytes())?;
    Ok(ringkasan(&berkas, teks.len(), path))
}

/// Direktori tukar berkas milik aplikasi. `dir_data` dipakai sebagai tempat transit berkas yang
/// datang lewat "Bagikan/Open with" (Activity Android menyalin URI content ke sana), sedangkan
/// `dir_tukar` adalah folder yang ditulis ekspor dan bisa dijangkau pengguna dari luar aplikasi.
/// Lihat `crate::core::paths::dir_tukar` untuk alasan keduanya terpisah di Android.
pub fn folder_ekspor(dasar: &Path) -> Hasil<std::path::PathBuf> {
    let folder = dasar.join(NAMA_FOLDER_EKSPOR);
    std::fs::create_dir_all(&folder)?;
    Ok(folder)
}

/// Folder yang ikut dihitung saat menampilkan dan membersihkan berkas tukar. Di Android ada dua
/// (eksternal milik aplikasi + transit privat); di desktop `dir_tukar` sama dengan `dir_data`,
/// jadi satu folder saja yang dipakai dan tidak ada berkas yang dihitung dua kali.
fn daftar_folder_tukar(dasar_utama: &Path, dasar_transit: &Path) -> Hasil<Vec<std::path::PathBuf>> {
    let utama = folder_ekspor(dasar_utama)?;
    let transit = folder_ekspor(dasar_transit)?;
    if transit == utama {
        return Ok(vec![utama]);
    }
    Ok(vec![utama, transit])
}

/// Kosongkan seluruh folder tukar tanpa menghapus foldernya (PRD F3).
pub fn kosongkan_folder_ekspor(dasar_utama: &Path, dasar_transit: &Path) -> Hasil<usize> {
    let mut jumlah = 0;
    for folder in daftar_folder_tukar(dasar_utama, dasar_transit)? {
        jumlah += crate::core::paths::hapus_isi_folder(&folder)?;
    }
    Ok(jumlah)
}

/// Nama berkas berekstensi ekspor di folder tukar, terbaru lebih dulu. Path lengkap
/// dikembalikan supaya frontend bisa meneruskannya ke command berbasis path yang sudah ada.
/// `folder` pada hasil adalah folder tempat pengguna menaruh dan mengambil berkas.
pub fn daftar_berkas_ekspor(
    dasar_utama: &Path,
    dasar_transit: &Path,
) -> Hasil<(String, Vec<String>)> {
    let folder = folder_ekspor(dasar_utama)?;
    let mut kumpul = Vec::new();
    for dasar in daftar_folder_tukar(dasar_utama, dasar_transit)? {
        kumpul.extend(crate::core::paths::kumpulkan_berkas(
            &dasar,
            format::EKSTENSI_BERKAS,
        )?);
    }
    kumpul.sort_by_key(|(_, diubah_pada, _)| std::cmp::Reverse(*diubah_pada));
    Ok((
        folder.to_string_lossy().into_owned(),
        kumpul
            .into_iter()
            .map(|(jalur, _, _)| jalur.to_string_lossy().into_owned())
            .collect(),
    ))
}

/// Ekspor ke folder tukar yang bisa dijangkau pengguna. Di Android inilah satu-satunya cara
/// koleksi keluar dari perangkat, karena dialog simpan WebView tidak tersedia di sana.
pub fn ekspor_ke_folder(
    koneksi: &Connection,
    dasar: &Path,
    cakupan: CakupanEkspor,
    ids: &[String],
) -> Hasil<RingkasanEkspor> {
    let (berkas, teks) = susun(koneksi, cakupan, ids)?;
    let jalur = folder_ekspor(dasar)?.join(nama_berkas_baku());
    std::fs::write(&jalur, teks.as_bytes())?;
    Ok(ringkasan(&berkas, teks.len(), &jalur.to_string_lossy()))
}

/// Baca dan validasi berkas tanpa menulis apa pun ke database.
pub fn pratinjau(koneksi: &Connection, path: &str) -> Hasil<PratinjauImpor> {
    let (berkas, ukuran) = baca_berkas(path)?;
    pratinjau_berkas(koneksi, &berkas, ukuran)
}

fn pratinjau_berkas(
    koneksi: &Connection,
    berkas: &BerkasEkspor,
    ukuran: usize,
) -> Hasil<PratinjauImpor> {
    format::validasi(berkas)?;

    let mut bentrok = 0;
    for prompt in &berkas.data.prompts {
        if repository::prompt_ada(koneksi, &prompt.id)? {
            bentrok += 1;
        }
    }

    Ok(PratinjauImpor {
        jumlah_prompt: berkas.data.prompts.len(),
        jumlah_folder: berkas.data.folders.len(),
        jumlah_tag: berkas.data.tags.len(),
        bentrok,
        versi_skema: berkas.schema_version,
        ukuran_byte: ukuran,
    })
}

pub fn baca_berkas(path: &str) -> Hasil<(BerkasEkspor, usize)> {
    let bytes = std::fs::read(Path::new(path))?;
    baca_bytes(&bytes)
}

/// Pratinjau dari isi berkas yang sudah dibacakan lapisan web. Pemilih berkas WebView Android
/// memberi isinya, bukan path yang bisa dibuka `std::fs`, jadi jalur ini ada di samping
/// `pratinjau`. Validasi ukuran, checksum, dan versi skema tetap dijaga `baca_bytes`.
pub fn pratinjau_teks(koneksi: &Connection, teks: &str) -> Hasil<PratinjauImpor> {
    let (berkas, ukuran) = baca_bytes(teks.as_bytes())?;
    pratinjau_berkas(koneksi, &berkas, ukuran)
}

/// Impor atomik dari isi berkas yang sudah dibacakan lapisan web.
pub fn impor_teks(
    koneksi: &Connection,
    teks: &str,
    strategi: StrategiKonflik,
) -> Hasil<RingkasanImpor> {
    let (berkas, _) = baca_bytes(teks.as_bytes())?;
    jalankan_impor(koneksi, &berkas, strategi)
}

fn baca_bytes(bytes: &[u8]) -> Hasil<(BerkasEkspor, usize)> {
    if bytes.len() > format::UKURAN_BERKAS_MAKS {
        return Err(GalatAplikasi::baru(
            "terlalu_besar",
            format!(
                "Berkas melebihi batas {} MB.",
                format::UKURAN_BERKAS_MAKS / 1024 / 1024
            ),
        ));
    }
    let teks = String::from_utf8(bytes.to_vec())
        .map_err(|_| GalatAplikasi::baru("berkas_rusak", "Berkas bukan teks UTF-8 yang valid."))?;
    let berkas: BerkasEkspor = serde_json::from_str(&teks).map_err(|_| {
        GalatAplikasi::baru(
            "berkas_rusak",
            "Berkas tidak dapat dibaca. Pastikan ini file ekspor PromptSaver yang lengkap.",
        )
    })?;
    Ok((berkas, bytes.len()))
}

/// Impor atomik. Semua atau tidak sama sekali.
pub fn impor(koneksi: &Connection, path: &str, strategi: StrategiKonflik) -> Hasil<RingkasanImpor> {
    let (berkas, _) = baca_berkas(path)?;
    jalankan_impor(koneksi, &berkas, strategi)
}

fn jalankan_impor(
    koneksi: &Connection,
    berkas: &BerkasEkspor,
    strategi: StrategiKonflik,
) -> Hasil<RingkasanImpor> {
    format::validasi(berkas)?;
    repository::dalam_transaksi(koneksi, |isi| impor_dalam_transaksi(isi, berkas, strategi))
}

fn impor_dalam_transaksi(
    koneksi: &Connection,
    berkas: &BerkasEkspor,
    strategi: StrategiKonflik,
) -> Hasil<RingkasanImpor> {
    let mut ringkasan = RingkasanImpor::default();

    for folder in &berkas.data.folders {
        repository::simpan_folder(koneksi, folder)?;
    }

    for tag in &berkas.data.tags {
        repository::simpan_tag(koneksi, tag)?;
    }

    for prompt in &berkas.data.prompts {
        let sudah_ada = repository::prompt_ada(koneksi, &prompt.id)?;
        if sudah_ada {
            match strategi {
                StrategiKonflik::LewatiDuplikat => {
                    ringkasan.dilewati += 1;
                    continue;
                }
                StrategiKonflik::TimpaJikaLebihBaru => {
                    let waktu_lama = repository::waktu_prompt(koneksi, &prompt.id)?;
                    let lebih_baru = waktu_lama.map(|w| prompt.diubah_pada > w).unwrap_or(true);
                    if !lebih_baru {
                        ringkasan.dilewati += 1;
                        continue;
                    }
                    repository::simpan_prompt(koneksi, prompt)?;
                    repository::tempel_tag(koneksi, &prompt.id, &prompt.tag_ids)?;
                    ringkasan.ditimpa += 1;
                    continue;
                }
                StrategiKonflik::SimpanSebagaiSalinan => {
                    let salinan = buat_salinan(prompt);
                    repository::simpan_prompt(koneksi, &salinan)?;
                    repository::tempel_tag(koneksi, &salinan.id, &salinan.tag_ids)?;
                    ringkasan.ditambah += 1;
                    continue;
                }
            }
        }

        repository::simpan_prompt(koneksi, prompt)?;
        repository::tempel_tag(koneksi, &prompt.id, &prompt.tag_ids)?;
        ringkasan.ditambah += 1;
    }

    Ok(ringkasan)
}

fn buat_salinan(prompt: &EksporPrompt) -> EksporPrompt {
    let judul = if prompt.judul.is_empty() {
        String::new()
    } else {
        let usang = format!("{} (salinan)", prompt.judul);
        if usang.chars().count() > PANJANG_JUDUL_MAKS {
            usang.chars().take(PANJANG_JUDUL_MAKS).collect()
        } else {
            usang
        }
    };

    EksporPrompt {
        id: repository::id_baru(),
        judul,
        dibuat_pada: repository::waktu_sekarang(),
        diubah_pada: repository::waktu_sekarang(),
        sampah_pada: None,
        ..prompt.clone()
    }
}

/// Peta id folder atau prompt pilihan pengguna menjadi daftar id prompt.
fn resolusi_id_prompt(
    koneksi: &Connection,
    cakupan: CakupanEkspor,
    ids: &[String],
) -> Hasil<Vec<String>> {
    if cakupan == CakupanEkspor::Semua {
        return Ok(Vec::new());
    }

    let semua_prompt = repository::daftar_prompt(koneksi, None)?;
    let mut hasil: Vec<String> = Vec::new();

    for id in ids {
        if semua_prompt.iter().any(|p| &p.id == id) {
            if !hasil.contains(id) {
                hasil.push(id.clone());
            }
            continue;
        }
        if crate::features::folders::repository::ada(koneksi, id)? {
            for prompt in semua_prompt
                .iter()
                .filter(|p| p.folder_id.as_deref() == Some(id))
            {
                if !hasil.contains(&prompt.id) {
                    hasil.push(prompt.id.clone());
                }
            }
            continue;
        }
        return Err(GalatAplikasi::baru(
            "pilihan_tidak_dikenal",
            format!("Item {id} tidak lagi ada. Muat ulang daftar lalu pilih lagi."),
        ));
    }

    Ok(hasil)
}

/// Nama berkas bawaan untuk satu hari, misalnya
/// `koleksi-promptsaver-2026-10-01.promptsaver`. Ekstensi diambil dari satu sumber skema.
pub fn nama_berkas_baku() -> String {
    let hari = sekarang_ms().div_euclid(86_400_000);
    let (tahun, bulan, tanggal) = tanggal_from_hari_epoch(hari);
    format!(
        "koleksi-promptsaver-{tahun:04}-{bulan:02}-{tanggal:02}.{}",
        EKSTENSI_BERKAS
    )
}

/// Konversi hari-sejak-epoch ke tanggal kalender (algoritma civil_from_days, domain publik).
/// Dipakai juga oleh fitur cadangan supaya perhitungan tanggalnya satu sumber.
pub(crate) fn tanggal_from_hari_epoch(hari: i64) -> (i64, u32, u32) {
    let z = hari + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let hari_dalam_bulan = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let bulan = if mp < 10 { mp + 3 } else { mp - 9 }; // [1, 12]
    let tahun = if bulan <= 2 { y + 1 } else { y };
    (
        tahun,
        bulan.unsigned_abs() as u32,
        hari_dalam_bulan.unsigned_abs() as u32,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::{koneksi_uji, sekarang_ms};
    use crate::features::folders::service as folder_service;
    use crate::features::prompts::model::DataPrompt;
    use crate::features::prompts::service as prompt_service;
    use crate::features::tags::service as tag_service;
    use crate::features::transfer::model::EksporFolder;
    use std::path::PathBuf;

    fn jalur_uji(nama: &str) -> PathBuf {
        let mut jalur = std::env::temp_dir();
        jalur.push(format!(
            "promptsaver-uji-{}-{nama}.promptsaver",
            std::process::id()
        ));
        jalur
    }

    /// Koleksi contoh: satu folder, dua tag, dua prompt aktif, satu prompt di Sampah.
    fn isi_koleksi(koneksi: &Connection) -> Vec<String> {
        let folder = folder_service::buat(koneksi, "Riset").unwrap();
        let tag_a = tag_service::buat(koneksi, "akademik", Some("hijau")).unwrap();
        tag_service::buat(koneksi, "ringkas", None).unwrap();
        prompt_service::buat(
            koneksi,
            &DataPrompt {
                judul: Some("Ringkas jurnal".into()),
                isi: "Ringkas jurnal penelitian ini.".into(),
                folder_id: Some(folder.id.clone()),
                tag_ids: vec![tag_a.id.clone()],
                tag_baru: vec![],
            },
        )
        .unwrap();
        let kedua = prompt_service::buat(
            koneksi,
            &DataPrompt {
                isi: "Terjemahkan teks berikut.".into(),
                ..Default::default()
            },
        )
        .unwrap();
        prompt_service::ke_sampah(koneksi, &kedua.id).unwrap();
        vec![folder.id, tag_a.id, kedua.id]
    }

    #[test]
    fn ekspor_lalu_impor_ke_database_kosong_menghasilkan_koleksi_sama() {
        let asal = koneksi_uji().unwrap();
        isi_koleksi(&asal);
        let jalur = jalur_uji("bundar");

        let ringkasan = ekspor(&asal, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();
        assert_eq!(
            ringkasan.jumlah_prompt, 2,
            "prompt aktif dan yang di Sampah ikut terekspor"
        );
        assert_eq!(ringkasan.jumlah_folder, 1);
        assert_eq!(ringkasan.jumlah_tag, 2);

        let tujuan = koneksi_uji().unwrap();
        let hasil = impor(
            &tujuan,
            &jalus_to_str(&jalur),
            StrategiKonflik::LewatiDuplikat,
        )
        .unwrap();
        assert_eq!(hasil.ditambah, 2);
        assert_eq!(hasil.dilewati, 0);
        assert_eq!(hasil.gagal, 0);

        let masuk = prompt_service::daftar(&tujuan, &Default::default()).unwrap();
        assert_eq!(masuk.len(), 1, "hanya prompt aktif yang masuk daftar biasa");
        assert!(masuk.iter().any(|p| p.favorit || !p.tags.is_empty()));
        assert_eq!(
            crate::features::trash::service::daftar(&tujuan)
                .unwrap()
                .len(),
            1,
            "status Sampah ikut berpindah"
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn ekspor_pilihan_hanya_mengikutkan_folder_dan_tag_terpakai() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("pilihan");
        let target = prompt_service::daftar(&koneksi, &Default::default())
            .unwrap()
            .into_iter()
            .find(|p| p.folder_id.is_some())
            .unwrap();

        let ringkasan = ekspor(
            &koneksi,
            &jalus_to_str(&jalur),
            CakupanEkspor::Pilihan,
            std::slice::from_ref(&target.id),
        )
        .unwrap();
        assert_eq!(ringkasan.jumlah_prompt, 1);
        assert_eq!(ringkasan.jumlah_folder, 1);
        assert_eq!(ringkasan.jumlah_tag, 1);
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn ekspor_tanpa_prompt_terpilih_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        let jalur = jalur_uji("kosong");
        let galat =
            ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Pilihan, &[]).unwrap_err();
        assert_eq!(galat.kode, "tidak_ada_yang_dipilih");
    }

    #[test]
    fn impor_berturut_turut_dengan_lewati_duplikat() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("duplikat");
        ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();

        let hasil = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::LewatiDuplikat,
        )
        .unwrap();
        assert_eq!(hasil.ditambah, 0);
        assert_eq!(hasil.dilewati, 2);
        assert_eq!(
            prompt_service::daftar(&koneksi, &Default::default())
                .unwrap()
                .len(),
            1
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn impor_dengan_simpan_sebagai_salinan_menambah_entri_baru() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("salinan");
        ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();

        let hasil = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::SimpanSebagaiSalinan,
        )
        .unwrap();
        assert_eq!(hasil.ditambah, 2);
        assert_eq!(
            prompt_service::daftar(&koneksi, &Default::default())
                .unwrap()
                .len(),
            3,
            "satu aktif + dua salinan, salinan dari Sampah tetap di Sampah"
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn impor_dengan_timpa_hanya_bila_lebih_baru() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("timpa");
        ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();

        // Ubah satu prompt lokal menjadi lebih baru daripada isi berkas.
        // Daftar memakai view ringan tanpa isi, jadi isi penuh diambil lewat ambil.
        let ringkas = prompt_service::daftar(&koneksi, &Default::default())
            .unwrap()
            .remove(0);
        let target = prompt_service::ambil(&koneksi, &ringkas.id).unwrap();
        prompt_service::perbarui(
            &koneksi,
            &target.id,
            &DataPrompt {
                judul: Some("Versi lokal terbaru".into()),
                isi: target.isi.clone(),
                folder_id: target.folder_id.clone(),
                tag_ids: target.tags.iter().map(|t| t.id.clone()).collect(),
                tag_baru: vec![],
            },
        )
        .unwrap();

        let hasil = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::TimpaJikaLebihBaru,
        )
        .unwrap();
        let sesudah = prompt_service::ambil(&koneksi, &target.id).unwrap();
        assert!(hasil.dilewati >= 1);
        assert_eq!(
            sesudah.judul, "Versi lokal terbaru",
            "versi lokal lebih baru jangan ditimpa"
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn berkas_bukan_json_ditolak_tanpa_mengubah_database() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("sampah-byte");
        std::fs::write(&jalur, b"bukan json sama sekali").unwrap();

        let galat = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::LewatiDuplikat,
        )
        .unwrap_err();
        assert_eq!(galat.kode, "berkas_rusak");
        assert_eq!(
            prompt_service::daftar(&koneksi, &Default::default())
                .unwrap()
                .len(),
            1
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn checksum_yang_diubah_ditolak() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("checksum");
        ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();

        let teks = std::fs::read_to_string(&jalur).unwrap();
        let diubah = teks.replace("penelitian", "perubahan");
        std::fs::write(&jalur, diubah).unwrap();

        let galat = pratinjau(&koneksi, &jalus_to_str(&jalur)).unwrap_err();
        assert_eq!(galat.kode, "checksum_beda");
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn versi_skema_lebih_baru_ditolak_dengan_pesan_spesifik() {
        let koneksi = koneksi_uji().unwrap();
        isi_koleksi(&koneksi);
        let jalur = jalur_uji("versi");
        ekspor(&koneksi, &jalus_to_str(&jalur), CakupanEkspor::Semua, &[]).unwrap();

        let teks = std::fs::read_to_string(&jalur)
            .unwrap()
            .replace("\"schemaVersion\":1", "\"schemaVersion\":99")
            .replace("\"schemaVersion\": 1", "\"schemaVersion\": 99");
        std::fs::write(&jalur, teks).unwrap();

        let galat = pratinjau(&koneksi, &jalus_to_str(&jalur)).unwrap_err();
        assert_eq!(galat.kode, "versi_lebih_baru");
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn impor_gagal_di_tengah_digulung_penuh() {
        // Dua folder dengan nama yang sama secara case-insensitive lolos validasi berkas
        // tetapi ditolak UNIQUE database. Impor harus tidak meninggalkan satu baris pun.
        let koneksi = koneksi_uji().unwrap();
        let data = IsiEkspor {
            folders: vec![
                EksporFolder {
                    id: "f-a".into(),
                    nama: "Kerja".into(),
                    dibuat_pada: sekarang_ms(),
                    diubah_pada: sekarang_ms(),
                },
                EksporFolder {
                    id: "f-b".into(),
                    nama: "kerja".into(),
                    dibuat_pada: sekarang_ms(),
                    diubah_pada: sekarang_ms(),
                },
            ],
            tags: vec![],
            prompts: vec![],
        };
        let berkas = BerkasEkspor::baru(data, sekarang_ms()).unwrap();
        let jalur = jalur_uji("rollback");
        std::fs::write(&jalur, berkas.serialisasi().unwrap()).unwrap();

        let galat = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::LewatiDuplikat,
        )
        .unwrap_err();
        assert_eq!(galat.kode, "konflik");
        assert!(
            folder_service::daftar(&koneksi).unwrap().is_empty(),
            "impor gagal tidak boleh meninggalkan folder"
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn fixture_v1_selalu_bisa_diimpor() {
        // Uji regresi kompatibilitas berkas antarversi (AGENTS.md Bagian 6).
        let koneksi = koneksi_uji().unwrap();
        let isi_file = include_str!("../../../database/fixtures/v1_sederhana.promptsaver");
        let jalur = jalur_uji("fixture-v1");
        std::fs::write(&jalur, isi_file).unwrap();

        let pratinjau = pratinjau(&koneksi, &jalus_to_str(&jalur)).unwrap();
        assert_eq!(pratinjau.jumlah_prompt, 3);
        assert_eq!(pratinjau.jumlah_folder, 1);
        assert_eq!(pratinjau.versi_skema, 1);
        assert_eq!(pratinjau.bentrok, 0);

        let hasil = impor(
            &koneksi,
            &jalus_to_str(&jalur),
            StrategiKonflik::LewatiDuplikat,
        )
        .unwrap();
        assert_eq!(hasil.ditambah, 3);
        assert_eq!(hasil.gagal, 0);

        let masuk = prompt_service::daftar(&koneksi, &Default::default()).unwrap();
        assert_eq!(masuk.len(), 2, "fixture berisi dua prompt aktif");
        assert!(masuk
            .iter()
            .any(|p| p.judul == "Ringkas jurnal" && p.favorit));
        assert_eq!(
            crate::features::folders::service::daftar(&koneksi)
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            crate::features::tags::service::daftar(&koneksi)
                .unwrap()
                .len(),
            2
        );
        let _ = std::fs::remove_file(&jalur);
    }

    #[test]
    fn ekspor_ke_folder_lalu_diimpor_menghasilkan_koleksi_sama() {
        let asal = koneksi_uji().unwrap();
        isi_koleksi(&asal);
        let dir = crate::core::paths::dir_uji("tukar");

        let ringkasan = ekspor_ke_folder(&asal, &dir, CakupanEkspor::Semua, &[]).unwrap();
        assert!(
            ringkasan.lokasi.ends_with(&format!(
                ".{}",
                crate::features::transfer::format::EKSTENSI_BERKAS
            )),
            "lokasi hasil ekspor memakai ekstensi kontrak"
        );
        assert!(std::path::Path::new(&ringkasan.lokasi).exists());

        let (folder, berkas) = daftar_berkas_ekspor(&dir, &dir).unwrap();
        assert_eq!(berkas, vec![ringkasan.lokasi.clone()]);
        assert!(folder.ends_with("ekspor"));

        let tujuan = koneksi_uji().unwrap();
        let hasil = impor(&tujuan, &berkas[0], StrategiKonflik::LewatiDuplikat).unwrap();
        assert_eq!(hasil.ditambah, 2);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn daftar_berkas_ekspor_abai_berkas_berekstensi_lain() {
        let dir = crate::core::paths::dir_uji("penyaring");
        let folder = folder_ekspor(&dir).unwrap();
        std::fs::write(folder.join("catatan.txt"), b"x").unwrap();
        std::fs::write(
            folder.join(format!(
                "cadangan.{}",
                crate::features::transfer::format::EKSTENSI_BERKAS
            )),
            br#"{"format":"promptsaver"}"#,
        )
        .unwrap();

        let (_, berkas) = daftar_berkas_ekspor(&dir, &dir).unwrap();
        assert_eq!(berkas.len(), 1, "hanya berkas ekspor yang dihitung");
        assert!(berkas[0].ends_with("cadangan.promptsaver"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn pratinjau_dan_impor_dari_teks_memakai_validasi_yang_sama() {
        // Jalur pemilih berkas WebView: isi berkas datang sebagai teks, bukan path.
        let asal = koneksi_uji().unwrap();
        isi_koleksi(&asal);
        let (_, teks) = susun(&asal, CakupanEkspor::Semua, &[]).unwrap();

        let tujuan = koneksi_uji().unwrap();
        let pratinjau = pratinjau_teks(&tujuan, &teks).unwrap();
        assert_eq!(pratinjau.jumlah_prompt, 2);
        assert_eq!(pratinjau.versi_skema, format::VERSI_SKEMA_BERKAS);

        let hasil = impor_teks(&tujuan, &teks, StrategiKonflik::LewatiDuplikat).unwrap();
        assert_eq!(hasil.ditambah, 2);

        let galat = pratinjau_teks(&tujuan, "bukan json").unwrap_err();
        assert_eq!(galat.kode, "berkas_rusak");
        assert_eq!(
            prompt_service::daftar(&tujuan, &Default::default())
                .unwrap()
                .len(),
            1,
            "teks yang ditolak tidak mengubah koleksi yang sudah masuk (satu prompt aktif)"
        );
    }

    #[test]
    fn folder_tukar_dan_transit_dihitung_terpisah_dan_tanpa_duplikasi() {
        // Dua basis berbeda adalah keadaan Android (eksternal + privat); satu basis adalah desktop.
        let utama = crate::core::paths::dir_uji("tukar-utama");
        let transit = crate::core::paths::dir_uji("tukar-transit");
        std::fs::write(folder_ekspor(&utama).unwrap().join("a.promptsaver"), b"x").unwrap();
        std::fs::write(folder_ekspor(&transit).unwrap().join("b.promptsaver"), b"x").unwrap();

        let (folder, berkas) = daftar_berkas_ekspor(&utama, &transit).unwrap();
        assert_eq!(
            berkas.len(),
            2,
            "berkas transit dari \"Bagikan\" harus tetap terlihat"
        );
        assert_eq!(folder, folder_ekspor(&utama).unwrap().to_string_lossy());

        let (_, sendiri) = daftar_berkas_ekspor(&utama, &utama).unwrap();
        assert_eq!(sendiri.len(), 1, "basis yang sama tidak dihitung dua kali");

        assert_eq!(kosongkan_folder_ekspor(&utama, &transit).unwrap(), 2);
        assert!(daftar_berkas_ekspor(&utama, &transit).unwrap().1.is_empty());
        let _ = std::fs::remove_dir_all(&utama);
        let _ = std::fs::remove_dir_all(&transit);
    }

    fn jalus_to_str(jalur: &std::path::Path) -> String {
        jalur.to_string_lossy().to_string()
    }
}
