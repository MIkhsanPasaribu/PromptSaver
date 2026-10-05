import { useEffect } from "react";
import { create } from "zustand";

import {
  buatFolder,
  daftarFolder,
  hapusFolder,
  ubahNamaFolder,
  type AksiHapusFolder,
  type Folder,
} from "../services/folder-service";
import { jalankanAksi, muatKeStore, type HasilAksi } from "@/lib/aksi";

type KeadaanFolders = {
  daftar: Folder[];
  memuat: boolean;
  galat: string | null;
  muatUlang: () => Promise<void>;
  buat: (nama: string) => Promise<HasilAksi>;
  ubahNama: (id: string, nama: string) => Promise<HasilAksi>;
  hapus: (id: string, aksi: AksiHapusFolder) => Promise<HasilAksi>;
};

/** Satu store bersama untuk seluruh panel folder (sidebar desktop dan halaman kategori),
   supaya jumlah prompt per folder tidak pernah berbeda antara dua panel yang terbuka. */
const useStoreFolder = create<KeadaanFolders>((set, get) => ({
  daftar: [],
  memuat: false,
  galat: null,

  muatUlang: () => muatKeStore(set, daftarFolder),

  buat: (nama) => jalankanAksi(() => buatFolder(nama), () => get().muatUlang()),

  ubahNama: (id, nama) => jalankanAksi(() => ubahNamaFolder(id, nama), () => get().muatUlang()),

  hapus: (id, aksi) => jalankanAksi(() => hapusFolder(id, aksi), () => get().muatUlang()),
}));

export function gunakanFolders(): KeadaanFolders {
  const keadaan = useStoreFolder();
  const muatUlang = useStoreFolder((s) => s.muatUlang);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  return keadaan;
}
