import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import galatId from "@/lib/i18n/sumber/galat-id";
import { gantiBahasa, terjemah } from "@/lib/i18n";
import { terjemahkanPesan } from "@/lib/galat";

describe("terjemahkanPesan", () => {
  it("mengembalikan teks Indonesia utuh saat bahasa aktif Indonesia", async () => {
    await gantiBahasa("id");
    expect(terjemahkanPesan("Isi prompt tidak boleh kosong. Tulis minimal satu kata.")).toBe(
      "Isi prompt tidak boleh kosong. Tulis minimal satu kata.",
    );
  });

  it("menerjemahkan pesan yang cocok persis", async () => {
    await gantiBahasa("en");
    expect(terjemahkanPesan("Nama folder tidak boleh kosong.")).toBe(
      "The folder name cannot be empty.",
    );
    expect(terjemah("galat.namaFolderKosong")).toBe("The folder name cannot be empty.");
  });

  it("menerjemahkan pesan berparameter dan mempertahankan isinya", async () => {
    await gantiBahasa("en");
    expect(terjemahkanPesan('Folder "Riset" sudah ada.')).toBe('Folder "Riset" already exists.');
    expect(terjemahkanPesan("Prompt tidak ditemukan.")).toBe("Prompt not found.");
  });

  it("membiarkan pesan yang tidak dikenal apa adanya", async () => {
    await gantiBahasa("en");
    expect(terjemahkanPesan("Pesan baru dari backend yang belum dipetakan.")).toBe(
      "Pesan baru dari backend yang belum dipetakan.",
    );
  });

  it("memetakan pesan validasi kunci aplikasi (F4)", async () => {
    await gantiBahasa("en");
    expect(terjemahkanPesan("PIN harus 4-12 angka.")).toBe("The PIN must be 4-12 digits.");
    expect(terjemahkanPesan("Jeda kunci otomatis harus 0 sampai 3600 detik.")).toBe(
      "The auto-lock delay must be between 0 and 3600 seconds.",
    );
    expect(terjemahkanPesan("Aplikasi terkunci. Masukkan PIN untuk membuka.")).toBe(
      "The app is locked. Enter your PIN to open it.",
    );
  });

  it("kembali ke bahasa Indonesia untuk test berikutnya", async () => {
    await gantiBahasa("id");
    expect(terjemah("umum.simpan")).toBe("Simpan");
  });
});

/* Penjaga kontrak AGENTS.md Bagian 5: backend sumber kebenaran dan pesannya berbahasa
   Indonesia, frontend memetakan teks itu ke bahasa antarmuka lewat terjemahkanPesan().
   Pemetaan itu bekerja dengan mencocokkan TEKS, jadi pesan Rust yang tidak persis sama dengan
   value galat-id.ts akan lolos dan tampil mentah di antarmuka Inggris. Test ini memindai
   seluruh pemanggilan constructor galat di src-tauri dan menuntut setiap pesan punya kunci. */

const PENANDA = "\u0000";

/** Samakan bagian dinamis: "{maks}" pada Rust dan "{{maks}}" pada kamus dianggap sama. */
function samakanPola(teks: string): string {
  return teks
    .replace(/\{\{[^{}]*\}\}/g, PENANDA)
    .replace(/\{[^{}]*\}/g, PENANDA)
    .trim();
}

function berkasRust(dir: string, hasil: string[] = []): string[] {
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const jalur = join(dir, entri.name);
    if (entri.isDirectory()) berkasRust(jalur, hasil);
    else if (entri.name.endsWith(".rs")) hasil.push(jalur);
  }
  return hasil;
}

/** Potong blok berdasar kurung kurawal yang dimulai setelah `penanda`, supaya definisi
   constructor dan modul test tidak ikut terbaca sebagai pesan. */
function buangBlok(teks: string, penanda: string): string {
  const awal = teks.indexOf(penanda);
  if (awal < 0) return teks;
  const kurawal = teks.indexOf("{", awal);
  if (kurawal < 0) return teks;
  let dalam = 0;
  for (let i = kurawal; i < teks.length; i++) {
    if (teks[i] === "{") dalam++;
    else if (teks[i] === "}") {
      dalam--;
      if (dalam === 0) return teks.slice(0, awal) + teks.slice(i + 1);
    }
  }
  return teks.slice(0, awal);
}

function isiPanggilan(teks: string, idxKuruka: number): string | null {
  let dalam = 0;
  for (let i = idxKuruka; i < teks.length; i++) {
    const c = teks[i];
    if (c === '"') {
      i = lewatiString(teks, i);
      continue;
    }
    if (c === "(") dalam++;
    else if (c === ")") {
      dalam--;
      if (dalam === 0) return teks.slice(idxKuruka + 1, i);
    }
  }
  return null;
}

function lewatiString(teks: string, idxKutip: number): number {
  for (let i = idxKutip + 1; i < teks.length; i++) {
    if (teks[i] === "\\") i++;
    else if (teks[i] === '"') return i;
  }
  return teks.length;
}

function ambilLiteral(teks: string): string[] {
  const hasil: string[] = [];
  for (let i = 0; i < teks.length; i++) {
    if (teks[i] !== '"') continue;
    let j = i + 1;
    let isi = "";
    while (j < teks.length) {
      const c = teks[j];
      if (c === "\\") {
        isi += teks[j + 1] ?? "";
        j += 2;
        continue;
      }
      if (c === '"') break;
      isi += c;
      j++;
    }
    hasil.push(isi);
    i = j;
  }
  return hasil;
}

function kumpulkanPesanRust(): Map<string, string> {
  const pesan = new Map<string, string>();
  for (const jalur of berkasRust("src-tauri/src")) {
    let teks = readFileSync(jalur, "utf8");
    teks = buangBlok(teks, "impl GalatAplikasi {");
    teks = buangBlok(teks, "#[cfg(test)]");
    const pola = /(?:GalatAplikasi|Self)::(baru|validasi|konflik|tidak_ditemukan)\s*\(/g;
    let cocok: RegExpExecArray | null;
    while ((cocok = pola.exec(teks)) !== null) {
      const kuruka = cocok.index + cocok[0].length - 1;
      const isi = isiPanggilan(teks, kuruka);
      if (!isi) continue;
      const literal = ambilLiteral(isi).filter((s) => s.trim().length > 0);
      const namaFungsi = cocok[1];
      let kandidat: string | undefined;
      if (namaFungsi === "tidak_ditemukan") kandidat = `${literal[0]} tidak ditemukan.`;
      else if (namaFungsi === "baru") kandidat = literal[literal.length - 1];
      else kandidat = literal[0];
      // Hanya kalimat yang tampil ke pengguna: diakhiri titik. Kode galat ("checksum") tidak.
      if (kandidat && /\.$/.test(kandidat.trim())) pesan.set(samakanPola(kandidat), jalur);
    }
  }
  return pesan;
}

describe("pesan galat backend terhadap kamus", () => {
  it("setiap pesan Rust punya pasangan di galat-id.ts", () => {
    const kamus = new Set(Object.values(galatId as Record<string, string>).map(samakanPola));
    const hilang = [...kumpulkanPesanRust()]
      .filter(([pesan]) => !kamus.has(pesan))
      .map(([pesan, jalur]) => `  "${pesan}"  <- ${jalur}`);
    expect(hilang, `pesan tanpa kunci kamus:\n${hilang.join("\n")}`).toEqual([]);
  });
});
