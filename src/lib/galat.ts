import galatId from "@/lib/i18n/sumber/galat-id";
import { terjemah } from "@/lib/i18n";

/** Backend tetap sumber kebenaran validasi dan pesannya berbahasa Indonesia. Modul ini hanya
   memetakan pesan itu ke bahasa antarmuka saat tampilan dibuat, jadi tidak ada aturan validasi
   yang berpindah ke frontend. Pesan yang tidak dikenal tampil apa adanya: lebih baik teks
   Indonesia muncul di antarmuka Inggris daripada pesan hilang tanpa penjelasan. */
type Entri = { kunci: string; regex: RegExp; nama: string[] };

const KUTIP = /[.*+?^${}()|[\]\\]/g;

function buatPola(teks: string): Entri {
  const nama: string[] = [];
  const bagian = teks.split(/\{\{(\w+)\}\}/g);
  let badan = "";
  bagian.forEach((potongan, indeks) => {
    if (indeks % 2 === 1) {
      nama.push(potongan);
      badan += "(.+?)";
    } else {
      badan += potongan.replace(KUTIP, "\\$&");
    }
  });
  return { kunci: "", regex: new RegExp(`^${badan}$`), nama };
}

const PERSIS = new Map<string, string>();
const BERPOLA: Entri[] = [];

for (const [kunci, teks] of Object.entries(galatId as Record<string, string>)) {
  if (teks.includes("{{")) {
    BERPOLA.push({ ...buatPola(teks), kunci: `galat.${kunci}` });
  } else {
    PERSIS.set(teks, `galat.${kunci}`);
  }
}

export function terjemahkanPesan(pesan: string): string {
  const kunci = PERSIS.get(pesan);
  if (kunci) return terjemah(kunci);
  for (const pola of BERPOLA) {
    const cocok = pesan.match(pola.regex);
    if (!cocok) continue;
    const nilai: Record<string, string> = {};
    pola.nama.forEach((nama, indeks) => {
      nilai[nama] = cocok[indeks + 1] ?? "";
    });
    return terjemah(pola.kunci, nilai);
  }
  return pesan;
}
