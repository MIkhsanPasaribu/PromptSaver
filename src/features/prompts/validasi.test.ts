import { describe, expect, it } from "vitest";

import { skemaFolder, skemaPrompt, skemaTag } from "@/features/prompts/types/prompt-skema";
import { BATAS_PANJANG } from "@/features/prompts/types/prompt.types";
import { variabelDariTeks } from "@/features/prompts/services/variabel-service";

/** Aturan frontend harus mencerminkan service Rust: nama_sahih di variabel/service.rs dan
   normalisasi_nama di tags serta folders. Ujiannya di sini supaya pergeseran satu sisi
   terlihat sebagai test merah, bukan sebagai data yang tertolak setelah disimpan. */
describe("skemaTag dan skemaFolder", () => {
  it("menolak nama kosong setelah dipangkas", () => {
    expect(skemaTag.safeParse({ nama: "   " }).success).toBe(false);
    expect(skemaFolder.safeParse({ nama: " \n " }).success).toBe(false);
  });

  it("menolak baris baru pada nama tag dan folder", () => {
    expect(skemaTag.safeParse({ nama: "riset\nakademik" }).success).toBe(false);
    expect(skemaFolder.safeParse({ nama: "Riset\ralam" }).success).toBe(false);
  });

  it("menolak tanda pagar pada nama tag", () => {
    expect(skemaTag.safeParse({ nama: "#riset" }).success).toBe(false);
  });

  it("menerima nama biasa dan memaklumkan spasi di ujung", () => {
    const hasil = skemaTag.safeParse({ nama: "  akademik  " });
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.nama).toBe("akademik");
  });

  it("memakai aturan tag yang sama untuk tag baru dari form prompt", () => {
    const dasar = { isi: "Isi prompt", judul: "", folderId: null, tagIds: [], tagBaru: [] };
    expect(skemaPrompt.safeParse({ ...dasar, tagBaru: [{ nama: "riset#1" }] }).success).toBe(false);
    expect(skemaPrompt.safeParse({ ...dasar, tagBaru: [{ nama: "riset" }] }).success).toBe(true);
  });
});

describe("variabelDariTeks", () => {
  it("mengenal nama biasa dan yang berjarak di dalam kurung", () => {
    expect(variabelDariTeks("Terjemahkan ke {{bahasa}} dan {{ nada }}")).toEqual([
      "bahasa",
      "nada",
    ]);
  });

  it("mengabaikan nama yang ditolak backend", () => {
    expect(variabelDariTeks("contoh {{a b}} {{}} {{🎉}}")).toEqual([]);
    expect(variabelDariTeks(`{{${"x".repeat(41)}}}`)).toEqual([]);
  });

  it("menerima garis bawah, tanda hubung, titik, dan angka", () => {
    expect(variabelDariTeks("{{nama_1}} {{nama-2}} {{nama.3}}")).toEqual([
      "nama_1",
      "nama-2",
      "nama.3",
    ]);
  });

  /** Dua aturan yang dulu dijaga `deteksi_variabel` di Rust. Fungsi itu dihapus karena tidak ada
     jalur produksi yang memanggilnya, jadi aturannya dikunci di sini: nama yang sama muncul
     berulang hanya dihitung sekali, dan kurung buka tanpa penutup bukan variabel. */
  it("mencatat nama yang sama hanya sekali, sesuai urutan kemunculan", () => {
    expect(
      variabelDariTeks("Terjemahkan ke {{bahasa}} dengan gaya {{tone}}, lalu ringkas ke {{bahasa}}"),
    ).toEqual(["bahasa", "tone"]);
  });

  it("menganggap kurung buka tanpa penutup sebagai teks biasa", () => {
    expect(variabelDariTeks("{{bahasa tanpa penutup")).toEqual([]);
    expect(variabelDariTeks("bahasa}}")).toEqual([]);
  });
});

/** `chars().count()` di Rust menghitung code point, `.length` di JavaScript menghitung unit
   UTF-16. Tanpa penyamaan satuan, prompt ber-emoji bisa ditolak client padahal backend
   menerimanya. Test ini mengunci client memakai satuan yang sama dengan backend. */
describe("batas panjang dihitung dengan code point", () => {
  it("menerima isi yang pas di batas walau berisi emoji", () => {
    const emoji = "🙂";
    expect(emoji.length).toBeGreaterThan(1);
    const isi = "a".repeat(BATAS_PANJANG.isiMaks - 1) + emoji;
    expect(Array.from(isi).length).toBe(BATAS_PANJANG.isiMaks);
    expect(skemaPrompt.safeParse({ isi }).success).toBe(true);
  });

  it("menolak isi yang melewati batas dengan satu emoji di ujung", () => {
    const isi = "a".repeat(BATAS_PANJANG.isiMaks) + "🙂";
    expect(skemaPrompt.safeParse({ isi }).success).toBe(false);
  });

  it("tetap menolak nama tag yang melewati batasnya", () => {
    const nama = "🙂".repeat(BATAS_PANJANG.namaTagMaks + 1);
    expect(skemaTag.safeParse({ nama }).success).toBe(false);
  });
});
