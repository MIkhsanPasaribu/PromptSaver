import { panggil } from "@/lib/ipc";

import type {
  RingkasanImpor,
  StrategiKonflik,
} from "@/features/transfer/services/transfer-service";

/** Cermin `Cadangan` di src-tauri/src/features/cadangan/service.rs. */
export type Cadangan = {
  nama: string;
  dibuatPada: number;
  ukuranByte: number;
};

export const daftarCadangan = () => panggil<Cadangan[]>("daftar_cadangan");

export const cadangkanSekarang = () => panggil<Cadangan>("cadangkan_sekarang");

/** Pulihkan memakai jalur impor yang sudah ada: atomik, strategi konflik dipilih pengguna. */
export const pulihkanCadangan = (nama: string, strategi: StrategiKonflik) =>
  panggil<RingkasanImpor>("pulihkan_cadangan", { nama, strategi });
