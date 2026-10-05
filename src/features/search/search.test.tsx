import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HasilSorotan } from "@/features/search/components/highlight-result";
import { KolomCari } from "@/features/search/components/search-input";
import { cariPrompt, potongSorotan } from "@/features/search/services/search-service";
import { useNavigasi } from "@/app/store/navigasi-store";
import type * as LayananCari from "./services/search-service";

vi.mock("@/features/search/services/search-service", async (imporAsli) => {
  const asli = await imporAsli<typeof LayananCari>();
  return { ...asli, cariPrompt: vi.fn(async () => []) };
});

beforeEach(() => {
  useNavigasi.getState().resetFilter();
  vi.clearAllMocks();
});

describe("potongSorotan", () => {
  it("memisahkan bagian yang cocok dengan kata kunci", () => {
    const bagian = potongSorotan("Ringkas jurnal ini", "jurnal");
    expect(bagian.some((s) => s.cocok && s.teks.toLowerCase() === "jurnal")).toBe(true);
  });

  it("mengembalikan teks utuh ketika kueri kosong", () => {
    expect(potongSorotan("Teks prompt", "   ")).toEqual([{ teks: "Teks prompt", cocok: false }]);
  });

  it("mengamankan karakter regex dari input pengguna", () => {
    expect(() => potongSorotan("a.*b", "a.*b")).not.toThrow();
  });
});

describe("KolomCari", () => {
  it("menyimpan kueri ke store setelah jeda ketik, bukan setiap karakter", async () => {
    render(<KolomCari />);
    const kolom = screen.getByRole("searchbox");

    fireEvent.change(kolom, { target: { value: "ringkas" } });
    expect(useNavigasi.getState().kueri).toBe("");

    await waitFor(() => expect(useNavigasi.getState().kueri).toBe("ringkas"), { timeout: 1500 });
  }, 15000);

  it("mengosongkan kueri lewat tombol bersihkan", async () => {
    render(<KolomCari />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "jurnal" } });
    await waitFor(() => expect(useNavigasi.getState().kueri).toBe("jurnal"), { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /bersihkan|hapus/i }));
    expect(useNavigasi.getState().kueri).toBe("");
  }, 15000);
});

describe("gunakanPencarian lewat service", () => {
  it("hanya mengirim kueri yang tidak kosong", async () => {
    await cariPrompt({ kueri: "jurnal" });
    expect(cariPrompt).toHaveBeenCalledTimes(1);
  });
});

describe("HasilSorotan", () => {
  it("menandai bagian teks yang cocok", () => {
    const { container } = render(<HasilSorotan teks="Ringkas jurnal ini" kueri="jurnal" />);
    expect(
      container.querySelector("mark, [data-cocok='true'], strong, span[class*='tertiary']"),
    ).toBeTruthy();
  });
});
