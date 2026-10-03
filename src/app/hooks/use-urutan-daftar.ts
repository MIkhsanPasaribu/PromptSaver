import { useCallback } from "react";

import { usePengaturan } from "@/app/store/pengaturan-store";
import type { UrutanPrompt } from "@/features/prompts/types/prompt.types";

/** Urutan daftar adalah preferensi tersimpan, bukan keadaan navigasi (PRD B5: pilihan terakhir
   diingat; F1: berlaku langsung tanpa restart). Satu sumber kebenaran supaya jendela penuh,
   Mode Widget, dan layar Pengaturan tidak pernah menampilkan nilai yang berbeda. */
export function gunakanUrutanDaftar(): [UrutanPrompt, (baru: UrutanPrompt) => void] {
  const urutan = usePengaturan((s) => s.pengaturan?.urutanDaftar) ?? "terbaru";
  const ubah = usePengaturan((s) => s.ubah);
  const setel = useCallback(
    (baru: UrutanPrompt) => {
      void ubah({ urutanDaftar: baru });
    },
    [ubah],
  );
  return [urutan, setel];
}
