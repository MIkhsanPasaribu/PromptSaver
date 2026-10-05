import { panggil } from "@/lib/ipc";

import type { Geometri } from "../../settings/services/settings-service";

/** Semua fungsi ini hanya tersedia di desktop. Frontend menyembunyikan tombolnya di mobile. */
export const masukModeWidget = () => panggil<Geometri>("masuk_mode_widget");

export const keluarModeWidget = () => panggil<Geometri>("keluar_mode_widget");

export const simpanGeometriSekarang = (modeWidget: boolean) =>
  panggil<Geometri>("simpan_geometri_sekarang", { modeWidget });

/** Efek jendela sistem Acrylic untuk Mode Widget. 100 berarti tanpa efek. */
export const terapkanTransparansi = (persen: number) =>
  panggil<void>("terapkan_transparansi", { persen });

/** Sembunyikan jendela saat Esc ditekan dalam Mode Widget (PRD G3). */
export const sembunyikanWidget = () => panggil<void>("sembunyikan_widget");

/** Daftarkan ulang pintasan global setelah pengguna mengubah kombinasi atau saklar (PRD G3).
   Khusus desktop: command ini tidak terdaftar di mobile. */
export const terapkanPintasanGlobal = () => panggil<void>("terapkan_pintasan_global");
