//! State aplikasi yang dibagikan ke seluruh command.
//! Satu koneksi tunggal dijaga Mutex, dipakai bersama oleh jendela utama dan Mode Widget
//! supaya tidak ada koneksi database kedua (PRD Bagian 6 dan Larangan No. 13).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use crate::core::error::{GalatAplikasi, Hasil};

pub struct StateAplikasi {
    koneksi: Mutex<Connection>,
    /// Berkas `.promptsaver` yang dibuka dari pengelola file. Diambil sekali oleh frontend
    /// supaya impor tidak terpicu dua kali saat aplikasi baru dimulai.
    berkas_terbuka: Mutex<Option<String>>,
    /// F4: gerbang kunci layar. Saat true, seluruh command data ditolak dari [`StateAplikasi::db`]
    /// sehingga satu layar PIN sudah cukup untuk menutup akses ke isi koleksi.
    terkunci: AtomicBool,
}

impl StateAplikasi {
    pub fn baru(koneksi: Connection, terkunci: bool) -> Self {
        Self {
            koneksi: Mutex::new(koneksi),
            berkas_terbuka: Mutex::new(None),
            terkunci: AtomicBool::new(terkunci),
        }
    }

    pub fn sedang_terkunci(&self) -> bool {
        self.terkunci.load(Ordering::SeqCst)
    }

    /// Pasang atau lepas gerbang. Hanya fitur kunci yang boleh memanggil ini.
    pub fn set_terkunci(&self, nilai: bool) {
        self.terkunci.store(nilai, Ordering::SeqCst);
    }

    /// Ambil rujukan koneksi. Mutex yang racunnya diambil paksa tetap dipakai karena
    /// SQLite sendiri sudah transaksi-aman; kegagalan hanya terjadi bila proses panic
    /// saat transaksi berjalan, dan transaksi otomatis di-rollback oleh rusqlite.
    ///
    /// Guard dari fungsi ini hidup sampai akhir blok pemanggil, dan Mutex ini tidak
    /// reentrant. Command yang perlu menjalankan lebih dari satu operasi database harus
    /// memakai [`StateAplikasi::dengan_koneksi`], bukan menyimpan guard ini di antara
    /// dua operasi. Menyimpannya adalah penyebab Mode Widget membeku: `masuk_mode_widget`
    /// menahan guard lalu memanggil `simpan_geometri` yang mengunci ulang mutex yang sama,
    /// dan thread utama menunggu dirinya sendiri selamanya.
    ///
    /// Command yang mengembalikan data pengguna tidak boleh memakai [`StateAplikasi::db_tanpa_gerbang`].
    pub fn db(&self) -> Hasil<MutexGuard<'_, Connection>> {
        if self.sedang_terkunci() {
            return Err(GalatAplikasi::baru(
                "terkunci",
                "Aplikasi terkunci. Masukkan PIN untuk membuka.",
            ));
        }
        self.db_tanpa_gerbang()
    }

    /// Jalan pintas khusus fitur kunci: membaca dan menulis baris PIN justru diperlukan saat
    /// aplikasi sedang terkunci. Dipakai hanya oleh `features/kunci`, tidak oleh command data.
    pub fn db_tanpa_gerbang(&self) -> Hasil<MutexGuard<'_, Connection>> {
        match self.koneksi.lock() {
            Ok(jaga) => Ok(jaga),
            Err(_) => Err(GalatAplikasi::baru(
                "database_terkunci",
                "Database tidak dapat diakses. Tutup lalu buka lagi aplikasi ini.",
            )),
        }
    }

    /// Jalankan satu operasi database dengan guard yang dijamin lepas begitu `aksi`
    /// kembali. Pemanggil tidak pernah memegang koneksi, jadi aman memanggil operasi
    /// database berikutnya atau perintah jendela yang memicu peristiwa di thread yang sama.
    pub fn dengan_koneksi<T>(&self, aksi: impl FnOnce(&Connection) -> Hasil<T>) -> Hasil<T> {
        let koneksi = self.db()?;
        aksi(&koneksi)
    }

    /// Versi [`StateAplikasi::dengan_koneksi`] untuk fitur kunci saja.
    pub fn dengan_koneksi_tanpa_gerbang<T>(
        &self,
        aksi: impl FnOnce(&Connection) -> Hasil<T>,
    ) -> Hasil<T> {
        let koneksi = self.db_tanpa_gerbang()?;
        aksi(&koneksi)
    }

    pub fn catat_berkas(&self, path: &str) -> Hasil<()> {
        match self.berkas_terbuka.lock() {
            Ok(mut jaga) => {
                *jaga = Some(path.to_string());
                Ok(())
            }
            Err(_) => Err(GalatAplikasi::baru(
                "state_terkunci",
                "Status aplikasi tidak dapat dibaca. Buka ulang aplikasinya.",
            )),
        }
    }

    /// Ambil dan kosongkan catatan berkas yang dibuka.
    pub fn ambil_berkas(&self) -> Hasil<Option<String>> {
        match self.berkas_terbuka.lock() {
            Ok(mut jaga) => Ok(jaga.take()),
            Err(_) => Err(GalatAplikasi::baru(
                "state_terkunci",
                "Status aplikasi tidak dapat dibaca. Buka ulang aplikasinya.",
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::StateAplikasi;
    use crate::core::database::koneksi_uji;

    #[test]
    fn guard_koneksi_hanya_hidup_selama_aksi_berjalan() {
        let state = StateAplikasi::baru(koneksi_uji().unwrap(), false);

        state.dengan_koneksi(|_| Ok(())).unwrap();
        assert!(
            state.koneksi.try_lock().is_ok(),
            "setelah aksi selesai, koneksi harus bebas dikunci lagi"
        );

        state
            .dengan_koneksi(|_| {
                assert!(
                    state.koneksi.try_lock().is_err(),
                    "selama aksi berjalan, guard harus masih dipegang"
                );
                Ok(())
            })
            .unwrap();
    }

    #[test]
    fn dua_operasi_beruntun_tidak_saling_mengunci() {
        let state = StateAplikasi::baru(koneksi_uji().unwrap(), false);

        // Pola inilah yang dulu membekukan Mode Widget: baca, lalu tulis, dari command yang sama.
        let jumlah = state
            .dengan_koneksi(|k| Ok(k.query_row("select 1", [], |b| b.get::<_, i64>(0))?))
            .map_err(|sebab| sebab.pesan)
            .unwrap();
        let baris = state
            .dengan_koneksi(|k| {
                k.execute("create temp table uji (n integer)", [])?;
                Ok(k.execute("insert into uji (n) values (7)", [])?)
            })
            .map_err(|sebab| sebab.pesan)
            .unwrap();
        assert_eq!(jumlah, 1);
        assert_eq!(baris, 1);
    }

    #[test]
    fn gerbang_kunci_menolak_command_data_tapi_bukan_fitur_kunci() {
        let state = StateAplikasi::baru(koneksi_uji().unwrap(), true);

        let ditolak = state.dengan_koneksi(|_| Ok(())).unwrap_err();
        assert_eq!(ditolak.kode, "terkunci");

        // Layar PIN harus tetap bisa membaca baris kuncinya sendiri.
        assert!(state.dengan_koneksi_tanpa_gerbang(|_| Ok(())).is_ok());

        state.set_terkunci(false);
        assert!(state.dengan_koneksi(|_| Ok(())).is_ok());
    }
}
