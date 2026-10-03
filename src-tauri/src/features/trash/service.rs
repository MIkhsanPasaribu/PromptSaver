//! Logika bisnis Sampah dan pemulihan (PRD A3).

use rusqlite::Connection;

use crate::core::error::{GalatAplikasi, Hasil};
use crate::features::prompts::model::{DaftarFilter, PromptTampil, UrutanPrompt};
use crate::features::prompts::repository;
use crate::features::prompts::service as service_prompt;

/// Daftar isi Sampah, urutan terbaru yang dihapus lebih dulu.
pub fn daftar(koneksi: &Connection) -> Hasil<Vec<PromptTampil>> {
    repository::daftar(
        koneksi,
        &DaftarFilter {
            hanya_sampah: true,
            urutan: UrutanPrompt::Terbaru,
            batas: Some(1000),
            ..Default::default()
        },
    )
}

pub fn pulihkan(koneksi: &Connection, id: &str) -> Result<PromptTampil, GalatAplikasi> {
    service_prompt::pulihkan(koneksi, id)
}

/// Hapus permanen hanya untuk prompt yang sudah berada di Sampah,
/// supaya tidak ada jalur lain yang bisa menghapus data tanpa soft delete lebih dulu.
pub fn hapus_permanen(koneksi: &Connection, id: &str) -> Hasil<()> {
    let ada = repository::ambil(koneksi, id)?
        .filter(|prompt| prompt.sampah_pada.is_some())
        .is_some();
    if !ada {
        return Err(GalatAplikasi::baru(
            "bukan_di_sampah",
            "Prompt ini tidak ada di Sampah.",
        ));
    }
    repository::hapus_permanen(koneksi, &[id.to_string()])?;
    Ok(())
}

pub fn kosongkan(koneksi: &Connection) -> Hasil<usize> {
    repository::kosongkan_sampah(koneksi)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::database::koneksi_uji;
    use crate::features::prompts::model::DataPrompt;
    use crate::features::prompts::service;

    fn satu(koneksi: &Connection, isi: &str) -> PromptTampil {
        service::buat(
            koneksi,
            &DataPrompt {
                isi: isi.to_string(),
                ..Default::default()
            },
        )
        .unwrap()
    }

    #[test]
    fn prompt_di_sampah_tidak_muncul_di_daftar_biasa() {
        let koneksi = koneksi_uji().unwrap();
        let prompt = satu(&koneksi, "Akan dihapus");
        service::ke_sampah(&koneksi, &prompt.id).unwrap();

        let biasa = service::daftar(&koneksi, &DaftarFilter::default()).unwrap();
        assert!(
            biasa.is_empty(),
            "sampah tidak boleh muncul di daftar biasa"
        );

        let sampah = daftar(&koneksi).unwrap();
        assert_eq!(sampah.len(), 1);
        assert!(sampah[0].sampah_pada.is_some());
    }

    #[test]
    fn pulihkan_mengembalikan_prompt() {
        let koneksi = koneksi_uji().unwrap();
        let prompt = satu(&koneksi, "Pulihkan saya");
        service::ke_sampah(&koneksi, &prompt.id).unwrap();
        pulihkan(&koneksi, &prompt.id).unwrap();

        assert_eq!(
            service::daftar(&koneksi, &DaftarFilter::default())
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn pulihkan_ke_tanpa_folder_bila_folder_sudah_hapus() {
        let koneksi = koneksi_uji().unwrap();
        let folder = crate::features::folders::service::buat(&koneksi, "Sementara").unwrap();
        let prompt = service::buat(
            &koneksi,
            &DataPrompt {
                isi: "Dalam folder".into(),
                folder_id: Some(folder.id.clone()),
                ..Default::default()
            },
        )
        .unwrap();

        service::ke_sampah(&koneksi, &prompt.id).unwrap();
        // Folder dihapus dengan mode "pindahkan", baris prompt masih menunjuk folder lama
        // hanya bila FK tidak ikut dinolkan, jadi kita hapus folder lewat jalur langsung.
        koneksi
            .execute(
                "DELETE FROM folder WHERE id = ?1",
                rusqlite::params![folder.id],
            )
            .unwrap();

        pulihkan(&koneksi, &prompt.id).unwrap();
        let pulih = service::ambil(&koneksi, &prompt.id).unwrap();
        assert_eq!(
            pulih.folder_id, None,
            "pulih ke Tanpa Folder bila folder hilang"
        );
    }

    #[test]
    fn hapus_permanen_menolak_prompt_di_luar_sampah() {
        let koneksi = koneksi_uji().unwrap();
        let prompt = satu(&koneksi, "Masih aktif");
        let galat = hapus_permanen(&koneksi, &prompt.id).unwrap_err();
        assert_eq!(galat.kode, "bukan_di_sampah");
        assert!(service::ambil(&koneksi, &prompt.id).is_ok());
    }

    #[test]
    fn kosongkan_sampah_menghapus_seluruh_isinya() {
        let koneksi = koneksi_uji().unwrap();
        let a = satu(&koneksi, "Satu");
        let b = satu(&koneksi, "Dua");
        service::ke_sampah(&koneksi, &a.id).unwrap();
        service::ke_sampah(&koneksi, &b.id).unwrap();

        assert_eq!(kosongkan(&koneksi).unwrap(), 2);
        assert!(daftar(&koneksi).unwrap().is_empty());
    }
}
