/** Teks layar Ekspor & Impor, bahasa Indonesia. Nilai harus sama persis dengan teks yang dulu
   ditulis langsung di komponen: test frontend membandingkan teks hasil render. */
export default {
  judul: "Ekspor & Impor",
  pengantar:
    "Pindahkan koleksi antar perangkat lewat satu berkas. Aplikasi tidak pernah memakai internet; pemindahan berkas memakai mekanisme bawaan sistem operasi Anda.",
  tanpaEnkripsi: "Tanpa enkripsi",
  peringatanTeksPolos:
    "Berkas ekspor berisi teks polos dan tidak terenkripsi. Siapa pun yang membuka berkas ini dapat membaca seluruh prompt Anda, jadi simpan di tempat aman.",

  cakupanSemua: "Semua prompt",
  cakupanSemuaCatatan: "Seluruh koleksi aktif beserta folder dan tag ikut tertulis ke berkas.",
  cakupanPilihan: "Pilih prompt",
  cakupanPilihanCatatan: "Folder dan tag ikut hanya yang dipakai prompt terpilih.",

  tabEkspor: "Ekspor",
  tabImpor: "Impor",
  berkasEkspor: "Berkas ekspor",
  labelCakupan: "Cakupan ekspor",
  pilihSemua: "Pilih semua yang tampil di daftar ini",
  memuatDaftar: "Memuat daftar prompt…",
  belumAdaPromptAktif: "Belum ada prompt aktif untuk dipilih.",
  tanpaJudul: "(tanpa judul)",
  batasDaftar:
    'Daftar menampilkan {{batas}} prompt teratas. Pakai cakupan "{{semua}}" untuk mengekspor seluruh koleksi.',

  labelPrompt: "Prompt",
  labelFolder: "Folder",
  labelTag: "Tag",
  labelBentrok: "Bentrok",
  labelUkuranBerkas: "Ukuran berkas",
  labelVersiSkema: "Versi skema",
  labelDitambah: "Ditambah",
  labelDitimpa: "Ditimpa",
  labelDilewati: "Dilewati",
  labelGagal: "Gagal",

  menghitungIsi: "Menghitung isi koleksi…",
  perkiraanUkuran:
    "Perkiraan ukuran mendekati {{ukuran}} (besar database lokal). Ukuran pasti muncul setelah berkas ditulis.",
  koleksiKosong: "Koleksi masih kosong, jadi tidak ada yang bisa diekspor.",
  tombolEkspor: "Ekspor",
  memproses: "Memproses…",
  dialogSimpan: "Simpan file ekspor",
  eksporSelesai: "Ekspor selesai. Berkas siap dipindahkan ke perangkat lain.",
  eksporSelesaiFolder:
    "Ekspor selesai. Berkas ada di folder tukar aplikasi dan bisa diambil lewat kabel USB.",
  eksporBerhasil: "Ekspor berhasil",
  hitungPrompt: "{{n}} prompt",
  hitungFolder: "{{n}} folder",
  hitungTag: "{{n}} tag",
  lokasiBerkas: "Lokasi berkas: {{path}}",
  petunjukPindahkan:
    "Pindahkan berkas ini ke perangkat lain lewat kabel USB, Bluetooth, kartu memori, atau layanan berbagi berkas pilihan Anda.",

  berkasImpor: "Berkas yang akan diimpor",
  petunjukBagikan:
    "Cara lain: dari pengelola berkas, tahan berkas .promptsaver lalu pilih Bagikan ke PromptSaver. Berkasnya langsung muncul di layar ini.",
  berkasTersedia: "Berkas yang sudah dikenal aplikasi ini, terbaru lebih dulu:",
  berkasMelewatiBatas: "Berkas melebihi {{maks}}, jadi tidak dikirim ke aplikasi.",
  memuatFolder: "Memuat folder...",
  muatUlang: "Muat ulang",
  belumAdaBerkas: "Belum ada berkas ekspor di folder ini.",
  pilihBerkas: "Pilih Berkas",
  belumAdaBerkasDipilih: "Belum ada berkas dipilih.",
  dialogPilih: "Pilih file ekspor",
  berkasBesar: "Berkas ini besar. Impor mungkin memakan waktu beberapa saat.",
  bentrokPetunjuk:
    "{{n}} prompt sudah ada di perangkat ini. Pilih strategi di bawah untuk menentukan mana yang dipakai.",
  pilihBerkasImporDepan: "Pilih berkas",
  pilihBerkasImporBelakang:
    "hasil ekspor. Berkas rusak atau versi skema yang tidak dikenal ditolak tanpa mengubah data yang ada.",

  saatBentrok: "Saat data bentrok",
  labelStrategiKonflik: "Strategi konflik",
  tombolImpor: "Impor",
  mengimpor: "Mengimpor…",
  imporSelesai: "Impor selesai. Koleksi baru langsung tampil di daftar.",
  hasilImpor: "Hasil impor",
  gagalPetunjuk: "Sebagian data gagal masuk. Data yang sudah ada tidak dihapus.",
  transaksiPetunjuk: "Impor berjalan dalam satu transaksi, jadi data lama tetap utuh.",
  strategiLewati: "Lewati duplikat",
  catatanLewati: "Prompt dengan id yang sama dibiarkan apa adanya di perangkat ini.",
  strategiTimpa: "Timpa jika lebih baru",
  catatanTimpa: "Prompt dengan id yang sama diganti bila isi di berkas lebih baru.",
  strategiSalinan: "Simpan sebagai salinan",
  catatanSalinan: "Prompt yang bentrok disimpan sebagai entri baru dengan id baru.",
};
