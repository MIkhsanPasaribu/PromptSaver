import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TampilanWidget } from "@/features/widget/components/widget-view";
import { buatPrompt, daftarPrompt } from "@/features/prompts/services/prompt-service";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(async () => undefined),
}));
vi.mock("@/lib/notifikasi", () => ({
  beriTahuTersalin: vi.fn(),
  beriTahuGalat: vi.fn(),
  beriTahuBerhasil: vi.fn(),
  beriTahuPeringatan: vi.fn(),
}));
vi.mock("@/features/prompts/services/prompt-service", () => ({
  daftarPrompt: vi.fn(async () => daftar),
  tandaiPromptDipakai: vi.fn(async () => undefined),
  buatPrompt: vi.fn(async (argumen: { isi: string }) =>
    prompt({ id: "p-baru", judul: "Prompt baru", isi: argumen.isi }),
  ),
}));
vi.mock("@/features/search/services/search-service", () => ({
  cariPrompt: vi.fn(async () => []),
}));
vi.mock("@/features/widget/services/widget-service", () => ({
  simpanGeometriSekarang: vi.fn(async () => undefined),
  deteksiPlatform: vi.fn(() => "desktop"),
}));
// Pengukuran jendela asli tidak ada di jsdom; yang diuji di sini isi widget, bukan mode jendela.
vi.mock("@/features/widget/hooks/use-mode-jendela", () => ({
  gunakanModeJendela: () => ({
    lebar: 288,
    tinggi: 360,
    siap: true,
    modeWidget: true,
    masukWidget: vi.fn(),
    perluas: vi.fn(),
  }),
}));

function prompt(bagian: Partial<Prompt> & { id: string }): Prompt {
  return {
    judul: "Judul",
    isi: "Isi prompt",
    folderId: null,
    namaFolder: null,
    tags: [],
    favorit: false,
    disemat: false,
    dibuatPada: 1,
    diubahPada: 2,
    dipakaiTerakhir: null,
    sampahPada: null,
    ...bagian,
  };
}

const daftar: Prompt[] = [
  prompt({ id: "p-1", judul: "Ringkas jurnal", potongan: "Ringkas jadi dua paragraf" }),
  prompt({ id: "p-2", judul: "Terjemahkan", potongan: "Terjemahkan ke {{bahasa}}", favorit: true }),
];

describe("TampilanWidget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menampilkan satu chip penyaring tanpa tab dan tanpa tombol favorit", async () => {
    render(<TampilanWidget modeWidget />);

    await waitFor(() => expect(screen.getByText("Ringkas jurnal")).toBeTruthy());
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("button", { name: "Favorit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tandai favorit" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Salin prompt / })).toHaveLength(2);
  });

  it("menyalin dari satu ketuk pada baris", async () => {
    render(<TampilanWidget modeWidget />);
    await waitFor(() => expect(screen.getByText("Ringkas jurnal")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Salin prompt Ringkas jurnal" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Isi prompt"));
  });

  it("membersihkan penyaring lewat satu tombol", async () => {
    render(<TampilanWidget modeWidget />);
    await waitFor(() => expect(screen.getByText("Ringkas jurnal")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Favorit" }));
    expect(screen.getByRole("button", { name: "Bersihkan" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bersihkan" }));
    expect(screen.queryByRole("button", { name: "Bersihkan" })).toBeNull();
  });

  it("menolak simpan dari form cepat ketika isi kosong", async () => {
    render(<TampilanWidget modeWidget />);
    await waitFor(() => expect(screen.getByText("Ringkas jurnal")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Prompt baru" }));
    fireEvent.click(await screen.findByRole("button", { name: "Simpan" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(buatPrompt).not.toHaveBeenCalled();
  });

  it("menyimpan dari form cepat lalu memuat ulang daftar", async () => {
    render(<TampilanWidget modeWidget />);
    await waitFor(() => expect(screen.getByText("Ringkas jurnal")).toBeTruthy());
    const sebelum = vi.mocked(daftarPrompt).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Prompt baru" }));
    fireEvent.change(await screen.findByLabelText("Isi prompt"), {
      target: { value: "Prompt dari widget" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() =>
      expect(buatPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ judul: null, isi: "Prompt dari widget" }),
      ),
    );
    await waitFor(() => expect(vi.mocked(daftarPrompt).mock.calls.length).toBeGreaterThan(sebelum));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
