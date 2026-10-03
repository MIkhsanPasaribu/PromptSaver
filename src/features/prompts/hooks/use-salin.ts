import { useCallback, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { tandaiPromptDipakai } from "@/features/prompts/services/prompt-service";
import { variabelDariTeks } from "@/features/prompts/services/variabel-service";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { terjemah } from "@/lib/i18n";
import { beriTahuGalat, beriTahuTersalin } from "@/lib/notifikasi";

/** Isi yang gagal ditulis ke clipboard. Layaran menawarkan teks siap blok supaya pengguna
   tetap bisa menyalin manual (PRD C1 dan C2, alur gagal). */
export type AntreanSalinManual = { teks: string; id?: string };

export type KeadaanSalin = {
  idTersalin: string | null;
  /** Prompt yang menunggu diisi variabelnya. Dialog variabel dirender saat ini terisi. */
  menungguVariabel: Prompt | null;
  salinManual: AntreanSalinManual | null;
  /** Salin satu prompt. Prompt bervariabel tidak langsung disalin, melainkan membuka dialog. */
  salin: (prompt: Prompt) => Promise<boolean>;
  salinTeks: (teks: string, id?: string, jumlahSekalian?: number) => Promise<boolean>;
  tutupVariabel: () => void;
  tutupSalinManual: () => void;
};

const JEDA_UMPAN_BALIK = 1600;

/** C1 salin cepat dan C2 isian variabel. Umpan balik muncul segera setelah clipboard berhasil
   ditulis; hitungan "terakhir dipakai" dijalankan di latar belakang supaya tidak menahan UI. */
export function gunakanSalin(): KeadaanSalin {
  const [idTersalin, setIdTersalin] = useState<string | null>(null);
  const [menungguVariabel, setMenungguVariabel] = useState<Prompt | null>(null);
  const [salinManual, setSalinManual] = useState<AntreanSalinManual | null>(null);
  const waktuBersihkan = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salinTeks = useCallback(async (teks: string, id?: string, jumlahSekalian?: number) => {
    try {
      await writeText(teks);
    } catch {
      setSalinManual({ teks, id });
      return false;
    }

    setIdTersalin(id ?? "massal");
    beriTahuTersalin(jumlahSekalian);
    if (waktuBersihkan.current) clearTimeout(waktuBersihkan.current);
    waktuBersihkan.current = setTimeout(() => setIdTersalin(null), JEDA_UMPAN_BALIK);

    if (id) {
      void tandaiPromptDipakai(id).catch(() => {
        beriTahuGalat(terjemah("prompt.gagalHitungan"));
      });
    }
    return true;
  }, []);

  const salin = useCallback(
    async (prompt: Prompt) => {
      if (variabelDariTeks(prompt.isi).length > 0) {
        setMenungguVariabel(prompt);
        return false;
      }
      return salinTeks(prompt.isi, prompt.id);
    },
    [salinTeks],
  );

  const tutupVariabel = useCallback(() => setMenungguVariabel(null), []);
  const tutupSalinManual = useCallback(() => setSalinManual(null), []);

  return {
    idTersalin,
    menungguVariabel,
    salinManual,
    salin,
    salinTeks,
    tutupVariabel,
    tutupSalinManual,
  };
}
