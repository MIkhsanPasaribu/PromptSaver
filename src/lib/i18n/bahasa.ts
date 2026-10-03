/** Daftar bahasa yang didukung aplikasi. Nilai ini yang disimpan di pengaturan dan dipakai
   i18next, jadi harus sama dengan nama berkas sumber daya di `sumber/`. */
export type Bahasa = "id" | "en";

/** Inggris jadi bahasa bawaan; pengguna bisa memindah ke Indonesia di Pengaturan (PRD E1). */
export const BAHASA_BAKU: Bahasa = "en";

export const DAFTAR_BAHASA: { nilai: Bahasa; label: string }[] = [
  { nilai: "en", label: "English" },
  { nilai: "id", label: "Bahasa Indonesia" },
];

export const fungsibahasa = (nilai: string | undefined): Bahasa =>
  nilai === "id" || nilai === "en" ? nilai : BAHASA_BAKU;
