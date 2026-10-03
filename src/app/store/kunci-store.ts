import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";

import {
  bukaKunci,
  bukaKunciBiometrik,
  gantiPinKunci,
  kunciSekarang,
  lepasKunci,
  pasangKunci,
  statusKunci,
  ubahJedaKunci,
  type StatusKunci,
} from "@/features/kunci/services/kunci-service";
import { deteksiPlatform } from "@/features/widget/services/widget-service";
import { terapkanKeDom } from "@/app/store/pengaturan-store";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

type KeadaanKunci = {
  status: StatusKunci | null;
  sedangMuat: boolean;
  muat: () => Promise<void>;
  /** Masing-masing aksi mengembalikan status terbaru dan melempar galat ke pemanggil, karena
     layar kunci menampilkan pesan salah di tempat sedangkan kartu memakai notifikasi. */
  buka: (pin: string) => Promise<StatusKunci>;
  /** Membuka kunci dengan sidik jari. Galat dikembalikan ke layar kunci supaya pesan tampil di
     tempat, bukan sebagai notifikasi yang menutupi dialog sistem. */
  bukaBiometrik: () => Promise<StatusKunci>;
  pasang: (pin: string, jedaDetik: number) => Promise<StatusKunci>;
  ganti: (pinLama: string, pinBaru: string) => Promise<StatusKunci>;
  aturJeda: (jedaDetik: number) => Promise<StatusKunci>;
  lepas: (pin: string) => Promise<StatusKunci>;
  kunciTangan: () => Promise<void>;
};

/** Terapkan status ke store dan ke DOM. Dipakai jalur command dan jalur peristiwa, jadi kedua
   jalur berakhir pada keadaan yang sama. */
function pasangStatus(status: StatusKunci): StatusKunci {
  useKunci.setState({ status, sedangMuat: false });
  // Tema dan bahasa tersimpan ikut diterapkan supaya layar kunci tidak berpindah ke terang.
  terapkanKeDom(status);
  return status;
}

/** Keadaan kunci aplikasi (PRD F4). Hanya gerbang dan preferensi tampil yang disimpan di sini;
   isi koleksi tidak pernah melewati jalur ini. */
export const useKunci = create<KeadaanKunci>((set) => ({
  status: null,
  sedangMuat: true,

  muat: async () => {
    try {
      pasangStatus(await statusKunci());
    } catch (mentah) {
      set({ status: null, sedangMuat: false });
      beriTahuGalat(pesanGalat(mentah));
    }
  },

  buka: (pin) => bukaKunci(pin).then(pasangStatus),
  bukaBiometrik: () => bukaKunciBiometrik().then(pasangStatus),
  pasang: (pin, jedaDetik) => pasangKunci(pin, jedaDetik).then(pasangStatus),
  ganti: (pinLama, pinBaru) => gantiPinKunci(pinLama, pinBaru).then(pasangStatus),
  aturJeda: (jedaDetik) => ubahJedaKunci(jedaDetik).then(pasangStatus),
  lepas: (pin) => lepasKunci(pin).then(pasangStatus),

  kunciTangan: async () => {
    try {
      await kunciSekarang();
      pasangStatus(await statusKunci());
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  },
}));

/** Sinyal "aplikasi pindah ke latar" hanya dapat dipakai di Android: di sana tidak ada peristiwa
   fokus jendela yang bisa diandalkan. Desktop ditangani backend pada peristiwa fokus jendela.
   Jalur visibilitychange sengaja tidak dipasang di desktop setelah diukur pada build rilis:
   `document.visibilityState` tetap "visible" ketika jendela diminimalkan, jadi handler ini tidak
   akan pernah memicu apa pun di sana. */
export function pasangPengamatLatar(): () => void {
  if (typeof document === "undefined" || deteksiPlatform() !== "mobile") return () => {};
  const saatBerubah = () => {
    if (document.visibilityState === "hidden" && useKunci.getState().status?.aktif) {
      void useKunci.getState().kunciTangan();
    }
  };
  document.addEventListener("visibilitychange", saatBerubah);
  return () => document.removeEventListener("visibilitychange", saatBerubah);
}

/** Backend yang memutuskan kapan gerbang ditutup (kunci otomatis setelah jendela kehilangan fokus,
   atau pembuka kunci dari jalur lain). Tanpa peristiwa ini, layar tetap menampilkan koleksi padahal
   command datanya sudah mulai ditolak. */
export async function pasangPengamatKunci(): Promise<() => void> {
  const lepas = await listen<StatusKunci>("kunci-berubah", (event) => pasangStatus(event.payload));
  return () => void lepas();
}
