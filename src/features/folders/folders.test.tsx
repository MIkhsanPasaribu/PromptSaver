import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DaftarFolder } from "@/features/folders/components/folder-list";
import { hapusFolder } from "@/features/folders/services/folder-service";
import { useNavigasi } from "@/app/store/navigasi-store";

vi.mock("@/features/folders/services/folder-service", () => ({
  daftarFolder: vi.fn(async () => [
    { id: "f-1", nama: "Riset", jumlahPrompt: 2, dibuatPada: 1, diubahPada: 1 },
  ]),
  buatFolder: vi.fn(),
  ubahNamaFolder: vi.fn(),
  hapusFolder: vi.fn(async () => undefined),
}));

vi.mock("@/lib/notifikasi", () => ({
  beriTahuBerhasil: vi.fn(),
  beriTahuGalat: vi.fn(),
  beriTahuTersalin: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useNavigasi.getState().resetFilter();
});

describe("DaftarFolder", () => {
  it("memuat folder dan dua filter tetap", async () => {
    const { container } = render(<DaftarFolder />);
    await waitFor(() => expect(screen.getByText("Riset")).toBeTruthy());
    expect(screen.getByText("Semua Prompt")).toBeTruthy();
    expect(screen.getByText("Tanpa Folder")).toBeTruthy();
    expect(container.querySelectorAll("button").length > 3).toBe(true);
  }, 15000);

  it("memilih folder mengatur filter koleks", async () => {
    render(<DaftarFolder />);
    await waitFor(() => expect(screen.getByText("Riset")).toBeTruthy());

    fireEvent.click(screen.getByText("Riset"));
    expect(useNavigasi.getState().folderId).toBe("f-1");

    fireEvent.click(screen.getByText("Tanpa Folder"));
    expect(useNavigasi.getState().tanpaFolder).toBe(true);
  }, 15000);

  it("menentukan tujuan prompt sebelum menghapus folder berisi prompt", async () => {
    const { container } = render(<DaftarFolder />);
    await waitFor(() => expect(screen.getByText("Riset")).toBeTruthy());

    fireEvent.click(container.querySelector('[aria-label="Hapus folder Riset"]')!);

    // Tahap pertama: wajib memilih tujuan prompt, tidak ada opsi hapus langsung.
    const keSampah = await screen.findByRole("button", { name: /pindahkan ke sampah/i });
    expect(screen.getByRole("button", { name: /tanpa folder/i })).toBeTruthy();
    expect(hapusFolder).not.toHaveBeenCalled();

    fireEvent.click(keSampah);

    // Tahap kedua: konfirmasi, baru setelah itu data dihapus.
    fireEvent.click(await screen.findByRole("button", { name: "Hapus folder" }));
    await waitFor(() => expect(hapusFolder).toHaveBeenCalledWith("f-1", "pindahkan-ke-sampah"));
  }, 20000);
});
