import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePengaturan } from "@/app/store/pengaturan-store";
import type { Pengaturan } from "@/features/settings/services/settings-service";

const sistem = vi.hoisted(() => ({
  enable: vi.fn(async () => {}),
  disable: vi.fn(async () => {}),
  isEnabled: vi.fn(async () => false),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: sistem.enable,
  disable: sistem.disable,
  isEnabled: sistem.isEnabled,
}));

const platform = vi.hoisted(() => ({ nilai: "desktop" as "desktop" | "mobile" }));
vi.mock("@/lib/platform", () => ({ deteksiPlatform: () => platform.nilai }));

vi.mock("@/features/settings/services/settings-service", async (imporAsli) => {
  const asli = await imporAsli<typeof import("@/features/settings/services/settings-service")>();
  return {
    ...asli,
    ambilPengaturan: vi.fn(),
    simpanPengaturan: vi.fn(async (patch: Partial<Pengaturan>) => ({ ...BAHAS, ...patch })),
  };
});

import {
  gunakanUbahMulaiOtomatis,
  gunakanSinkronMulaiOtomatis,
} from "@/features/settings/hooks/use-mulai-otomatis";
import * as layanan from "@/features/settings/services/settings-service";

const BAHAS: Pengaturan = {
  tema: "terang",
  bahasa: "id",
  kurangiAnimasi: false,
  urutanDaftar: "terbaru",
  onboardingSelesai: true,
  ingatNilaiVariabel: true,
  widgetGeometriPenuh: null,
  widgetGeometriMode: null,
  widgetSelaluDiAtas: false,
  widgetTransparansi: 100,
  widgetTutupKeTray: true,
  pintasanGlobalAktif: false,
  pintasanGlobal: "Alt+Enter",
  cadanganOtomatis: true,
  mulaiOtomatis: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  platform.nilai = "desktop";
  sistem.isEnabled.mockResolvedValue(false);
  sistem.enable.mockResolvedValue(undefined);
  usePengaturan.setState({ pengaturan: { ...BAHAS }, sedangMuat: false });
});

describe("gunakanUbahMulaiOtomatis", () => {
  it("menyimpan lebih dulu, baru menulis entri start sistem", async () => {
    const { result } = renderHook(() => gunakanUbahMulaiOtomatis());
    await result.current(true);

    expect(vi.mocked(layanan.simpanPengaturan)).toHaveBeenCalledWith({ mulaiOtomatis: true });
    expect(sistem.enable).toHaveBeenCalledTimes(1);
    expect(sistem.disable).not.toHaveBeenCalled();
    expect(usePengaturan.getState().pengaturan?.mulaiOtomatis).toBe(true);
  });

  it("membatalkan nilai bila Windows menolak entri start", async () => {
    sistem.enable.mockRejectedValueOnce(new Error("ditolak"));
    const { result } = renderHook(() => gunakanUbahMulaiOtomatis());
    await result.current(true);

    await waitFor(() =>
      expect(vi.mocked(layanan.simpanPengaturan)).toHaveBeenLastCalledWith({
        mulaiOtomatis: false,
      }),
    );
    expect(usePengaturan.getState().pengaturan?.mulaiOtomatis).toBe(false);
  });

  it("tidak menyentuh sistem ketika penyimpanan pengaturan gagal", async () => {
    vi.mocked(layanan.simpanPengaturan).mockRejectedValueOnce(new Error("database sibuk"));
    const { result } = renderHook(() => gunakanUbahMulaiOtomatis());
    await result.current(true);

    expect(sistem.enable).not.toHaveBeenCalled();
    expect(usePengaturan.getState().pengaturan?.mulaiOtomatis).toBe(false);
  });
});

describe("gunakanSinkronMulaiOtomatis", () => {
  it("mengikuti saklar Windows ketika keadaan sistem berbeda", async () => {
    sistem.isEnabled.mockResolvedValue(true);
    renderHook(() => gunakanSinkronMulaiOtomatis(true));

    await waitFor(() =>
      expect(vi.mocked(layanan.simpanPengaturan)).toHaveBeenCalledWith({ mulaiOtomatis: true }),
    );
    expect(sistem.enable).not.toHaveBeenCalled();
    expect(sistem.disable).not.toHaveBeenCalled();
  });

  it("dilewati di mobile karena plugin tidak terpasang", async () => {
    platform.nilai = "mobile";
    renderHook(() => gunakanSinkronMulaiOtomatis(true));
    await new Promise((selesai) => setTimeout(selesai, 0));

    expect(sistem.isEnabled).not.toHaveBeenCalled();
  });
});
