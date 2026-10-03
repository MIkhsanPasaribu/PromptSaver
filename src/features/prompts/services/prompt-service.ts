import { panggil } from "@/lib/ipc";

import type {
  DrafPrompt,
  DaftarFilter,
  DataPrompt,
  Prompt,
  Statistik,
  VersiPrompt,
} from "../types/prompt.types";

/** Pemetaan tipis ke command Rust. Frontend tidak pernah menyentuh database. */
export const daftarPrompt = (filter?: DaftarFilter) =>
  panggil<Prompt[]>("daftar_prompt", { filter: filter ?? {} });

export const ambilPrompt = (id: string) => panggil<Prompt>("ambil_prompt", { id });

export const buatPrompt = (data: DataPrompt) => panggil<Prompt>("buat_prompt", { data });

export const ubahPrompt = (id: string, data: DataPrompt) =>
  panggil<Prompt>("ubah_prompt", { id, data });

export const duplikatPrompt = (id: string) => panggil<Prompt>("duplikat_prompt", { id });

export const gantiFavoritPrompt = (id: string, aktif: boolean) =>
  panggil<Prompt>("ganti_favorit_prompt", { id, aktif });

export const gantiDisematPrompt = (id: string, aktif: boolean) =>
  panggil<Prompt>("ganti_disemat_prompt", { id, aktif });

export const pindahFolderPrompt = (id: string, folderId: string | null) =>
  panggil<Prompt>("pindah_folder_prompt", { id, folderId });

export const daftarRiwayatPrompt = (id: string) =>
  panggil<VersiPrompt[]>("daftar_riwayat_prompt", { id });

export const pulihkanVersiPrompt = (id: string, versiId: string) =>
  panggil<Prompt>("pulihkan_versi_prompt", { id, versiId });

export const tandaiPromptDipakai = (id: string) => panggil<void>("tandai_prompt_dipakai", { id });

export const simpanDrafPrompt = (data: DataPrompt) =>
  panggil<DrafPrompt>("simpan_draf_prompt", { data });

export const ambilDrafPrompt = () => panggil<DrafPrompt>("ambil_draf_prompt");

export const buangDrafPrompt = () => panggil<void>("buang_draf_prompt");

export const statistikKoleksi = () => panggil<Statistik>("statistik_koleksi");
