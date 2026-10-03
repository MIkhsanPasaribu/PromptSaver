/** Cermin tipe dari kontrak command Rust (src-tauri/src/features/prompts). */

export type UrutanPrompt = "terbaru" | "dipakai" | "abjad";

export type Tag = {
  id: string;
  nama: string;
  warna: WarnaTag;
  jumlahPrompt: number;
  dibuatPada: number;
};

export type WarnaTag = "kuning" | "hijau" | "cyan" | "pink" | "lavender" | "oranye";

export const WARNA_TAG: WarnaTag[] = ["kuning", "hijau", "cyan", "pink", "lavender", "oranye"];

export type Prompt = {
  id: string;
  judul: string;
  isi: string;
  folderId: string | null;
  namaFolder: string | null;
  tags: Tag[];
  favorit: boolean;
  disemat: boolean;
  dibuatPada: number;
  diubahPada: number;
  dipakaiTerakhir: number | null;
  sampahPada: number | null;
  potongan?: string;
};

export type TagBaru = { nama: string; warna?: WarnaTag };

export type DataPrompt = {
  judul: string | null;
  isi: string;
  folderId: string | null;
  tagIds: string[];
  tagBaru: TagBaru[];
};

export type DaftarFilter = {
  folderId?: string | null;
  tanpaFolder?: boolean;
  hanyaFavorit?: boolean;
  hanyaSampah?: boolean;
  sertakanSampah?: boolean;
  urutan?: UrutanPrompt;
  batas?: number;
  kursor?: number;
  tagIds?: string[];
};

export type DrafPrompt = {
  judul: string;
  isi: string;
  folderId: string | null;
  tagIds: string[];
  diubahPada: number;
};

export type Statistik = {
  jumlahPrompt: number;
  jumlahFolder: number;
  jumlahTag: number;
  jumlahSampah: number;
  ukuranDatabaseKb: number;
};

/** Satu entri riwayat versi prompt: keadaan sebelum perubahan disimpan (PRD C3). */
export type VersiPrompt = {
  id: string;
  promptId: string;
  judul: string;
  isi: string;
  disimpanPada: number;
};

export const BATAS_PANJANG = {
  isiMaks: 50_000,
  judulMaks: 300,
  namaFolderMaks: 60,
  namaTagMaks: 40,
} as const;
