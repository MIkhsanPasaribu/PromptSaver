import { describe, expect, it } from "vitest";

import { skemaFolder, skemaPrompt, skemaTag } from "@/features/prompts/types/prompt-skema";
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
});
