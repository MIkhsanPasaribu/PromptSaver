import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/** Pembacaan berkas sumber, bukan hasil build: test ini menjaga sumber kebenaran desain.
   Dua hal yang dikunci: tidak ada nama token warna yang didefinisikan dua kali di blok @theme,
   dan nilai tiap token mode terang harus sama dengan yang tertulis di DESIGN.md.
   Path relatif terhadap akar proyek karena vitest berjalan di jsdom tanpa URL berkas. */
const css = readFileSync(resolve("src/styles/index.css"), "utf-8");
const design = readFileSync(resolve("DESIGN.md"), "utf-8");

function blokTheme(teks: string): string[] {
  return [...teks.matchAll(/@theme(?:\s+inline)?\s*\{([\s\S]*?)\n\s*\}/g)].map((m) => m[1] ?? "");
}

function namaWarna(blok: string): string[] {
  return [...blok.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((m) => m[1] ?? "");
}

function nilaiWarna(blok: string): Map<string, string> {
  const hasil = new Map<string, string>();
  for (const m of blok.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*;/g)) {
    if (m[1] && m[2]) hasil.set(`color-${m[1]}`, m[2].toLowerCase());
  }
  return hasil;
}

describe("penjaga token warna", () => {
  const blok = blokTheme(css);

  it("menemukan blok token DESIGN dan blok pemetaan shadcn", () => {
    expect(blok.length).toBeGreaterThanOrEqual(2);
  });

  it("tidak mendefinisikan nama warna yang sama dua kali antar blok @theme", () => {
    const himpunan = blok.map((b) => new Set(namaWarna(b)));
    const tabrak: string[] = [];
    for (let i = 0; i < himpunan.length; i++) {
      for (let j = i + 1; j < himpunan.length; j++) {
        const a = himpunan[i];
        const b = himpunan[j];
        if (!a || !b) continue;
        for (const nama of a) if (b.has(nama)) tabrak.push(nama);
      }
    }
    expect(tabrak).toEqual([]);
  });

  it("nilai token mode terang sama dengan DESIGN.md", () => {
    const depan = design.split(/^---\s*$/m)[1] ?? "";
    const dariDesain = new Map<string, string>();
    for (const m of depan.matchAll(/^ {2}([a-z0-9-]+):\s*"(#[0-9A-Fa-f]{3,8})"/gm)) {
      if (m[1] && m[2] && !m[1].startsWith("dark-")) {
        dariDesain.set(`color-${m[1]}`, m[2].toLowerCase());
      }
    }
    expect(dariDesain.size).toBeGreaterThan(20);

    const diCss = nilaiWarna(blok[0] ?? "");
    const beda = [...dariDesain].filter(([k, v]) => diCss.get(k) !== v);
    expect(beda).toEqual([]);
  });
});
