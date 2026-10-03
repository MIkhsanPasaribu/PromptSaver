import { panggil } from "@/lib/ipc";
import type { Bahasa } from "@/lib/i18n/bahasa";

import type { UrutanPrompt } from "../../prompts/types/prompt.types";

export type Tema = "ikut-sistem" | "terang" | "gelap";

export type Geometri = {
  x: number;
  y: number;
  lebar: number;
  tinggi: number;
  maksimum: boolean;
};

export type Pengaturan = {
  tema: Tema;
  bahasa: Bahasa;
  kurangiAnimasi: boolean;
  urutanDaftar: UrutanPrompt;
  onboardingSelesai: boolean;
  ingatNilaiVariabel: boolean;
  widgetGeometriPenuh: Geometri | null;
  widgetGeometriMode: Geometri | null;
  widgetSelaluDiAtas: boolean;
  widgetTransparansi: number;
  widgetTutupKeTray: boolean;
  pintasanGlobalAktif: boolean;
  pintasanGlobal: string;
  /** Cadangan otomatis mingguan di folder data aplikasi (PRD D3). */
  cadanganOtomatis: boolean;
};

/** Bagianbatasan yang sama dengan TRANSPARANSI_MIN di backend. */
export const TRANSPARANSI_MIN = 80;
export const TRANSPARANSI_MAKS = 100;

export const ambilPengaturan = () => panggil<Pengaturan>("ambil_pengaturan");

export const simpanPengaturan = (patch: Partial<Pengaturan>) =>
  panggil<Pengaturan>("simpan_pengaturan", { patch });

export const aturUlangPengaturan = () => panggil<Pengaturan>("atur_ulang_pengaturan");

/** `sertakanBerkas` ikut menghapus isi folder cadangan dan tukar ekspor (PRD F3).
   Mengembalikan jumlah berkas yang terhapus. */
export const hapusSemuaData = (sertakanBerkas: boolean) =>
  panggil<number>("hapus_semua_data", { sertakanBerkas });
