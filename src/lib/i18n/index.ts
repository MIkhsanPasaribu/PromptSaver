import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { BAHASA_BAKU, type Bahasa, fungsibahasa } from "./bahasa";

export type { Bahasa };
export { BAHASA_BAKU, DAFTAR_BAHASA, fungsibahasa } from "./bahasa";

type IsiKamus = Record<string, string>;

/** Setiap berkas `sumber/<nama>-<kode bahasa>.ts` menyumbang satu kelompok kunci. Nama berkas
   jadi nama kelompok, jadi menambah layar baru cukup menambah berkas tanpa menyentuh modul ini.
   Glob harus literal statis, jadi satu baris per bahasa. */
const SUMBER: Record<Bahasa, Record<string, { default?: IsiKamus }>> = {
  id: import.meta.glob("./sumber/*-id.ts", { eager: true }),
  en: import.meta.glob("./sumber/*-en.ts", { eager: true }),
};

function muatKamus(kode: Bahasa): Record<string, IsiKamus> {
  const kamus: Record<string, IsiKamus> = {};
  for (const [jalur, isi] of Object.entries(SUMBER[kode])) {
    const kelompok = jalur.match(/\/([a-z0-9-]+)-[a-z]{2}\.ts$/)?.[1];
    if (!kelompok || !isi.default) continue;
    kamus[kelompok] = isi.default;
  }
  return kamus;
}

/** Inisialisasi dilakukan pada saat modul dimuat supaya render pertama sudah punya teks:
   semua sumber daya sudah ada di memori, jadi tidak ada pemuatan tertunda. */
void i18next.use(initReactI18next).init({
  lng: BAHASA_BAKU,
  fallbackLng: BAHASA_BAKU,
  interpolation: { escapeValue: false },
  resources: {
    id: { translation: muatKamus("id") },
    en: { translation: muatKamus("en") },
  },
});

/** Terjemahan untuk kode di luar komponen React: store, pengantar notifikasi, dan pemetaan galat. */
export function terjemah(kunci: string, opsi?: Record<string, unknown>): string {
  return String(i18next.t(kunci, opsi));
}

export async function gantiBahasa(bahasa: Bahasa): Promise<void> {
  await i18next.changeLanguage(bahasa);
  if (typeof document !== "undefined") document.documentElement.lang = bahasa;
}

export function bahasaAktif(): Bahasa {
  return fungsibahasa(i18next.language);
}

export { useTranslation as useTerjemah, Trans } from "react-i18next";
