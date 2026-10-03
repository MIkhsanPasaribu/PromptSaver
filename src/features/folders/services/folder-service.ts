import { panggil } from "@/lib/ipc";

export type AksiHapusFolder = "pindahkan" | "pindahkan-ke-sampah";

export type Folder = {
  id: string;
  nama: string;
  jumlahPrompt: number;
  dibuatPada: number;
  diubahPada: number;
};

export const daftarFolder = () => panggil<Folder[]>("daftar_folder");

export const buatFolder = (nama: string) => panggil<Folder>("buat_folder", { nama });

export const ubahNamaFolder = (id: string, nama: string) =>
  panggil<Folder>("ubah_nama_folder", { id, nama });

export const hapusFolder = (id: string, aksi: AksiHapusFolder) =>
  panggil<void>("hapus_folder", { id, aksi });
