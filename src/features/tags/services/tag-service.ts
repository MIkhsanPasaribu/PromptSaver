import { panggil } from "@/lib/ipc";

import type { Tag, WarnaTag } from "../../prompts/types/prompt.types";

export const daftarTag = () => panggil<Tag[]>("daftar_tag");

export const buatTag = (nama: string, warna?: WarnaTag) =>
  panggil<Tag>("buat_tag", { nama, warna });

export const ubahTag = (id: string, nama: string, warna?: WarnaTag) =>
  panggil<Tag>("ubah_tag", { id, nama, warna });

export const hapusTag = (id: string) => panggil<void>("hapus_tag", { id });

/** Saran otomatis saat mengetik tag di form (PRD B2). */
export const saranTag = (potongan: string, batas = 8) =>
  panggil<Tag[]>("saran_tag", { potongan, batas });
