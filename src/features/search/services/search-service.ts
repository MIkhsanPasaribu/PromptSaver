import { panggil } from "@/lib/ipc";

import type { UrutanPrompt, Prompt } from "../../prompts/types/prompt.types";

export type FilterCari = {
  kueri: string;
  folderId?: string | null;
  tagIds?: string[];
  hanyaFavorit?: boolean;
  urutan?: UrutanPrompt;
  batas?: number;
  kursor?: number;
};

export const cariPrompt = (filter: FilterCari) => panggil<Prompt[]>("cari_prompt", { filter });

/** Pecah teks menjadi bagian biasa dan bagian yang cocok, untuk menyorot kata. */
export function potongSorotan(teks: string, kueri: string): { teks: string; cocok: boolean }[] {
  const kata = kueri
    .toLowerCase()
    .split(/\s+/)
    .map((bagian) => bagian.replace(/[*"]/g, ""))
    .filter((bagian) => bagian.length > 0);
  if (kata.length === 0) return [{ teks, cocok: false }];

  const pola = new RegExp(`(${kata.map(escapeRegex).join("|")})`, "gi");
  return teks
    .split(pola)
    .filter((bagian) => bagian.length > 0)
    .map((bagian) => ({ teks: bagian, cocok: kata.includes(bagian.toLowerCase()) }));
}

function escapeRegex(nilai: string): string {
  return nilai.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
