import { describe, expect, it } from "vitest";

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
