/** Teks UI fitur pengorganisir: folder, tag, statistik kategori, dan sampah, bahasa Indonesia.
   Nilai di berkas ini harus sama persis dengan teks yang dulu ditulis langsung di komponen:
   test frontend membandingkan teks hasil render. */
export const pengorganisir = {
  // Halaman Kategori
  judulKategori: "Kategori",
  subjudulKategori: "Atur folder dan tag. Semua data tetap tersimpan di perangkat ini.",
  ariaStatistikKoleksi: "Statistik koleksi",
  tilePrompt: "Prompt",
  tileFolder: "Folder",
  tileTag: "Tag",
  tileDiSampah: "Di Sampah",
  ukuranDatabaseLokal: "Ukuran basis data lokal: {{ukuran}}",
  ukuranKb: "{{angka}} KB",
  ukuranMb: "{{angka}} MB",
  statistikGagal: "Statistik koleksi belum bisa dimuat.",
  cobaLagi: "Coba lagi",

  // Folder
  buatFolderBaru: "Buat folder baru",
  namaFolderBaru: "Nama folder baru",
  ubahNamaFolder: "Ubah nama folder",
  ubahNamaFolderAria: "Ubah nama folder {{nama}}",
  hapusFolderAria: "Hapus folder {{nama}}",
  hapusFolderAksi: "Hapus folder",
  namaFolderKosong: "Nama folder tidak boleh kosong.",
  folderDibuat: 'Folder "{{nama}}" dibuat.',
  folderDisimpan: 'Folder "{{nama}}" disimpan.',
  folderDihapus: 'Folder "{{nama}}" dihapus.',
  folderGagalDihapus: "Folder gagal dihapus.",
  memuatDaftarFolder: "Memuat daftar folder",
  semuaPrompt: "Semua Prompt",
  belumAdaFolder: "Belum ada folder.",
  judulPromptDiFolder: '{{jumlah}} prompt di folder "{{nama}}"',
  deskripsiHapusFolder:
    "Folder akan dihapus. Tentukan dulu tujuan promptnya, jadi tidak ada prompt yang terhapus diam-diam.",
  pindahkanKeTanpaFolder: 'Pindahkan ke "Tanpa Folder"',
  pindahkanKeSampah: "Pindahkan ke Sampah",
  catatanPromptSampah: "Prompt di Sampah masih bisa dipulihkan ke koleksinya.",
  konfirmasiHapusFolder: 'Hapus folder "{{nama}}"?',
  pesanHapusKosong: "Folder ini kosong, jadi tidak ada prompt yang ikut terhapus.",
  pesanPindahTanpaFolder:
    '{{jumlah}} prompt akan dipindahkan ke "Tanpa Folder" dan tetap tersimpan.',
  pesanPindahSampah:
    "{{jumlah}} prompt akan dipindahkan ke Sampah. Prompt masih bisa dipulihkan dari sana.",

  // Tag
  buatTagBaru: "Buat tag baru",
  namaTagBaru: "Nama tag baru",
  namaTag: "Nama tag",
  ubahTagLabel: "Ubah nama dan warna tag",
  ubahTagAria: "Ubah tag {{nama}}",
  hapusTagAria: "Hapus tag {{nama}}",
  hapusTagAksi: "Hapus tag",
  namaTagKosong: "Nama tag tidak boleh kosong.",
  tagDibuat: 'Tag "{{nama}}" dibuat.',
  tagDisimpan: 'Tag "{{nama}}" disimpan.',
  tagDihapus: 'Tag "{{nama}}" dihapus.',
  tagGagalDihapus: "Tag gagal dihapus.",
  memuatDaftarTag: "Memuat daftar tag",
  warnaTag: "Warna tag",
  warnaTagAria: "Warna {{warna}}",
  belumAdaTag: "Belum ada tag.",
  lepasFilterTag: "Lepas semua filter tag",
  konfirmasiHapusTag: 'Hapus tag "{{nama}}"?',
  pesanHapusTag: "Tag dilepas dari {{jumlah}} prompt. Promptnya tetap ada.",

  // Sampah
  kosongkanSampah: "Kosongkan Sampah",
  bahayaSampah:
    "Penghapusan permanen tidak bisa dibatalkan. Prompt di Sampah tidak muncul di daftar dan pencarian biasa.",
  memuatSampah: "Memuat Sampah...",
  sampahKosong: "Sampah kosong",
  sampahKosongDetail:
    "Prompt yang Anda hapus akan menunggu di sini sampai dipulihkan atau dihapus permanen.",
  dibuangPada: "Dibuang {{waktu}}",
  hapusPermanen: "Hapus permanen",
  konfirmasiKosongkan: "Kosongkan Sampah?",
  konfirmasiHapusPermanen: "Hapus permanen?",
  pesanKonfirmasiHapus:
    "Tindakan ini tidak bisa dibatalkan. Isi prompt akan hilang dari database lokal.",
  labelAksiHapus: "Ya, hapus permanen",
  toastDipulihkan: "Prompt dikembalikan ke koleksi.",
  toastHapusPermanen: "Prompt dihapus permanen.",
  toastKosongkan: "{{jumlah}} prompt dihapus permanen.",
};

export default pengorganisir;
