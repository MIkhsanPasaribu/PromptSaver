import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { gunakanRiwayatBack } from "@/app/hooks/use-riwayat-back";
import { useNavigasi } from "@/app/store/navigasi-store";

const awal = { tumpukan: [{ nama: "koleksi" as const }] };

describe("tumpukan layar dan riwayat browser", () => {
  beforeEach(() => {
    useNavigasi.setState(awal);
  });

  it("menambah layar mendorong satu entri riwayat dengan kedalaman baru", () => {
    const desakState = vi.spyOn(window.history, "pushState");

    useNavigasi.getState().ke({ nama: "detail", id: "p-9" });

    expect(useNavigasi.getState().tumpukan.map((l) => l.nama)).toEqual(["koleksi", "detail"]);
    expect(desakState).toHaveBeenCalledWith({ ps: 2 }, "");
    desakState.mockRestore();
  });

  it("kembali memotong layar dan catatan kedalamannya", () => {
    useNavigasi.getState().ke({ nama: "privasi" });
    const gantiState = vi.spyOn(window.history, "replaceState");

    expect(useNavigasi.getState().kembali()).toBe(true);

    expect(useNavigasi.getState().tumpukan).toHaveLength(1);
    expect(gantiState).toHaveBeenCalledWith({ ps: 1 }, "");
    expect(useNavigasi.getState().kembali()).toBe(false);
    gantiState.mockRestore();
  });

  it("popstate dari tombol back sistem memotong tumpukan", () => {
    renderHook(() => gunakanRiwayatBack(true));
    useNavigasi.getState().ke({ nama: "form" });
    useNavigasi.getState().ke({ nama: "kategori" });
    expect(useNavigasi.getState().tumpukan).toHaveLength(3);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { ps: 2 } }));
    });

    expect(useNavigasi.getState().tumpukan).toHaveLength(2);
  });

  it("popstate tanpa kedalaman atau lebih dalam tidak mengarang layar", () => {
    renderHook(() => gunakanRiwayatBack(true));

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    expect(useNavigasi.getState().tumpukan).toHaveLength(1);

    useNavigasi.getState().potongKe(7);
    expect(useNavigasi.getState().tumpukan).toHaveLength(1);
  });
});
