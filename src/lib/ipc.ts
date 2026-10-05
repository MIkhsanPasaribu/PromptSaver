import { invoke } from "@tauri-apps/api/core";

import { terjemahkanPesan } from "@/lib/galat";
import galatId from "@/lib/i18n/sumber/galat-id";

/** Bentuk galat yang dipakai seluruh frontend. isomorf dengan `GalatAplikasi` di Rust. */
export class GalatAplikasi extends Error {
  constructor(
    readonly kode: string,
    pesan: string,
  ) {
    super(pesan);
    this.name = "GalatAplikasi";
  }
}

/** Bentuk JSON galat yang dikirim backend. */
type BENTUK_GALAT = { kode?: string; pesan?: string };

function petakan(mentah: unknown): GalatAplikasi {
  if (mentah instanceof GalatAplikasi) return mentah;
  const objek = (typeof mentah === "object" && mentah !== null ? mentah : {}) as BENTUK_GALAT;
  if (objek.pesan) return new GalatAplikasi(objek.kode ?? "tidak_diketahui", objek.pesan);
  return new GalatAplikasi("tidak_diketahui", galatId.sistem);
}

export async function panggil<T>(command: string, argumen?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, argumen);
  } catch (mentah) {
    throw petakan(mentah);
  }
}

/** Pesan ramah untuk ditampilkan ke pengguna, dalam bahasa antarmuka yang aktif. */
export function pesanGalat(mentah: unknown): string {
  return terjemahkanPesan(petakan(mentah).message);
}

/** Kode stabil untuk membedakan perlakuan UI, misalnya bentrok pintasan. */
export function kodeGalat(mentah: unknown): string {
  return petakan(mentah).kode;
}
