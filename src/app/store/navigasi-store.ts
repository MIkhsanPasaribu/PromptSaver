import { create } from "zustand";

export type Layar =
  | { nama: "koleksi" }
  | { nama: "detail"; id: string }
  | { nama: "form"; id?: string }
  | { nama: "kategori" }
  | { nama: "sampah" }
  /** `berkas` terisi ketika aplikasi dibuka lewat berkas .promptsaver (PRD D2). */
  | { nama: "transfer"; berkas?: string }
  | { nama: "pengaturan" }
  | { nama: "privasi" }
  | { nama: "bantuan" }
  | { nama: "onboarding" };

type KeadaanNavigasi = {
  tumpukan: Layar[];
  /** Filter aktif pada daftar koleksi. */
  folderId: string | null;
  tanpaFolder: boolean;
  hanyaFavorit: boolean;
  tagIds: string[];
  kueri: string;
  layarAktif: () => Layar;
  ke: (layar: Layar) => void;
  ganti: (layar: Layar) => void;
  kembali: () => boolean;
  potongKe: (kedalaman: number) => void;
  aturFilter: (
    patch: Partial<
      Pick<KeadaanNavigasi, "folderId" | "tanpaFolder" | "hanyaFavorit" | "tagIds" | "kueri">
    >,
  ) => void;
  resetFilter: () => void;
};

const AWAL_FILTER = {
  folderId: null,
  tanpaFolder: false,
  hanyaFavorit: false,
  tagIds: [] as string[],
  kueri: "",
};

/** Riwayat browser menjadi kanal bersama untuk tombol back. Di Android WebView memakan
   entri riwayat lebih dulu (`handleBackNavigation` pada MainActivity) sebelum aplikasi masuk
   latar belakang, jadi setiap perpindahan layar harus mendorong satu entri. Desktop dan jsdom
   tetap memakai aksi eksplisit `kembali()`, dan `replaceState` menjaga kedalaman tetap sinkron. */
function ubahRiwayat(kedalaman: number, ganti: boolean) {
  const riwayat = typeof window === "undefined" ? undefined : window.history;
  if (!riwayat?.replaceState) return;
  const keadaan = { ps: kedalaman };
  if (ganti) riwayat.replaceState(keadaan, "");
  else riwayat.pushState(keadaan, "");
}

export const useNavigasi = create<KeadaanNavigasi>((set, get) => ({
  tumpukan: [{ nama: "koleksi" }],
  ...AWAL_FILTER,

  layarAktif: () => {
    const tumpukan = get().tumpukan;
    return tumpukan[tumpukan.length - 1] ?? { nama: "koleksi" };
  },

  ke: (layar) =>
    set((s) => {
      const tumpukan = [...s.tumpukan, layar];
      ubahRiwayat(tumpukan.length, false);
      return { tumpukan };
    }),

  ganti: (layar) => {
    set({ tumpukan: [layar] });
    ubahRiwayat(1, true);
  },

  /** Tombol back mobile dan Esc. Mengembalikan true bila masih ada layar untuk ditinggalkan. */
  kembali: () => {
    const { tumpukan } = get();
    if (tumpukan.length <= 1) return false;
    const sisa = tumpukan.slice(0, -1);
    set({ tumpukan: sisa });
    ubahRiwayat(sisa.length, true);
    return true;
  },

  /** Dipakai pemantau `popstate`: potong tumpukan sampai kedalaman yang tercatat.
     Kedalaman yang lebih besar dari keadaan sekarang diabaikan, tidak ada layar karangan. */
  potongKe: (kedalaman: number) => {
    const { tumpukan } = get();
    if (kedalaman < 1 || kedalaman >= tumpukan.length) return;
    set({ tumpukan: tumpukan.slice(0, kedalaman) });
  },

  aturFilter: (patch) => set(patch),

  resetFilter: () => set({ ...AWAL_FILTER }),
}));

/** Lapisan native (tombol back Android) membaca angka ini, bukan `canGoBack()` milik WebView:
   terukur di perangkat, `canGoBack()` tetap false setelah `history.pushState`. Dipublikasikan
   lewat langganan store supaya selalu sama dengan tumpukan nyata, termasuk saat dipotong oleh
   popstate. */
useNavigasi.subscribe((keadaan) => {
  if (typeof window === "undefined") return;
  (window as Window & { psPanjangTumpukan?: number }).psPanjangTumpukan = keadaan.tumpukan.length;
});
