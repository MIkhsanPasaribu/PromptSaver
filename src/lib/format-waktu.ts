/** Format tanggal dan ukuran mengikuti bahasa antarmuka, bukan hanya lokal perangkat (PRD Bagian 5).
   Pembentuknya dibuat sekali per kombinasi bahasa dan opsi karena `Intl.DateTimeFormat` relatif
   mahal dibanding pemanggilannya. */

import { bahasaAktif, terjemah } from "@/lib/i18n";

const CACHE = new Map<string, Intl.DateTimeFormat>();

function kodeWilayah(): string {
  return bahasaAktif() === "id" ? "id-ID" : "en-GB";
}

function pembentuk(opsi: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const kunci = `${kodeWilayah()}|${JSON.stringify(opsi)}`;
  const tersimpan = CACHE.get(kunci);
  if (tersimpan) return tersimpan;
  const baru = new Intl.DateTimeFormat(kodeWilayah(), opsi);
  CACHE.set(kunci, baru);
  return baru;
}

export function tanggalLengkap(epochMs: number): string {
  return pembentuk({ dateStyle: "medium", timeStyle: "short" }).format(new Date(epochMs));
}

export function tanggalHari(epochMs: number): string {
  return pembentuk({ dateStyle: "long" }).format(new Date(epochMs));
}

/** Waktu relatif singkat untuk kartu daftar. */
export function tanggalRelatif(epochMs: number): string {
  const detik = Math.round((Date.now() - epochMs) / 1000);
  if (detik < 60) return terjemah("waktu.baruSaja");
  const menit = Math.round(detik / 60);
  if (menit < 60) return terjemah("waktu.menit", { jumlah: menit });
  const jam = Math.round(menit / 60);
  if (jam < 24) return terjemah("waktu.jam", { jumlah: jam });
  const hari = Math.round(jam / 24);
  if (hari < 30) return terjemah("waktu.hari", { jumlah: hari });
  return tanggalHari(epochMs);
}

/** Ukuran berkas sebagai teks, bukan angka mentah, supaya bebannya terasa. */
export function ukuranBerkas(byte: number): string {
  const wilayah = kodeWilayah();
  if (byte < 1024) return `${byte} B`;
  const kilo = byte / 1024;
  if (kilo < 1024) return `${kilo.toLocaleString(wilayah, { maximumFractionDigits: 1 })} KB`;
  return `${(kilo / 1024).toLocaleString(wilayah, { maximumFractionDigits: 2 })} MB`;
}
