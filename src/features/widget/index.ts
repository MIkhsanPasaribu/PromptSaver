/** API publik fitur widget. Fitur lain mengimpor dari sini, bukan dari file internal.
   Layanan IPC sengaja tidak di-export agar pemanggilan command tetap lewat jalur langsung. */
export { BilahAtasWidget } from "./components/bilah-atas-widget";
export { TampilanWidget } from "./components/tampilan-widget";
export { gunakanModeJendela } from "./hooks/use-mode-jendela";
export type { HasilModeJendela, UkuranJendela } from "./hooks/use-mode-jendela";
export type { PropertiBilahAtas } from "./components/bilah-atas-widget";
export type { PropertiTampilanWidget } from "./components/tampilan-widget";
