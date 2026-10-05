/** Teks layar Pengaturan, Daftar Pintasan, dan Halaman Privasi, bahasa Indonesia.
   Nilai di berkas ini harus sama persis dengan teks yang dulu ditulis langsung di komponen:
   test frontend membandingkan teks hasil render. */
export default {
  judul: "Pengaturan",
  memuatPengaturan: "Memuat pengaturan...",
  tampilan: "Tampilan",

  labelTema: "Tema",
  temaIkutSistem: "Ikut sistem",
  temaTerang: "Terang",
  temaGelap: "Gelap",
  petunjukTema: "Mode gelap mempertahankan garis tepi tebal dan kontras minimum AA.",

  labelBahasa: "Bahasa",
  petunjukBahasa:
    "Bahasa antarmuka berubah seketika tanpa menutup aplikasi. Data dan berkas Anda tidak terpengaruh.",

  kurangiAnimasi: "Kurangi animasi",
  petunjukKurangiAnimasi:
    "Menghormati pengaturan reduce motion sistem. Umpan balik tetap tampil, hanya tanpa gerak.",

  labelUrutan: "Urutan daftar",
  urutanTerbaru: "Terbaru diubah",
  urutanDipakai: "Terakhir dipakai",
  urutanAbjad: "Abjad",

  labelIngatNilai: "Ingat nilai variabel",
  petunjukIngatNilai: "Memakai nilai terakhir sebagai saran pada pengisian variabel template.",
  tampilkanPanduanLagi: "Tampilkan panduan lagi",

  modeWidgetDesktop: "Mode Widget (desktop)",
  perluasJendelaPenuh: "Perluas ke jendela penuh",
  cobaModeWidget: "Coba Mode Widget",
  sematkanDiAtas: "Sematkan di atas",
  petunjukSematkan: "Widget tetap berada di atas jendela lain saat Anda bekerja.",
  sembunyikanKeTray: "Sembunyikan ke tray saat ditutup",
  petunjukTray:
    "Bila dimatikan, tombol tutup keluar penuh dan pintasan global tidak lagi memanggilnya.",
  transparansiJendela: "Transparansi jendela: {{nilai}}%",
  petunjukTransparansi:
    "Batas bawah {{min}}% menjaga teks tetap terbaca. Di bawah {{maks}}% bayangan blok disembunyikan dan garis tepi ditebalkan.",
  labelPintasanGlobal: "Pintasan global",
  aktifkanPintasanGlobal: "Aktifkan pintasan global",
  simpanPintasan: "Simpan pintasan",
  petunjukPintasanGlobal:
    "Mati secara bawaan. Aplikasi tidak mendaftarkan pintasan sistem sebelum Anda menyalakannya, dan akan membatalkan bila bentrok dengan aplikasi lain.",

  cadanganOtomatis: "Cadangan otomatis",
  cadangkanSekarang: "Cadangkan sekarang",
  labelCadanganMingguan: "Cadangkan tiap minggu",
  petunjukCadanganMingguan:
    "Sekali seminggu aplikasi menulis salinan koleksi di folder data aplikasi. Hanya lima cadangan terbaru disimpan. Formatnya sama dengan berkas ekspor, jadi isinya bisa dibaca di perangkat lain.",
  belumAdaCadangan: "Belum ada cadangan di perangkat ini.",
  cadanganDibuat: "Cadangan dibuat di folder data aplikasi.",
  judulPulihkan: "Pulihkan cadangan ini?",
  petunjukPulihkan:
    "Prompt dari cadangan dimasukkan ke koleksi yang sekarang. Pilihan strategi menentukan apa yang terjadi pada prompt yang sudah ada, sama seperti saat mengimpor berkas.",
  yaPulihkan: "Ya, pulihkan",
  pemulihanSelesai: "Pemulihan selesai. {{ditambah}} prompt ditambah, {{dilewati}} dilewati.",

  statistikKoleksi: "Statistik koleksi",
  statPrompt: "Prompt",
  statFolder: "Folder",
  statTag: "Tag",
  statSampah: "Di Sampah",
  statistikUkuran:
    "Ukuran database lokal sekitar {{kb}} KB. Semua dihitung di perangkat Anda, tanpa jaringan.",
  petunjukStatistik:
    "Tekan {{hitung}} untuk melihat jumlah prompt, folder, tag, dan ukuran database.",

  zonaBerbahaya: "Zona berbahaya",
  labelAturUlang: "Atur ulang ke default",
  petunjukAturUlang:
    "Mengembalikan tema, animasi, urutan, dan pengaturan widget. Seluruh koleksi prompt tidak tersentuh.",
  labelPrivasiData: "Privasi data",
  halamanPrivasi: "Halaman Privasi",
  petunjukDaftarPintasan: "Daftar pintasan keyboard yang berlaku di aplikasi ini.",
  hapusSemuaData: "Hapus semua data",
  petunjukHapusSemuaData:
    "Menghapus seluruh prompt, folder, tag, draf, dan pengaturan dari perangkat ini.",
  petunjukBelumAdaCadangan: "Belum ada cadangan? Ekspor dulu lewat menu Ekspor dan Impor.",
  judulKonfirmasiHapus: "Hapus semua data?",
  judulKonfirmasiKedua: "Konfirmasi langkah kedua",
  petunjukKonfirmasiHapus:
    "Semua prompt, folder, tag, dan pengaturan di perangkat ini akan hilang. Data yang sudah diekspor ke berkas tetap ada.",
  petunjukKonfirmasiKedua: "Ketik {{kata}} untuk melanjutkan. Tindakan ini tidak bisa dibatalkan.",
  labelKataKonfirmasi: "Kata konfirmasi",
  hapusBerkasCadangan: "Hapus berkas cadangan juga",
  petunjukHapusBerkasCadangan:
    "Cadangan mingguan dan berkas di folder tukar ekspor adalah salinan lengkap koleksi Anda dalam teks polos. Tanpa centang ini, salinan itu tetap ada di disk.",
  hapusPermanen: "Hapus permanen",
  hapusSelesai: "Semua data di perangkat ini sudah dihapus.",
  hapusSelesaiTermasuk:
    "Semua data di perangkat ini sudah dihapus, termasuk {{jumlah}} berkas cadangan.",

  judulPintasan: "Pintasan keyboard",
  pintasanPromptBaru: "Prompt baru",
  pintasanPromptBaruKet: "Membuka form prompt kosong.",
  pintasanFokusPencarian: "Fokus pencarian",
  pintasanFokusPencarianKet: "Langsung mengetik kata kunci.",
  pintasanSalinFokus: "Salin baris fokus",
  pintasanSalinFokusKet: "Bekerja saat kartu daftar sedang fokus.",
  pintasanKembaliKet: "Keluar layar atau menutup dialog.",
  pintasanModeWidgetKet: "Hanya di desktop.",
  catatanPintasan:
    "Pintasan di atas bekerja saat aplikasi fokus. Pintasan global tingkat sistem tidak aktif sampai Anda menyalakannya di Pengaturan, dan bisa dibatalkan bila bentrok dengan aplikasi lain.",

  privasiJudul: "Privasi",
  privasiPengantar:
    "Ringkasan singkat tentang apa yang terjadi pada isi prompt Anda. Tidak ada layanan tersembunyi di luar daftar ini.",
  privasiTanpaJaringan: "Tidak ada akses jaringan",
  privasiTanpaJaringanIsi:
    "PromptSaver tidak pernah menghubungi server mana pun. Tidak ada akun, tidak ada analitik, tidak ada iklan, dan tidak ada pelapor galat. Pada versi Android, izin INTERNET tidak diminta sama sekali.",
  privasiDataLokal: "Data hanya ada di perangkat ini",
  privasiDataLokalIsi:
    "Seluruh prompt, folder, tag, dan pengaturan disimpan di satu basis data SQLite pada folder data privat aplikasi. Tidak ada salinan yang dikirim ke luar perangkat, dan tidak ada perangkat lain yang bisa membacanya tanpa berkas ekspor Anda.",
  privasiTeksPolos: "Berkas ekspor berisi teks polos",
  privasiTeksPolosIsi:
    "Berkas .promptsaver hasil ekspor dapat dibaca oleh aplikasi mana pun karena tidak dienkripsi. Simpan berkas cadangan di tempat yang Anda kendalikan, dan hapus berkas sementara setelah selesai memindahkan data.",
  privasiHapusData: "Menghapus data Anda",
  privasiHapusDataIsi:
    "Gunakan tombol Kosongkan semua data di halaman Pengaturan untuk menghapus isi basis data. Menghapus aplikasi dari sistem tidak selalu menghapus folder datanya, jadi kosongkan lebih dulu bila perangkat akan dipakai orang lain.",
  privasiKunci: "Kunci aplikasi dengan PIN",
  privasiKunciIsi:
    "Anda bisa memasang PIN empat sampai dua belas angka di halaman Pengaturan. Aplikasi memintanya setiap kali menyala, setelah jendela menganggur, dan ketika aplikasi Android pindah ke latar. Kunci ini mencegah orang membaca koleksi Anda pada perangkat yang sedang terbuka; ia tidak mengenkripsi berkas, jadi basis data dan cadangan tetap terbaca bila berkasnya dipindahkan.",
  privasiBelumTersedia: "Belum tersedia di versi ini",
  privasiBelumEnkripsi:
    "Enkripsi basis data saat diam (data di disk masih terbaca bila perangkat Anda disita atau disusupi).",
  dukung: "Dukung PromptSaver",
  petunjukDukung:
    "Aplikasi ini gratis, bekerja penuh tanpa internet, dan tanpa iklan atau pelacakan. Kalau PromptSaver membantu pekerjaanmu, kamu bisa traktir kopi lewat tautan di bawah. Tombolnya hanya membuka peramban sistem, jadi aplikasi ini tetap tidak mengirim data apa pun.",
  gagalBukaTautan: "Tautan tidak dapat dibuka di peramban sistem.",
};
