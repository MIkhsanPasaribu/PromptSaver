import { useCallback, useEffect, useRef, useState } from "react";

import {
  ambilPrompt,
  buatPrompt,
  daftarPrompt,
  duplikatPrompt,
  gantiDisematPrompt,
  gantiFavoritPrompt,
  pindahFolderPrompt,
  ubahPrompt,
} from "@/features/prompts/services/prompt-service";
import type { DaftarFilter, DataPrompt, Prompt } from "@/features/prompts/types/prompt.types";
import { terjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";

export const JUMLAH_PER_HALAMAN = 60;

export type KeadaanPrompt = {
  daftar: Prompt[];
  memuat: boolean;
  memuatLagi: boolean;
  galat: string | null;
  sisaHalaman: boolean;
  muatUlang: () => Promise<void>;
  muatBerikutnya: () => Promise<void>;
  ambilSatu: (id: string) => Promise<Prompt | null>;
  buat: (data: DataPrompt) => Promise<Prompt | null>;
  ubah: (id: string, data: DataPrompt) => Promise<Prompt | null>;
  duplikat: (id: string) => Promise<Prompt | null>;
  tandaiFavorit: (id: string, aktif: boolean) => Promise<void>;
  tandaiDisemat: (id: string, aktif: boolean) => Promise<void>;
  pindahkan: (id: string, folderId: string | null) => Promise<void>;
};

/** Satu-satunya tempat layar koleks memanggil command prompt. */
export function gunakanDaftarPrompt(filter: DaftarFilter): KeadaanPrompt {
  const [daftar, setDaftar] = useState<Prompt[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [penuh, setPenuh] = useState(false);
  const percobaan = useRef(0);

  const kunci = JSON.stringify(filter);

  const muat = useCallback(
    async (dari: number, gantiSemua: boolean) => {
      const tanda = ++percobaan.current;
      if (gantiSemua) setMemuat(true);
      else setMemuatLagi(true);
      try {
        const hasil = await daftarPrompt({ ...filter, batas: JUMLAH_PER_HALAMAN, kursor: dari });
        if (tanda !== percobaan.current) return;
        setGalat(null);
        setPenuh(hasil.length === JUMLAH_PER_HALAMAN);
        setOffset(dari + hasil.length);
        setDaftar((sebelum) => (gantiSemua ? hasil : [...sebelum, ...hasil]));
      } catch (mentah) {
        if (tanda !== percobaan.current) return;
        setGalat(pesanGalat(mentah));
      } finally {
        if (tanda === percobaan.current) {
          setMemuat(false);
          setMemuatLagi(false);
        }
      }
    },
    // Kunci filter mewakili isi objek, sehingga rujukan baru tiap render tidak memicu loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kunci],
  );

  useEffect(() => {
    void muat(0, true);
  }, [muat]);

  const jalankan = useCallback(
    async <T>(aksi: Promise<T>, pesanSukses?: string): Promise<T | null> => {
      try {
        const hasil = await aksi;
        if (pesanSukses) beriTahuBerhasil(pesanSukses);
        return hasil;
      } catch (mentah) {
        beriTahuGalat(pesanGalat(mentah));
        return null;
      }
    },
    [],
  );

  const tersimpan = useCallback(
    async (hasil: Prompt | null) => {
      if (hasil) await muat(0, true);
      return hasil;
    },
    [muat],
  );

  return {
    daftar,
    memuat,
    memuatLagi,
    galat,
    sisaHalaman: penuh,
    muatUlang: () => muat(0, true),
    muatBerikutnya: () => muat(offset, false),
    ambilSatu: (id) => jalankan(ambilPrompt(id)),
    buat: async (data) =>
      tersimpan(await jalankan(buatPrompt(data), terjemah("prompt.toastTersimpan"))),
    ubah: async (id, data) =>
      tersimpan(await jalankan(ubahPrompt(id, data), terjemah("prompt.toastDiubah"))),
    duplikat: async (id) =>
      tersimpan(await jalankan(duplikatPrompt(id), terjemah("prompt.toastDuplikat"))),
    tandaiFavorit: async (id, aktif) => {
      const hasil = await jalankan(gantiFavoritPrompt(id, aktif));
      if (hasil) setDaftar((sebelum) => sebelum.map((p) => (p.id === id ? hasil : p)));
    },
    tandaiDisemat: async (id, aktif) => {
      await tersimpan(await jalankan(gantiDisematPrompt(id, aktif)));
    },
    pindahkan: async (id, folderId) => {
      await tersimpan(
        await jalankan(pindahFolderPrompt(id, folderId), terjemah("prompt.toastDipindahkan")),
      );
    },
  };
}
