import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

/** Pembungkus tipis plugin start otomatis. Hanya boleh dipanggil di desktop: plugin ini tidak
   terpasang pada build Android, jadi memanggilnya di mobile selalu gagal. */
export const terapkanMulaiOtomatis = (aktif: boolean) => (aktif ? enable() : disable());

/** Keadaan sebenarnya di sistem (entri start Windows), bukan salinan yang kita simpan di
   database. Dipakai untuk merekonsiliasi saklar bila pengguna mengubahnya dari Settings >
   Apps > Startup. */
export const bacaMulaiOtomatisSistem = () => isEnabled();
