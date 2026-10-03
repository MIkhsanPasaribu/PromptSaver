import { describe, expect, it } from "vitest";

import { potongTeks } from "@/lib/teks";

describe("potongTeks", () => {
  it("membiarkan teks yang tidak melebihi batas", () => {
    expect(potongTeks("Prompt pendek", 40)).toBe("Prompt pendek");
  });

  it("memotong pada batas karakter Unicode dan menambah elipsis", () => {
    const hasil = potongTeks("a".repeat(120), 90);
    expect(hasil).toBe(`${"a".repeat(90)}…`);
    expect(Array.from(hasil)).toHaveLength(91);
  });

  it("tidak memotong emoji jadi karakter rusak", () => {
    const teks = "🎉".repeat(20);
    const hasil = potongTeks(teks, 5);
    expect(hasil).toBe(`${"🎉".repeat(5)}…`);
    expect(hasil).not.toContain("\uFFFD");
  });

  it("membuang spasi di ujung sebelum elipsis", () => {
    expect(potongTeks("abc   def", 5)).toBe("abc…");
  });
});
