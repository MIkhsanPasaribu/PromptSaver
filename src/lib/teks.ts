/** Pemotong teks untuk tampilan. Hitungannya per karakter Unicode, bukan per unit UTF-16,
   supaya emoji dan huruf kombinasi tidak terpotong jadi karakter rusak. */
export function potongTeks(teks: string, batas: number): string {
  const karakter = Array.from(teks);
  if (karakter.length <= batas) return teks;
  return `${karakter.slice(0, batas).join("").trimEnd()}…`;
}
