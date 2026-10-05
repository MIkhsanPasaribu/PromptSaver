/** API publik fitur pengaturan. */
export { HalamanPengaturan } from "./components/halaman-pengaturan";
export { HalamanPrivasi } from "./components/halaman-privasi";
export { DaftarPintasan } from "./components/daftar-pintasan";
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
