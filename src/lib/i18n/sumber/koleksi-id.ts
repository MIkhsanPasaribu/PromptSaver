/** Teks layar Koleksi beserta kartu prompt dan kolom cari (PRD B1-B3, C1). Bahasa Indonesia.
   Nilai di berkas ini harus sama persis dengan teks yang dulu ditulis langsung di komponen:
   test frontend membandingkan teks hasil render. */
const koleksi = {
  urutanTerbaru: "Terbaru diubah",
  urutanDipakai: "Terakhir dipakai",
  urutanAbjad: "Abjad",
  bersihkanPenyaring: "Bersihkan penyaring",
  memuatKoleksi: "Memuat koleksi...",
  belumAdaPrompt: "Belum ada prompt",
  belumAdaPromptPesan: "Simpan prompt pertama Anda. Tekan Prompt Baru, tempel isinya, lalu simpan.",
  tidakAdaCocok: "Tidak ada yang cocok",
  tidakAdaCocokPesan:
    'Tidak ditemukan prompt dengan kata "{{kueri}}". Coba kata lain atau bersihkan penyaring.',
  muatBerikutnya: "Muat {{jumlah}} prompt berikutnya",
  salinPromptJudul: "Salin prompt {{judul}}",
  tersalinKeClipboard: "Tersalin ke clipboard",
  tandaiFavorit: "Tandai favorit",
  hapusFavorit: "Hapus dari favorit",
  dipakaiPada: " • dipakai {{waktu}}",
  hapusKueri: "Hapus kueri pencarian",
};

export default koleksi;
