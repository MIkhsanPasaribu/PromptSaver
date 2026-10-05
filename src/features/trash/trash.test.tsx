import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HalamanSampah } from "@/features/trash/components/trash-page";
import {
  hapusPermanenPrompt,
  kosongkanSampah,
  pulihkanPrompt,
} from "@/features/trash/services/trash-service";

vi.mock("@/features/trash/services/trash-service", () => ({
  daftarSampah: vi.fn(async () => [
    {
      id: "p-1",
      judul: "Prompt dibuang",
      isi: "",
      folderId: null,
      namaFolder: null,
      tags: [],
      favorit: false,
      disemat: false,
      dibuatPada: 1,
      diubahPada: 2,
      dipakaiTerakhir: null,
      sampahPada: 3,
      potongan: "Isi prompt yang dibuang",
    },
  ]),
  hapusKeSampah: vi.fn(),
  pulihkanPrompt: vi.fn(async () => undefined),
  hapusPermanenPrompt: vi.fn(async () => undefined),
  kosongkanSampah: vi.fn(async () => 1),
}));

vi.mock("@/features/prompts/services/prompt-service", () => ({
  tandaiPromptDipakai: vi.fn(async () => undefined),
}));

vi.mock("@/lib/notifikasi", () => ({
  beriTahuBerhasil: vi.fn(),
  beriTahuGalat: vi.fn(),
  beriTahuTersalin: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("HalamanSampah", () => {
  it("menampilkan isi sampah dan memakai format waktu lokal", async () => {
    render(<HalamanSampah />);
    await waitFor(() => expect(screen.getByText("Prompt dibuang")).toBeTruthy());
    expect(screen.getByText(/tidak bisa dibatalkan/i)).toBeTruthy();
  }, 15000);

  it("memulihkan prompt tanpa konfirmasi", async () => {
    render(<HalamanSampah />);
    fireEvent.click(await screen.findByRole("button", { name: /pulihkan/i }));
    await waitFor(() => expect(pulihkanPrompt).toHaveBeenCalledWith("p-1"));
  }, 15000);

  it("membutuhkan konfirmasi sebelum hapus permanen", async () => {
    render(<HalamanSampah />);
    fireEvent.click(await screen.findByRole("button", { name: /hapus permanen$/i }));
    expect(hapusPermanenPrompt).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: /ya, hapus permanen/i }));
    await waitFor(() => expect(hapusPermanenPrompt).toHaveBeenCalledWith("p-1"));
  }, 20000);

  it("mengosongkan sampah lewat satu aksi terpisah", async () => {
    const { container } = render(<HalamanSampah />);
    await screen.findByText("Prompt dibuang");

    const tombolKosongkan = [...container.querySelectorAll("button")].find((t) =>
      /kosongkan sampah/i.test(t.textContent ?? ""),
    );
    fireEvent.click(tombolKosongkan!);
    fireEvent.click(await screen.findByRole("button", { name: /ya, hapus permanen/i }));

    await waitFor(() => expect(kosongkanSampah).toHaveBeenCalled());
  }, 20000);
});
