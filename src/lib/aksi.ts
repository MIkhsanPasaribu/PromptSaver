import { pesanGalat } from "@/lib/ipc";

/** Hasil satu aksi pengelolaan data (folder, tag). Komponen yang memutuskan menampilkannya
   inline di bawah kolom atau sebagai notifikasi. */
export type HasilAksi = { berhasil: boolean; pesan: string | null };

const BERHASIL: HasilAksi = { berhasil: true, pesan: null };

/** Jalankan satu command pengelolaan: muat ulang hanya dipanggil setelah backend menerima
   perubahannya, dan galat dipetakan ke pesan yang sudah diterjemahkan. */
export async function jalankanAksi(
  aksi: () => Promise<unknown>,
  setelahBerhasil: () => Promise<void>,
): Promise<HasilAksi> {
  try {
    await aksi();
  } catch (mentah) {
    return { berhasil: false, pesan: pesanGalat(mentah) };
  }
  await setelahBerhasil();
  return BERHASIL;
}

/** Muat daftar ke store pengelola: menyalakan flag memuat, menyimpan galat, dan selalu
   melepas flag walaupun command gagal. */
export async function muatKeStore<T>(
  set: (bagian: { memuat?: boolean; daftar?: T[]; galat?: string | null }) => void,
  ambil: () => Promise<T[]>,
): Promise<void> {
  set({ memuat: true });
  try {
    set({ daftar: await ambil(), galat: null });
  } catch (mentah) {
    set({ galat: pesanGalat(mentah) });
  } finally {
    set({ memuat: false });
  }
}
