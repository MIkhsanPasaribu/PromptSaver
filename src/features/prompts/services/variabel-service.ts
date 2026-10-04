import { panggil } from "@/lib/ipc";

/** Pemetaan tipis ke command variabel template Rust. Deteksi dan pencarian variabel kosong
   sengaja tidak dipetakan ke IPC: keduanya dihitung dari `variabelDariTeks` di bawah supaya
   dialog bisa ter-render sebelum round-trip selesai. */
export const susunVariabel = (isi: string, nilai: Record<string, string>) =>
  panggil<string>("susun_variabel", { isi, nilai });

export const ambilNilaiVariabelTerakhir = () =>
  panggil<Record<string, string>>("ambil_nilai_variabel_terakhir");

export const simpanNilaiVariabelTerakhir = (nilai: Record<string, string>) =>
  panggil<void>("simpan_nilai_variabel_terakhir", { nilai });

/** Ekstraksi nama variabel di sisi frontend untuk render dialog sebelum IPC selesai.
   Sintaksnya disamakan dengan `deteksi_variabel` di Rust: `{{nama}}` tanpa kurung bersarang,
   nama dipangkas lalu harus terdiri atas huruf, angka, `_`, `-`, atau `.` maksimal 40
   karakter (`variabel::service::nama_sahih`). Tanpa aturan yang sama, frontend bisa
   menampilkan kolom isian yang tidak akan pernah diisi backend. */
const POLA_VARIABEL = /\{\{([^{}]+)\}\}/g;
const NAMA_VARIABEL_SAHIH = /^[\p{L}\p{N}_.-]{1,40}$/u;

export function variabelDariTeks(teks: string): string[] {
  const hasil: string[] = [];
  for (const cocok of teks.matchAll(POLA_VARIABEL)) {
    const nama = (cocok[1] ?? "").trim();
    if (NAMA_VARIABEL_SAHIH.test(nama) && !hasil.includes(nama)) hasil.push(nama);
  }
  return hasil;
}
