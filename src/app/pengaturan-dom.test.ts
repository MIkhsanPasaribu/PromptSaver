import { beforeEach, describe, expect, it } from "vitest";

import { WIDGET_MAKS, deteksiModeJendela, terapkanKeDom } from "@/app/store/pengaturan-store";
import type { Pengaturan } from "@/features/settings/services/settings-service";

function pengaturan(bagian: Partial<Pengaturan>): Pengaturan {
  return {
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
    ...bagian,
  };
}

describe("terapkanKeDom", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    delete document.documentElement.dataset.temaAktif;
    delete document.documentElement.dataset.widgetTransparan;
    document.documentElement.style.removeProperty("--widget-alpha");
  });

  it("menulis keadaan transparansi sebagai atribut dan variabel CSS", () => {
    terapkanKeDom(pengaturan({ widgetTransparansi: 85 }));

    expect(document.documentElement.dataset.widgetTransparan).toBe("85");
    expect(document.documentElement.style.getPropertyValue("--widget-alpha")).toBe("0.85");
  });

  it("kembali ke jendela opak penuh pada 100 persen", () => {
    terapkanKeDom(pengaturan({ widgetTransparansi: 80 }));
    terapkanKeDom(pengaturan({ widgetTransparansi: 100 }));

    expect(document.documentElement.dataset.widgetTransparan).toBe("100");
    expect(document.documentElement.style.getPropertyValue("--widget-alpha")).toBe("1");
  });

  it("memakai keadaan opak saat pengaturan belum termuat", () => {
    terapkanKeDom(null);

    expect(document.documentElement.dataset.widgetTransparan).toBe("100");
  });

  it("memasang kelas dark saat tema gelap dipilih", () => {
    terapkanKeDom(pengaturan({ tema: "gelap" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.temaAktif).toBe("gelap");
  });

  it("menandai kurangi animasi lewat atribut data", () => {
    terapkanKeDom(pengaturan({ kurangiAnimasi: true }));

    expect(document.documentElement.dataset.kurangiAnimasi).toBe("true");
  });
});

describe("deteksiModeJendela", () => {
  it("membaca ukuran widget bawaan sebagai mode widget", () => {
    expect(deteksiModeJendela(288, 360)).toBe("widget");
    expect(deteksiModeJendela(WIDGET_MAKS.lebar, WIDGET_MAKS.tinggi)).toBe("widget");
  });

  it("mengembalikan jendela yang lebih besar dari ambang ke mode penuh", () => {
    expect(deteksiModeJendela(866, 280)).toBe("penuh");
    expect(deteksiModeJendela(1120, 760)).toBe("penuh");
  });
});
