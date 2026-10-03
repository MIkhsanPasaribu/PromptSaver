import { panggil } from "@/lib/ipc";

import type { Prompt } from "../../prompts/types/prompt.types";

export const daftarSampah = () => panggil<Prompt[]>("daftar_sampah");

/** Soft delete. Prompt tetap bisa dipulihkan sampai hapus permanen (PRD A2 dan A3). */
export const hapusKeSampah = (id: string) => panggil<void>("hapus_prompt", { id });

export const pulihkanPrompt = (id: string) => panggil<Prompt>("pulihkan_prompt", { id });

export const hapusPermanenPrompt = (id: string) => panggil<void>("hapus_permanen_prompt", { id });

export const kosongkanSampah = () => panggil<number>("kosongkan_sampah");
