/**
 * Penggabungan kelas Tailwind milik proyek.
 * Helper merge pihak ketiga tidak dipakai karena nama token kami (text-on-primary,
 * text-label-md) tidak dikenali sebagai grup berbeda, sehingga kelas warna bisa terhapus diam-diam.
 * Aturan main: komponen tidak boleh menerima kelas yang menimpa propertinya sendiri.
 */
export function cn(...masukan: Array<string | false | null | undefined>): string {
  return masukan.filter(Boolean).join(" ");
}
