import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BATAS_PANJANG } from "@/features/prompts/types/prompt.types";
import { WIDGET_MAKS, WIDGET_MIN } from "@/app/store/pengaturan-store";
import { UKURAN_AWAL } from "@/features/widget/hooks/use-mode-jendela";

/** Beberapa angka sengaja ditulis dua kali: backend Rust memakainya untuk validasi, frontend
   untuk membatasi mengetik dan memilih mode shell. Penjaga ini menolak saat salah satu sisi
   digeser, karena drift di sini berarti form frontend menerima input yang ditolak backend. */
const nilaiKarang = (jalur: string, nama: string): string => {
  const isi = readFileSync(`src-tauri/${jalur}`, "utf8");
  const cocok = isi.match(new RegExp(`pub const ${nama}: [^=]+ = ([^;]+);`))?.[1];
  if (!cocok) throw new Error(`${nama} tidak ditemukan di src-tauri/${jalur}`);
  return cocok.trim();
};

const angkaKarang = (jalur: string, nama: string) =>
  Number(nilaiKarang(jalur, nama).replace(/_/g, ""));

const pasanganKarang = (jalur: string, nama: string) => {
  const [lebar, tinggi] = nilaiKarang(jalur, nama)
    .replace(/[()]/g, "")
    .split(",")
    .map((nilai) => Number(nilai.trim()));
  return { lebar, tinggi };
};

describe("konstanta cermin frontend dan backend", () => {
  it("batas panjang mengikuti service dan model Rust", () => {
    expect(BATAS_PANJANG.isiMaks).toBe(angkaKarang("src/features/prompts/model.rs", "PANJANG_ISI_MAKS"));
    expect(BATAS_PANJANG.judulMaks).toBe(
      angkaKarang("src/features/prompts/model.rs", "PANJANG_JUDUL_MAKS"),
    );
    expect(BATAS_PANJANG.namaFolderMaks).toBe(
      angkaKarang("src/features/folders/service.rs", "PANJANG_NAMA_MAKS"),
    );
    expect(BATAS_PANJANG.namaTagMaks).toBe(
      angkaKarang("src/features/tags/service.rs", "PANJANG_NAMA_MAKS"),
    );
  });

  it("ambang mode jendela mengikuti mode_jendela.rs", () => {
    expect(WIDGET_MIN).toEqual(pasanganKarang("src/features/widget/mode_jendela.rs", "UKURAN_WIDGET_MIN"));
    expect(WIDGET_MAKS).toEqual(pasanganKarang("src/features/widget/mode_jendela.rs", "UKURAN_WIDGET_MAKS"));
  });

  it("ukuran awal shell mengikuti konfigurasi jendela Tauri", () => {
    const konfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    const jendela = konfig.app.windows[0];
    expect(UKURAN_AWAL).toEqual({ lebar: jendela.width, tinggi: jendela.height });
  });
});
