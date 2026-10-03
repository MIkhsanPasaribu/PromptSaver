import { useEffect } from "react";
import { create } from "zustand";

import { pesanGalat } from "@/lib/ipc";
import {
  buatFolder,
  daftarFolder,
  hapusFolder,
  ubahNamaFolder,
  type AksiHapusFolder,
  type Folder,
} from "../services/folder-service";

/** Hasil satu aksi pengelolaan. Komponen yang memilih menampilkannya inline atau sebagai toast. */
export type HasilAksi = { berhasil: boolean; pesan: string | null };

type KeadaanFolders = {
  daftar: Folder[];
  memuat: boolean;
  galat: string | null;
  muatUlang: () => Promise<void>;
  buat: (nama: string) => Promise<HasilAksi>;
  ubahNama: (id: string, nama: string) => Promise<HasilAksi>;
  hapus: (id: string, aksi: AksiHapusFolder) => Promise<HasilAksi>;
};

const BERHASIL: HasilAksi = { berhasil: true, pesan: null };

const gagal = (mentah: unknown): HasilAksi => ({ berhasil: false, pesan: pesanGalat(mentah) });

/** Satu store bersama untuk seluruh panel folder (sidebar desktop dan halaman kategori),
   supaya jumlah prompt per folder tidak pernah berbeda antara dua panel yang terbuka. */
const useStoreFolder = create<KeadaanFolders>((set, get) => ({
  daftar: [],
  memuat: false,
  galat: null,

  muatUlang: async () => {
    set({ memuat: true });
    try {
      set({ daftar: await daftarFolder(), galat: null });
    } catch (mentah) {
      set({ galat: pesanGalat(mentah) });
    } finally {
      set({ memuat: false });
    }
  },

  buat: async (nama) => {
    try {
      await buatFolder(nama);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },

  ubahNama: async (id, nama) => {
    try {
      await ubahNamaFolder(id, nama);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },

  hapus: async (id, aksi) => {
    try {
      await hapusFolder(id, aksi);
    } catch (mentah) {
      return gagal(mentah);
    }
    await get().muatUlang();
    return BERHASIL;
  },
}));

export function gunakanFolders(): KeadaanFolders {
  const keadaan = useStoreFolder();
  const muatUlang = useStoreFolder((s) => s.muatUlang);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return keadaan;
}
