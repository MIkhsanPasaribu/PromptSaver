import { useEffect } from "react";
import { create } from "zustand";

import type { Tag, WarnaTag } from "@/features/prompts/types/prompt.types";
import { jalankanAksi, muatKeStore, type HasilAksi } from "@/lib/aksi";
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

/** Store bersama untuk chip filter di sidebar dan panel pengelolaan di halaman kategori. */
const useStoreTag = create<KeadaanTags>((set, get) => ({
  daftar: [],
  memuat: false,
  galat: null,

  muatUlang: () => muatKeStore(set, daftarTag),

  buat: (nama, warna) => jalankanAksi(() => buatTag(nama, warna), () => get().muatUlang()),

  ubah: (id, nama, warna) =>
    jalankanAksi(() => ubahTag(id, nama, warna), () => get().muatUlang()),

  hapus: (id) => jalankanAksi(() => hapusTag(id), () => get().muatUlang()),
}));

export function gunakanTags(): KeadaanTags {
  const keadaan = useStoreTag();
  const muatUlang = useStoreTag((s) => s.muatUlang);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return keadaan;
}
