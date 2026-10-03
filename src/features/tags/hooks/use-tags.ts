import { useEffect } from "react";
import { create } from "zustand";

import type { HasilAksi } from "@/features/folders/hooks/use-folders";
import type { Tag, WarnaTag } from "@/features/prompts/types/prompt.types";
import { pesanGalat } from "@/lib/ipc";
import { buatTag, daftarTag, hapusTag, ubahTag } from "../services/tag-service";

type KeadaanTags = {
  daftar: Tag[];
  memuat: boolean;
  galat: string | null;
  muatUlang: () => Promise<void>;
  buat: (nama: string, warna: WarnaTag) => Promise<HasilAksi>;
  ubah: (id: string, nama: string, warna: WarnaTag) => Promise<HasilAksi>;
  hapus: (id: string) => Promise<HasilAksi>;
};

const BERHASIL: HasilAksi = { berhasil: true, pesan: null };

const gagal = (mentah: unknown): HasilAksi => ({ berhasil: false, pesan: pesanGalat(mentah) });

/** Store bersama untuk chip filter di sidebar dan panel pengelolaan di halaman kategori. */
const useStoreTag = create<KeadaanTags>((set, get) => ({
  daftar: [],
  memuat: false,
  galat: null,

  muatUlang: async () => {
    set({ memuat: true });
    try {
      set({ daftar: await daftarTag(), galat: null });
    } catch (mentah) {
      set({ galat: pesanGalat(mentah) });
    } finally {
      set({ memuat: false });
    }
  },

  buat: async (nama, warna) => {
    try {
      await buatTag(nama, warna);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },

  ubah: async (id, nama, warna) => {
    try {
      await ubahTag(id, nama, warna);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },

  hapus: async (id) => {
    try {
      await hapusTag(id);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },
}));

export function gunakanTags(): KeadaanTags {
  const keadaan = useStoreTag();
  const muatUlang = useStoreTag((s) => s.muatUlang);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return keadaan;
}
