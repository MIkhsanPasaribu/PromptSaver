/** Teks satu prompt: detail, form, salin, variabel, riwayat versi, dan pesan validasi Zod
   (PRD A1-A2, C1-C3). Bahasa Indonesia. Nilai harus sama persis dengan teks yang dulu ditulis
   langsung di komponen karena test membandingkan teks hasil render. */
const prompt = {
  // Halaman detail
  memuatPrompt: "Memuat prompt...",
  tidakDitemukan: "Prompt tidak ditemukan.",
  dipindahKeSampah: "Prompt dipindah ke Sampah.",
  salinPrompt: "Salin prompt",
  isiPrompt: "Isi prompt",
  dibuatDiubah: "Dibuat {{dibuat}} • Diubah {{diubah}}",
  terakhirDipakai: " • Terakhir dipakai {{waktu}}",
  batalFavorit: "Batal favorit",
  sematkan: "Sematkan",
  lepasSematkan: "Lepas sematkan",
  pindahkanKeFolder: "Pindahkan prompt ke folder lain",
  edit: "Edit",
  duplikat: "Duplikat",
  pindahSampahJudul: "Pindah ke Sampah?",
  pindahSampahPesan: "Prompt tidak langsung hilang. Anda masih bisa memulihkannya dari Sampah.",
  yaPindahkan: "Ya, pindahkan",

  // Form prompt
  simpanPerubahan: "Simpan perubahan",
  simpanPrompt: "Simpan prompt",
  drafDipulihkan: "Draf sebelumnya dipulihkan.",
  drafMasihTersimpan: "Draf Anda masih tersimpan di layar ini.",
  judulOpsional: "Judul (opsional)",
  judulPetunjuk: "Kosongkan agar judul diambil dari 40 karakter pertama isi",
  /* Kurung kumur {{bahasa}} memang teks yang tampil, bukan placeholder: i18next meninggalkan
     placeholder tanpa nilai apa adanya, jadi contoh variabel ikut terlihat di layar. */
  gagalHitungan: "Prompt sudah tersalin, tapi hitungan pemakaian gagal disimpan.",
  isiPetunjuk: "Tulis atau tempel prompt di sini.\nVariabel boleh ditulis {{bahasa}}.",
  karakterHitung: "{{jumlah}} karakter, maksimum 50.000.",
  pilihFolder: "Pilih folder",
  labelFolder: "Folder",
  labelTag: "Tag",
  hapusTag: "Hapus tag {{nama}}",
  buangTagBaru: "Buang tag baru {{nama}}",
  tagPetunjuk: "Ketik nama tag lalu tekan Enter",
  tambahTag: "Tambah tag",
  warnaTagBaru: "Warna tag baru:",
  pakaiWarna: "Pakai warna {{warna}}",
  perubahanBelumTersimpan: "Perubahan belum tersimpan",
  perubahanBelumTersimpanPesan: "Simpan sekarang, buang perubahan, atau lanjut mengetik.",
  lanjutMengetik: "Lanjut mengetik",
  buang: "Buang",

  // Toast aksi pada layar koleksi dan form.
  toastTersimpan: "Prompt tersimpan.",
  toastDiubah: "Perubahan tersimpan.",
  toastDuplikat: "Salinan dibuat.",
  toastDipindahkan: "Prompt dipindahkan.",

  // Dialog isian variabel (C2)
  isiVariabel: "Isi variabel",
  isiVariabelPesan: "Nilai hanya dipakai untuk salinan ini. Isi prompt aslinya tidak berubah.",
  isiVariabelNama: "Isi {{nama}}",
  pratinjauHasil: "Pratinjau hasil",
  variabelKosong:
    "Ada variabel kosong, lanjutkan? Variabel yang kosong akan dibuang dari hasil salinan.",
  kembaliMengisi: "Kembali mengisi",
  menyalin: "Menyalin",
  lanjutkanMenyalin: "Lanjutkan menyalin",

  // Panel salin manual (C1, alur gagal)
  salinManual: "Salin manual",
  salinManualPesan:
    "Clipboard tidak dapat diakses aplikasi. Semua teks di bawah sudah terpilih, tinggal tekan Ctrl+C lalu tempel di aplikasi AI Anda.",
  isiUntukSalinManual: "Isi prompt untuk disalin manual",
  pilihSemua: "Pilih semua",
  selesai: "Selesai",

  // Riwayat versi (C3)
  riwayatVersi: "Riwayat versi",
  riwayatPenjelasan:
    "Sepuluh versi terakhir dari prompt ini disimpan otomatis setiap kali isinya berubah.",
  belumAdaVersi: "Belum ada versi lama. Riwayat mulai tercatat setelah prompt ini diubah.",
  versiDipulihkan: "Versi lama dipulihkan. Keadaan sebelum pemulihan ikut tercatat.",
  pulihkanJudul: "Pulihkan versi ini?",
  pulihkanPesan:
    "Isi prompt saat ini akan diganti. Keadaan sebelum pemulihan tetap tercatat sebagai versi baru.",
  yaPulihkan: "Ya, pulihkan",

  // Pesan validasi skema prompt, folder, dan tag
  judulMaks: "Judul maksimal {{maks}} karakter.",
  isiWajibSatuKata: "Isi prompt tidak boleh kosong. Tulis minimal satu kata.",
  isiHanyaSpasi: "Isi prompt tidak boleh hanya berisi spasi.",
  isiMaks: "Isi prompt maksimal {{maks}} karakter.",
  isiWajib: "Isi prompt tidak boleh kosong.",
  namaTagKosong: "Nama tag tidak boleh kosong.",
  namaTagMaks: "Nama tag maksimal {{maks}} karakter.",
  namaTagTagar: "Nama tag tidak boleh mengandung #.",
  namaTagBarisBaru: "Nama tag tidak boleh mengandung baris baru.",
  namaFolderKosong: "Nama folder tidak boleh kosong.",
  namaFolderMaks: "Nama folder maksimal {{maks}} karakter.",
  namaFolderBarisBaru: "Nama folder tidak boleh mengandung baris baru.",
};

export default prompt;
