import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HalamanTransfer } from "@/features/transfer/components/transfer-page";
import { gunakanTransfer } from "@/features/transfer/hooks/use-transfer";
import * as layanan from "@/features/transfer/services/transfer-service";
import type { CakupanEkspor } from "@/features/transfer/services/transfer-service";
import type * as TipeLayanan from "@/features/transfer/services/transfer-service";

vi.mock("@/features/transfer/services/transfer-service", async (imporAsli) => {
  const asli = await imporAsli<typeof TipeLayanan>();
  return {
    ...asli,
    eksporKoleksi: vi.fn(async () => ringkasan),
    eksporKeFolder: vi.fn(async () => ({ ...ringkasan, lokasi: folderTukar })),
    daftarBerkasEkspor: vi.fn(async () => ({
      folder: folderTukar,
      berkas: [`${folderTukar}/a.promptsaver`],
    })),
    pratinjauImpor: vi.fn(async () => pratinjau),
    pratinjauImporTeks: vi.fn(async () => pratinjau),
    imporKoleksi: vi.fn(async () => hasil),
    imporKoleksiTeks: vi.fn(async () => hasil),
    namaBerkasBaku: vi.fn(async () => "koleksi-promptsaver.promptsaver"),
  };
});

// Layar transfer menampilkan satu bentuk antarmuka per platform; test ini memakai bentuk mobile
// karena jalur pemilih berkas WebView hanya ada di sana.
vi.mock("@/lib/platform", () => ({ deteksiPlatform: () => "mobile" }));
vi.mock("@/features/prompts/services/prompt-service", () => ({
  daftarPrompt: vi.fn(async () => []),
  statistikKoleksi: vi.fn(async () => ({
    jumlahPrompt: 2,
    jumlahFolder: 1,
    jumlahTag: 2,
    jumlahSampah: 0,
    ukuranDatabaseKb: 12,
  })),
}));

const folderTukar = "/storage/emulated/0/Android/data/com.promptsaver.app/files/Documents/ekspor";
const ringkasan: TipeLayanan.RingkasanEkspor = {
  jumlahPrompt: 3,
  jumlahFolder: 1,
  jumlahTag: 2,
  ukuranByte: 1024,
  lokasi: "C:/Users/mikhs/Downloads/koleksi.promptsaver",
};
const pratinjau: TipeLayanan.PratinjauImpor = {
  jumlahPrompt: 3,
  jumlahFolder: 1,
  jumlahTag: 2,
  bentrok: 0,
  versiSkema: 1,
  ukuranByte: 1024,
};
const hasil: TipeLayanan.RingkasanImpor = {
  ditambah: 3,
  dilewati: 0,
  ditimpa: 0,
  gagal: 0,
  pesan: [],
};

describe("gunakanTransfer jalur folder tukar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menyimpan ringkasan ekspor folder dan memuat daftar berkas", async () => {
    const { result } = renderHook(() => gunakanTransfer());

    const cakupan: CakupanEkspor = "semua";
    const ok = await result.current.eksporKeFolder(cakupan, []);
    expect(ok).toBe(true);
    expect(vi.mocked(layanan.eksporKeFolder)).toHaveBeenCalledWith(cakupan, []);

    await act(async () => {
      await result.current.muatBerkasTukar();
    });
    expect(result.current.berkasTukar?.folder).toBe(folderTukar);
    expect(result.current.berkasTukar?.berkas).toEqual([`${folderTukar}/a.promptsaver`]);
  });

  it("memakai path folder tukar untuk pratinjau dan impor seperti jalur desktop", async () => {
    const { result } = renderHook(() => gunakanTransfer());
    const path = `${folderTukar}/a.promptsaver`;

    let sudahDipratinjau = false;
    await act(async () => {
      sudahDipratinjau = await result.current.hitungPratinjau({ path });
    });
    expect(sudahDipratinjau).toBe(true);
    expect(vi.mocked(layanan.pratinjauImpor)).toHaveBeenCalledWith(path);
    expect(result.current.pratinjau?.jumlahPrompt).toBe(3);

    let sudahDiimpor = false;
    await act(async () => {
      sudahDiimpor = await result.current.jalankanImpor({ path }, "lewati-duplikat");
    });
    expect(sudahDiimpor).toBe(true);
    expect(result.current.hasil?.ditambah).toBe(3);
    expect(result.current.pratinjau).toBeNull();
  });

  it("memakai command berbasis teks bila sumbernya isi berkas", async () => {
    const { result } = renderHook(() => gunakanTransfer());

    await act(async () => {
      expect(await result.current.hitungPratinjau({ teks: "{}" })).toBe(true);
    });
    expect(vi.mocked(layanan.pratinjauImporTeks)).toHaveBeenCalledWith("{}");
    expect(vi.mocked(layanan.pratinjauImpor)).not.toHaveBeenCalled();

    await act(async () => {
      expect(await result.current.jalankanImpor({ teks: "{}" }, "lewati-duplikat")).toBe(true);
    });
    expect(vi.mocked(layanan.imporKoleksiTeks)).toHaveBeenCalledWith("{}", "lewati-duplikat");
    expect(vi.mocked(layanan.imporKoleksi)).not.toHaveBeenCalled();
  });

  it("galat layanan dilaporkan lewat state, bukan lemparan", async () => {
    vi.mocked(layanan.daftarBerkasEkspor).mockRejectedValueOnce(new Error("folder tidak terbaca"));
    const { result } = renderHook(() => gunakanTransfer());

    await act(async () => {
      await result.current.muatBerkasTukar();
    });

    expect(result.current.berkasTukar).toBeNull();
    expect(result.current.galat).toMatch(/tidak terduga|tidak terbaca/);
  });
});

describe("HalamanTransfer jalur mobile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengirim isi berkas yang dipilih ke command teks", async () => {
    const user = userEvent.setup();
    // Berkas dari luar selalu lewat "Bagikan", jadi tab Impor sudah terbuka saat layar dibuka.
    const { container } = render(<HalamanTransfer berkas={`${folderTukar}/lama.promptsaver`} />);
    const kotak = container.querySelector('input[type="file"]');
    expect(kotak).not.toBeNull();

    await user.upload(kotak as HTMLElement, new File(['{"a":1}'], "koleksi.promptsaver"));
    await waitFor(() =>
      expect(vi.mocked(layanan.pratinjauImporTeks)).toHaveBeenCalledWith('{"a":1}'),
    );
    expect(screen.getByText("koleksi.promptsaver")).toBeInTheDocument();
  });
});
