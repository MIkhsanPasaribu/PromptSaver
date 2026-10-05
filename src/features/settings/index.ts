/** API publik fitur pengaturan. */
export { HalamanPengaturan } from "./components/settings-page";
export { HalamanPrivasi } from "./components/privacy-page";
export { DaftarPintasan } from "./components/shortcut-list";
export { gunakanStatistik } from "./hooks/use-statistik";
export {
  ambilPengaturan,
  simpanPengaturan,
  aturUlangPengaturan,
  hapusSemuaData,
  TRANSPARANSI_MAKS,
  TRANSPARANSI_MIN,
  type Geometri,
  type Pengaturan,
  type Tema,
} from "./services/settings-service";
