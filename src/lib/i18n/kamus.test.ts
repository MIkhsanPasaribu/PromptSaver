import { describe, expect, it } from "vitest";

/** Penjaga sumber daya i18n. Semua kelompok harus punya kunci yang sama di kedua bahasa,
   tidak ada nilai kosong, dan tidak ada kunci Inggris yang masih berisi teks Indonesia
   (kecuali memang nama merek atau kata yang sama di kedua bahasa). */
type Modul = { default?: Record<string, string> };

const SUMBER_ID = import.meta.glob("./sumber/*-id.ts", { eager: true }) as Record<string, Modul>;
const SUMBER_EN = import.meta.glob("./sumber/*-en.ts", { eager: true }) as Record<string, Modul>;

/** Kata yang memang identik di kedua bahasa. Menambah entri di sini harus disengaja. */
const SAMA_BOLEH = new Set([
  "PromptSaver",
  "Folder",
  "Baru",
  "Kosong",
  "Masih aktif",
  "KB",
  "MB",
  "GB",
  "Edit",
  "Tag",
  "{{angka}} KB",
  "{{angka}} MB",
]);

const nama = (jalur: string) => jalur.replace(/^\.\/sumber\//, "").replace(/-(id|en)\.ts$/, "");

function isi(jalur: string): Record<string, string> {
  const kamus = jalur.endsWith("-id.ts") ? SUMBER_ID : SUMBER_EN;
  return kamus[jalur]?.default ?? {};
}

const kelompokId = Object.keys(SUMBER_ID).map(nama).sort();
const pasangan = kelompokId.map((kelompok) => ({
  kelompok,
  id: isi(`./sumber/${kelompok}-id.ts`),
  en: isi(`./sumber/${kelompok}-en.ts`),
}));

const placeholder = (teks: string) =>
  [...teks.matchAll(/\{\{(\w+)\}\}/g)]
    .map((cocok) => cocok[1])
    .filter((n): n is string => Boolean(n))
    .sort();

describe("sumber daya i18n", () => {
  it("punya berkas id dan en untuk setiap kelompok", () => {
    expect(kelompokId.length).toBeGreaterThan(0);
    expect(Object.keys(SUMBER_EN).map(nama).sort()).toEqual(kelompokId);
  });

  it.each(pasangan)("kunci kelompok $kelompok sama di kedua bahasa", ({ id, en }) => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
  });

  it.each(pasangan)("nilai kelompok $kelompok terisi dan placeholder-nya cocok", ({ id, en }) => {
    for (const [kunci, teks] of Object.entries(id)) {
      expect(teks.trim(), `${kunci} kosong`).not.toBe("");
      const english = en[kunci] ?? "";
      expect(english.trim(), `${kunci} kosong dalam bahasa Inggris`).not.toBe("");
      expect(placeholder(english), kunci).toEqual(placeholder(teks));
    }
  });

  it.each(pasangan)("kelompok $kelompok tidak menunda terjemahan", ({ id, en, kelompok }) => {
    const tertinggal = Object.keys(id).filter(
      (kunci) => id[kunci] === en[kunci] && !SAMA_BOLEH.has(id[kunci] ?? ""),
    );
    expect(
      tertinggal,
      `${kelompok}: masih sama dengan Indonesia: ${tertinggal.join(", ")}`,
    ).toEqual([]);
  });
});
