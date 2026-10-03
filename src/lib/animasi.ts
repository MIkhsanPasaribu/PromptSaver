import type { Target, Transition } from "motion/react";

/** Durasi dan easing tunggal untuk seluruh aplikasi. Sumber: DESIGN.md bagian Motion. */
export const DURASI = {
  mikro: 0.12,
  komponen: 0.18,
  overlay: 0.22,
  layar: 0.26,
  widget: 0.28,
  jedaBaris: 0.024,
  jedaMaks: 0.2,
} as const;

export const EASING = {
  standar: [0.2, 0.8, 0.2, 1] as const,
  keluar: [0.4, 0, 1, 1] as const,
} as const;

/** Bentuk varian gerak: keadaan awal, keadaan tujuan, dan transisinya. */
export type VariasiGerak = {
  initial: Target;
  animate: Target;
  exit?: Target;
  transition: Transition;
};

export const VARIAN = {
  /** Baris baru masuk tanpa menggeser layout yang mahal. */
  masukBaris: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: DURASI.komponen, ease: EASING.standar },
  },

  /** Dialog. Scrim hanya opacity. */
  dialog: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 4 },
    transition: { duration: DURASI.komponen, ease: EASING.standar },
  },

  scrim: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURASI.overlay, ease: EASING.standar },
  },

  /** Transisi layar pada shell mobile. */
  layar: {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 },
    transition: { duration: DURASI.layar, ease: EASING.standar },
  },

  /** Umpan balik "Tersalin". Muncul tanpa delay karena clipboard ditulis lebih dulu. */
  toast: {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6 },
    transition: { duration: DURASI.mikro, ease: EASING.standar },
  },
} satisfies Record<string, VariasiGerak>;

export type VariasiNama = keyof typeof VARIAN;

/**
 * Jeda stagger yang dibatasi. Daftar panjang tidak di-stagger supaya anggaran frame
 * tetap aman di perangkat rendah (PRD E2).
 */
export function jedaBaris(indeks: number, jumlahBaris: number): number {
  if (jumlahBaris > 20) return 0;
  return Math.min(indeks * DURASI.jedaBaris, DURASI.jedaMaks);
}
