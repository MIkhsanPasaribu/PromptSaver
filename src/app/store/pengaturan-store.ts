import { create } from "zustand";

import {
  ambilPengaturan,
  aturUlangPengaturan,
  hapusSemuaData,
  simpanPengaturan,
  type Pengaturan,
} from "@/features/settings/services/settings-service";
import { BAHASA_BAKU, gantiBahasa, type Bahasa } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

type KeadaanPengaturan = {
  pengaturan: Pengaturan | null;
  sedangMuat: boolean;
  muat: () => Promise<void>;
  ubah: (patch: Partial<Pengaturan>) => Promise<void>;
  aturUlang: () => Promise<void>;
  /** Mengembalikan jumlah berkas cadangan/ekspor yang ikut terhapus, atau null bila gagal. */
  kosongkanData: (sertakanBerkas: boolean) => Promise<number | null>;
};

/** Bagian pengaturan yang berdampak pada DOM dokumen. Bentuknya dibuat longgar supaya layar kunci
   bisa menerapkan tema dan bahasa dari `status_kunci` tanpa memanggil command pengaturan, yang
   berada di balik gerbang kunci. */
export type PreferensiTampil = {
  tema?: Pengaturan["tema"];
  bahasa?: Bahasa;
  kurangiAnimasi?: boolean;
  widgetTransparansi?: number;
};

/** Terapkan tema dan preferensi animasi ke DOM. Satu sumber kebenaran untuk dua jalur:
   pengaturan OS (`prefers-*`) dan opsi eksplisit pengguna (PRD E2, E3, F1). */
export function terapkanKeDom(pengaturan: PreferensiTampil | null) {
  if (typeof document === "undefined") return;
  const akar = document.documentElement;
  const gelap =
    pengaturan?.tema === "gelap" ||
    (pengaturan?.tema === "ikut-sistem" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  akar.classList.toggle("dark", gelap);
  akar.dataset.kurangiAnimasi = String(
    Boolean(pengaturan?.kurangiAnimasi) ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  akar.dataset.temaAktif = gelap ? "gelap" : "terang";

  // Bahasa antarmuka ikut diterapkan di sini supaya satu jalur (perubahan pengaturan) dan jalur
  // awal (muat pertama) selalu berakhir pada bahasa yang sama, tanpa dua titik pensinkronan.
  void gantiBahasa(pengaturan?.bahasa ?? BAHASA_BAKU);

  // Transparansi widget: frontend yang menulis keadaan DOM-nya, backend hanya memasang
  // efek jendela. Alpha permukaan menjaga kontras teks tetap pada tingkat AA.
  const persen = pengaturan?.widgetTransparansi ?? 100;
  akar.dataset.widgetTransparan = String(persen);
  akar.style.setProperty("--widget-alpha", String(persen / 100));
}

export const usePengaturan = create<KeadaanPengaturan>((set, get) => ({
  pengaturan: null,
  sedangMuat: true,

  muat: async () => {
    try {
      const data = await ambilPengaturan();
      set({ pengaturan: data, sedangMuat: false });
      terapkanKeDom(data);
    } catch (mentah) {
      set({ pengaturan: null, sedangMuat: false });
      beriTahuGalat(pesanGalat(mentah));
    }
  },

  ubah: async (patch) => {
    const sebelumnya = get().pengaturan;
    // Terapkan lebih dulu supaya UI terasa langsung di bawah 100 ms.
    if (sebelumnya) {
      const optimis = { ...sebelumnya, ...patch };
      set({ pengaturan: optimis });
      terapkanKeDom(optimis);
    }
    try {
      const data = await simpanPengaturan(patch);
      set({ pengaturan: data });
      terapkanKeDom(data);
    } catch (mentah) {
      if (sebelumnya) {
        set({ pengaturan: sebelumnya });
        terapkanKeDom(sebelumnya);
      }
      beriTahuGalat(pesanGalat(mentah));
    }
  },

  aturUlang: async () => {
    try {
      const data = await aturUlangPengaturan();
      set({ pengaturan: data });
      terapkanKeDom(data);
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  },

  kosongkanData: async (sertakanBerkas) => {
    try {
      const berkas = await hapusSemuaData(sertakanBerkas);
      const data = await ambilPengaturan();
      set({ pengaturan: data });
      terapkanKeDom(data);
      return berkas;
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
      return null;
    }
  },
}));

/** Ikuti perubahan tema dan animasi dari sistem operasi selama aplikasi terbuka (PRD E3).
   Tanpa pengamat ini, mengganti mode gelap di OS saat aplikasi berjalan baru berpengaruh
   setelah aplikasi dibuka ulang. Preferensi tersimpan tidak diubah, hanya dihitung ulang. */
export function pasangPengamatSistem(): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const lepas: (() => void)[] = [];
  for (const pertanyaan of ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)"]) {
    const media = window.matchMedia(pertanyaan);
    const ubah = () => terapkanKeDom(usePengaturan.getState().pengaturan);
    media.addEventListener("change", ubah);
    lepas.push(() => media.removeEventListener("change", ubah));
  }
  return () => lepas.forEach((jalan) => jalan());
}

/** Pita ukuran Mode Widget. Angkanya harus sama dengan `UKURAN_WIDGET_MIN` dan
   `UKURAN_WIDGET_MAKS` di src-tauri/src/features/widget/mode_jendela.rs, karena mode dibaca
   ulang dari ukuran jendela: backend memaksa hasil akhir masuk ke pita ini, frontend
   menyimpulkan mode dari angka yang sama. */
export const WIDGET_MIN = { lebar: 260, tinggi: 280 };
export const WIDGET_MAKS = { lebar: 420, tinggi: 760 };

/** Ukuran jendela widget menentukan shell yang dirender frontend. */
export function deteksiModeJendela(lebar: number, tinggi: number): "widget" | "penuh" {
  return lebar <= WIDGET_MAKS.lebar && tinggi <= WIDGET_MAKS.tinggi ? "widget" : "penuh";
}
