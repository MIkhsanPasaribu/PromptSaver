import * as pencocok from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

import { gantiBahasa } from "@/lib/i18n";

// Test ditulis dengan asumsi teks Indonesia, jadi bahasa uji dikunci sebelum render.
// Bawaan aplikasi tetap Inggris; yang diuji di sini adalah sumber dayanya, bukan bawaannya.
await gantiBahasa("id");

// Entry @testing-library/jest-dom/vitest butuh tautan peer vitest yang tidak tersedia
// di susunan pnpm ini, jadi pencocoknya dipasang manual.
expect.extend(pencocok);

afterEach(() => {
  cleanup();
});

// Jembatan Tauri tidak ada di jsdom. Test fitur men-stub modul ini lewat vi.mock.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// matchMedia dipakai store tema dan reduce motion.
if (!window.matchMedia) {
  window.matchMedia = ((bagan: string) => ({
    matches: false,
    media: bagan,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom belum punya Blob.text(), yang dipakai layar Transfer untuk membaca isi berkas dari
// pemilih berkas WebView. API ini ada di WebView Android dan desktop, jadi hanya test yang perlu
// ditambal.
if (!("text" in Blob.prototype)) {
  Object.defineProperty(Blob.prototype, "text", {
    value: function bacaTeks(this: Blob) {
      return new Promise<string>((selesai, gagal) => {
        const pembaca = new FileReader();
        pembaca.onload = () => selesai(String(pembaca.result));
        pembaca.onerror = () => gagal(pembaca.error);
        pembaca.readAsText(this);
      });
    },
  });
}
