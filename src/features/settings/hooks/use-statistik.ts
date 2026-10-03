import { useCallback, useEffect, useState } from "react";

import { statistikKoleksi } from "@/features/prompts/services/prompt-service";
import type { Statistik } from "@/features/prompts/types/prompt.types";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

/** Statistik koleksi lokal (PRD F2). Dipakai layar kategori dan pengaturan. */
export function gunakanStatistik() {
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [memuat, setMemuat] = useState(true);

  const muatUlang = useCallback(async () => {
    setMemuat(true);
    try {
      setStatistik(await statistikKoleksi());
    } catch (mentah) {
      setStatistik(null);
      beriTahuGalat(pesanGalat(mentah));
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return { statistik, memuat, muatUlang };
}
