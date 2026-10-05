/** Tautan luar proyek. Sumber tunggal supaya layar Pengaturan dan `.github/FUNDING.yml`
   tidak bisa berbeda. Ini bukan akses jaringan dari aplikasi: URL dibuka peramban bawaan
   sistem lewat plugin `opener`, jadi WebView tetap tanpa jaringan dan izin `INTERNET`
   build rilis tetap kosong (AGENTS.md Bagian 7). */
export const penggunaGitHub = "MIkhsanPasaribu";

export const tautanRepositori = `https://github.com/${penggunaGitHub}/PromptSaver`;

/** Nama tiap layanan ditampilkan apa adanya: nama merek tidak diterjemahkan. */
export const tautanDukungan = [
  { nama: "GitHub Sponsors", url: `https://github.com/sponsors/${penggunaGitHub}` },
  { nama: "Saweria", url: "https://saweria.co/mikhsanpasaribu" },
  { nama: "Trakteer", url: "https://trakteer.id/mikhsanpasaribu" },
] as const;
