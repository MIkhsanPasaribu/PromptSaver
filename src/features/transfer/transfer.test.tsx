import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    imporKoleksi: vi.fn(async () => hasil),
    namaBerkasBaku: vi.fn(async () => "koleksi-promptsaver.promptsaver"),
  };
});

const folderTukar = "/data/data/com.promptsaver.app/files/ekspor";
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
      sudahDipratinjau = await result.current.hitungPratinjau(path);
    });
    expect(sudahDipratinjau).toBe(true);
    expect(vi.mocked(layanan.pratinjauImpor)).toHaveBeenCalledWith(path);
    expect(result.current.pratinjau?.jumlahPrompt).toBe(3);

    let sudahDiimpor = false;
    await act(async () => {
      sudahDiimpor = await result.current.jalankanImpor(path, "lewati-duplikat");
    });
    expect(sudahDiimpor).toBe(true);
    expect(result.current.hasil?.ditambah).toBe(3);
    expect(result.current.pratinjau).toBeNull();
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
