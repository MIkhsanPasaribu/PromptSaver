import { panggil } from "@/lib/ipc";

/** Berkas .promptsaver yang membuat aplikasi dibuka, atau null. Dimakan sekali lalu hilang. */
export const ambilBerkasTerbuka = () => panggil<string | null>("ambil_berkas_terbuka");

export type DaftarBerkasEkspor = {
  /** Folder tukar milik aplikasi, ditampilkan apa adanya supaya pengguna tahu tempatnya. */
  folder: string;
  /** Path lengkap berkas ekspor, terbaru lebih dulu. */
  berkas: string[];
};

/** Ekspor ke folder tukar aplikasi. Dipakai di mobile, tempat dialog tidak memberi path yang
   bisa dibaca aplikasi. */
export const eksporKeFolder = (cakupan: CakupanEkspor, ids: string[]) =>
  panggil<RingkasanEkspor>("ekspor_ke_folder", { cakupan, ids });

export const daftarBerkasEkspor = () => panggil<DaftarBerkasEkspor>("daftar_berkas_ekspor");

export type CakupanEkspor = "semua" | "pilihan";

export type StrategiKonflik =
  "lewati-duplikat" | "timpa-jika-lebih-baru" | "simpan-sebagai-salinan";

/** Satu sumber strategi konflik impor, dipakai layar Ekspor dan Impor dan layar Pemulihan
   cadangan supaya dua jalur impor tidak pernah menawarkan pilihan yang berbeda. Yang disimpan di
   sini adalah kunci teks, bukan teksnya, karena label harus ikut bahasa antarmuka (PRD Bagian 5). */
export const STRATEGI_IMPOR: {
  nilai: StrategiKonflik;
  kunciLabel: string;
  kunciCatatan: string;
}[] = [
  {
    nilai: "lewati-duplikat",
    kunciLabel: "transfer.strategiLewati",
    kunciCatatan: "transfer.catatanLewati",
  },
  {
    nilai: "timpa-jika-lebih-baru",
    kunciLabel: "transfer.strategiTimpa",
    kunciCatatan: "transfer.catatanTimpa",
  },
  {
    nilai: "simpan-sebagai-salinan",
    kunciLabel: "transfer.strategiSalinan",
    kunciCatatan: "transfer.catatanSalinan",
  },
];

export type RingkasanEkspor = {
  jumlahPrompt: number;
  jumlahFolder: number;
  jumlahTag: number;
  ukuranByte: number;
  lokasi: string;
};

export type PratinjauImpor = {
  jumlahPrompt: number;
  jumlahFolder: number;
  jumlahTag: number;
  bentrok: number;
  versiSkema: number;
  ukuranByte: number;
};

export type RingkasanImpor = {
  ditambah: number;
  dilewati: number;
  ditimpa: number;
  gagal: number;
  pesan: string[];
};

export const eksporKoleksi = (path: string, cakupan: CakupanEkspor, ids: string[]) =>
  panggil<RingkasanEkspor>("ekspor_koleksi", { path, cakupan, ids });

export const pratinjauImpor = (path: string) =>
  panggil<PratinjauImpor>("pratinjau_impor", { path });

export const imporKoleksi = (path: string, strategi: StrategiKonflik) =>
  panggil<RingkasanImpor>("impor_koleksi", { path, strategi });

export const namaBerkasBaku = () => panggil<string>("nama_berkas_baku");
