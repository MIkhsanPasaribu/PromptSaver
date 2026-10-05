/** API publik fitur widget. Fitur lain mengimpor dari sini, bukan dari file internal.
   Layanan IPC sengaja tidak di-export agar pemanggilan command tetap lewat jalur langsung. */
export { BilahAtasWidget } from "./components/widget-topbar";
export { TampilanWidget } from "./components/widget-view";
export { gunakanModeJendela } from "./hooks/use-mode-jendela";
export type { HasilModeJendela, UkuranJendela } from "./hooks/use-mode-jendela";
export type { PropertiBilahAtas } from "./components/widget-topbar";
export type { PropertiTampilanWidget } from "./components/widget-view";
