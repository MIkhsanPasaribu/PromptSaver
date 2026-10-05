import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DaftarVersiPrompt } from "@/features/prompts/components/version-list";
import {
  daftarRiwayatPrompt,
  pulihkanVersiPrompt,
} from "@/features/prompts/services/prompt-service";
import { GalatAplikasi } from "@/lib/ipc";
import type { Prompt, VersiPrompt } from "@/features/prompts/types/prompt.types";

vi.mock("@/features/prompts/services/prompt-service", () => ({
  daftarRiwayatPrompt: vi.fn(async () => [] as VersiPrompt[]),
  pulihkanVersiPrompt: vi.fn(),
}));

vi.mock("@/lib/notifikasi", () => ({
  beriTahuBerhasil: vi.fn(),
  beriTahuGalat: vi.fn(),
}));

const contohPrompt: Prompt = {
  id: "p-1",
  judul: "Ringkas jurnal",
  isi: "Isi terbaru",
  folderId: null,
  namaFolder: null,
  tags: [],
  favorit: false,
  disemat: false,
  dibuatPada: 1,
  diubahPada: 2,
  dipakaiTerakhir: null,
  sampahPada: null,
};

const ISI_PANJANG = `${"Isi lama yang panjang ".repeat(8)}Ekor`;

const contohVersi: VersiPrompt = {
  id: "v-1",
  promptId: "p-1",
  judul: "Ringkas jurnal lama",
  isi: ISI_PANJANG,
  disimpanPada: 1_700_000_000_000,
};

describe("DaftarVersiPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(daftarRiwayatPrompt).mockResolvedValue([contohVersi]);
  });

  it("tidak memanggil command riwayat sebelum daftar dibuka", async () => {
    render(<DaftarVersiPrompt promptId="p-1" onPulih={vi.fn()} />);
    expect(screen.getByText("Riwayat versi")).toBeTruthy();
    await waitFor(() => expect(daftarRiwayatPrompt).not.toHaveBeenCalled());
  });

  it("memuat dan menampilkan isi yang dipotong saat dibuka", async () => {
    render(<DaftarVersiPrompt promptId="p-1" onPulih={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lihat" }));

    const baris = await screen.findByText(/^Isi lama yang panjang/);
    expect(baris.textContent).toBe(`${ISI_PANJANG.slice(0, 90)}…`);
    expect(baris.textContent).not.toContain("Ekor");
    expect(daftarRiwayatPrompt).toHaveBeenCalledWith("p-1");
  });

  it("menyebutkan koleksi kosong tanpa memanggil ulang", async () => {
    vi.mocked(daftarRiwayatPrompt).mockResolvedValue([]);
    render(<DaftarVersiPrompt promptId="p-1" onPulih={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lihat" }));

    expect(await screen.findByText(/Belum ada versi lama/)).toBeTruthy();
  });

  it("menampilkan pesan galat bila riwayat gagal dimuat", async () => {
    vi.mocked(daftarRiwayatPrompt).mockRejectedValue(
      new GalatAplikasi("tidak_diketahui", "Riwayat tidak dapat dibaca."),
    );
    render(<DaftarVersiPrompt promptId="p-1" onPulih={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Lihat" }));

    expect(await screen.findByText("Riwayat tidak dapat dibaca.")).toBeTruthy();
  });

  it("memerlukan konfirmasi sebelum memanggil command pulihkan", async () => {
    const hasilSetelahPulih: Prompt = { ...contohPrompt, isi: contohVersi.isi };
    vi.mocked(pulihkanVersiPrompt).mockResolvedValue(hasilSetelahPulih);
    const onPulih = vi.fn();

    render(<DaftarVersiPrompt promptId="p-1" onPulih={onPulih} />);
    fireEvent.click(screen.getByRole("button", { name: "Lihat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Pulihkan" }));

    expect(pulihkanVersiPrompt).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Ya, pulihkan" }));

    await waitFor(() => expect(pulihkanVersiPrompt).toHaveBeenCalledWith("p-1", "v-1"));
    expect(onPulih).toHaveBeenCalledWith(hasilSetelahPulih);
    // Daftar dimuat ulang supaya versi sebelum pemulihan muncul sebagai entri baru.
    await waitFor(() => expect(daftarRiwayatPrompt).toHaveBeenCalledTimes(2));
  });
});
