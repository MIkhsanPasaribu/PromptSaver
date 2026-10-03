import { z } from "zod";

import { terjemah } from "@/lib/i18n";
import { BATAS_PANJANG, WARNA_TAG, type TagBaru } from "./prompt.types";

/** Skema form prompt. Pesan error Bahasa Indonesia dan tampil inline di bawah field.
   Backend memvalidasi ulang, skema ini hanya mempercepat umpan balik. */

/** Pesan validasi dihitung saat parse, bukan saat modul dimuat: skema dibuat sekali ketika
   diimpor, sedangkan bahasa bisa berganti kapan saja lewat Pengaturan. Karena `error` berupa
   fungsi, Zod memintakan terjemahan ke i18next setiap kali isu dibuat, jadi pesan ikut bahasa
   aktif tanpa mengubah bentuk ekspor skema yang dipakai form prompt, form tambah cepat widget,
   fitur folder/tag, dan test. */
const pesan = (kunci: string, opsi?: Record<string, unknown>) => () => terjemah(kunci, opsi);

/** Aturan nama yang sama dipakai skemaPrompt (tag baru dari form prompt) dan skemaTag,
   supaya satu nama tidak lolos di satu form dan ditolak di form lain. Karakter yang
   dilarang diambil dari `tags::service::normalisasi_nama` dan `folders::service` di Rust. */
const namaTag = z
  .string()
  .trim()
  .min(1, { error: pesan("prompt.namaTagKosong") })
  .max(BATAS_PANJANG.namaTagMaks, {
    error: pesan("prompt.namaTagMaks", { maks: BATAS_PANJANG.namaTagMaks }),
  })
  .refine((nilai) => !nilai.includes("#"), { error: pesan("prompt.namaTagTagar") })
  .refine((nilai) => !/[\n\r]/.test(nilai), { error: pesan("prompt.namaTagBarisBaru") });

const namaFolder = z
  .string()
  .trim()
  .min(1, { error: pesan("prompt.namaFolderKosong") })
  .max(BATAS_PANJANG.namaFolderMaks, {
    error: pesan("prompt.namaFolderMaks", { maks: BATAS_PANJANG.namaFolderMaks }),
  })
  .refine((nilai) => !/[\n\r]/.test(nilai), { error: pesan("prompt.namaFolderBarisBaru") });

export const skemaPrompt = z
  .object({
    judul: z
      .string()
      .max(BATAS_PANJANG.judulMaks, {
        error: pesan("prompt.judulMaks", { maks: BATAS_PANJANG.judulMaks }),
      })
      .optional()
      .or(z.literal("")),
    isi: z
      .string()
      .min(1, { error: pesan("prompt.isiWajibSatuKata") })
      .refine((nilai) => nilai.trim().length > 0, {
        error: pesan("prompt.isiHanyaSpasi"),
      })
      .max(BATAS_PANJANG.isiMaks, {
        error: pesan("prompt.isiMaks", { maks: BATAS_PANJANG.isiMaks }),
      }),
    folderId: z.string().nullable().optional(),
    tagIds: z.array(z.string()).default([]),
    tagBaru: z
      .array(
        z.object({
          nama: namaTag,
          warna: z.enum(WARNA_TAG as [string, ...string[]]).optional(),
        }),
      )
      .default([]),
  })
  .refine((nilai) => nilai.isi.trim().length > 0, {
    path: ["isi"],
    error: pesan("prompt.isiWajib"),
  });

export type FormPrompt = {
  judul?: string;
  isi: string;
  folderId?: string | null;
  tagIds: string[];
  tagBaru: TagBaru[];
};

export const skemaFolder = z.object({
  nama: namaFolder,
});

export const skemaTag = z.object({
  nama: namaTag,
  warna: z.enum(WARNA_TAG as [string, ...string[]]).default("kuning"),
});
