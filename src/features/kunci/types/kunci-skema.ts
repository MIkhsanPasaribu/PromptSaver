import { z } from "zod";

import { terjemah } from "@/lib/i18n";

/** Aturan PIN untuk form kunci aplikasi. Meniru `kunci::service` di Rust: PANJANG_PIN_MIN,
   PANJANG_PIN_MAKS, dan syarat hanya digit ASCII. Backend tetap menegakkan ulang aturan yang
   sama dan tetap sumber kebenaran (AGENTS.md Bagian 4); skema ini hanya mencegah pengiriman
   nilai yang pasti ditolak, sehingga pengguna tidak perlu menunggu balikan dari Rust. */

export const PANJANG_PIN_MIN = 4;
export const PANJANG_PIN_MAKS = 12;

const pesan = (kunci: string, opsi?: Record<string, unknown>) => () => terjemah(kunci, opsi);

export const skemaPin = z
  .string()
  .refine(
    (nilai) => {
      const jumlah = Array.from(nilai).length;
      return jumlah >= PANJANG_PIN_MIN && jumlah <= PANJANG_PIN_MAKS;
    },
    {
      error: pesan("kunci.pinRentang", { min: PANJANG_PIN_MIN, maks: PANJANG_PIN_MAKS }),
    },
  )
  .refine((nilai) => /^[0-9]+$/.test(nilai), { error: pesan("kunci.pinHanyaAngka") });

/** Pesan galat PIN pertama untuk nilai yang sedang diketik, atau null bila sudah sah.
   Nilai kosong sengaja tidak dilaporkan: kolom yang belum disentuh bukan kesalahan. */
export function galatPin(nilai: string): string | null {
  if (nilai.length === 0) return null;
  const hasil = skemaPin.safeParse(nilai);
  return hasil.success ? null : (hasil.error.issues[0]?.message ?? null);
}
