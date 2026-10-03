import { panggil } from "@/lib/ipc";
import type { Tema } from "@/features/settings";
import type { Bahasa } from "@/lib/i18n";

/** Keadaan kunci yang dibaca frontend. `tema`, `bahasa`, dan `kurangiAnimasi` ikut dikirim karena
   layar kunci harus tetap memakai preferensi pengguna sementara command pengaturan dibekukan. */
export type StatusKunci = {
  aktif: boolean;
  terkunci: boolean;
  blokirSisa: number;
  jedaDetik: number;
  /** Hanya true di Android dengan sensor yang sudah terdaftar; desktop selalu false. */
  biometrikTersedia: boolean;
  bahasa: Bahasa;
  tema: Tema;
  kurangiAnimasi: boolean;
};

/** Pilihan jeda kunci otomatis yang tampil sebagai chip. Semua nilai ada dalam rentang yang
   diterima backend (0..3600 detik); backend tetap yang memvalidasi. */
export const DAFTAR_JEDA = [0, 15, 30, 60, 120, 300, 900];

export const statusKunci = () => panggil<StatusKunci>("status_kunci");

export const bukaKunci = (pin: string) => panggil<StatusKunci>("buka_kunci", { pin });

/** Verifikasi sidik jari berjalan di Rust; frontend hanya meminta dialog dan menerima hasilnya. */
export const bukaKunciBiometrik = () => panggil<StatusKunci>("buka_kunci_biometrik");

export const pasangKunci = (pin: string, jedaDetik: number) =>
  panggil<StatusKunci>("setel_kunci", { pin, jedaDetik });

export const gantiPinKunci = (pinLama: string, pinBaru: string) =>
  panggil<StatusKunci>("ganti_pin_kunci", { pinLama, pinBaru });

export const ubahJedaKunci = (jedaDetik: number) =>
  panggil<StatusKunci>("ubah_jeda_kunci", { jedaDetik });

export const lepasKunci = (pin: string) => panggil<StatusKunci>("hapus_kunci", { pin });

/** Pasang gerbang sekarang juga. Di mobile dipanggil saat aplikasi pindah ke latar. */
export const kunciSekarang = () => panggil<void>("kunci_sekarang");
