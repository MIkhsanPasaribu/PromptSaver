import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Prompt } from "@/features/prompts/types/prompt.types";
import { pesanGalat } from "@/lib/ipc";
import { cariPrompt, type FilterCari } from "../services/search-service";

type HasilPencarian = {
  daftar: Prompt[];
  memuat: boolean;
  galat: string | null;
  muatUlang: () => Promise<void>;
};

/** Jalankan pencarian FTS lewat command `cari_prompt`.
   Kueri kosong berarti "tidak ada pencarian": hasil dikosongkan tanpa memanggil backend. */
export function gunakanPencarian(filter: FilterCari): HasilPencarian {
  const [daftar, setDaftar] = useState<Prompt[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const kueri = filter.kueri.trim();
  /** Panggilan hanya diulang ketika isi filter benar-benar berubah, bukan setiap render. */
  const kunci = JSON.stringify({ ...filter, kueri });
  const payload = useMemo<FilterCari>(() => JSON.parse(kunci) as FilterCari, [kunci]);

  /** Respons yang terlambat diabaikan supaya daftar tidak pernah menyalahkan filter saat ini. */
  const versi = useRef(0);

  const muatUlang = useCallback(async () => {
    const nomor = ++versi.current;

    if (kueri === "") {
      setDaftar([]);
      setGalat(null);
      setMemuat(false);
      return;
    }

    setMemuat(true);
    try {
      const hasil = await cariPrompt(payload);
      if (nomor !== versi.current) return;
      setDaftar(hasil);
      setGalat(null);
    } catch (mentah) {
      if (nomor !== versi.current) return;
      setDaftar([]);
      setGalat(pesanGalat(mentah));
    } finally {
      if (nomor === versi.current) setMemuat(false);
    }
  }, [kueri, payload]);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return { daftar, memuat, galat, muatUlang };
}
