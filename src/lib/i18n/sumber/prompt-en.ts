/** Teks satu prompt, bahasa Inggris. Kunci harus sama dengan berkas id-nya. */
const prompt = {
  // Halaman detail
  memuatPrompt: "Loading prompt...",
  tidakDitemukan: "Prompt not found.",
  dipindahKeSampah: "Prompt moved to Trash.",
  salinPrompt: "Copy prompt",
  isiPrompt: "Prompt content",
  dibuatDiubah: "Created {{dibuat}} • Changed {{diubah}}",
  terakhirDipakai: " • Last used {{waktu}}",
  batalFavorit: "Unfavourite",
  sematkan: "Pin",
  lepasSematkan: "Unpin",
  pindahkanKeFolder: "Move prompt to another folder",
  edit: "Edit",
  duplikat: "Duplicate",
  pindahSampahJudul: "Move to Trash?",
  pindahSampahPesan: "The prompt is not gone right away. You can still restore it from Trash.",
  yaPindahkan: "Yes, move it",

  // Form prompt
  simpanPerubahan: "Save changes",
  simpanPrompt: "Save prompt",
  drafDipulihkan: "Previous draft restored.",
  drafMasihTersimpan: "Your draft is still kept on this screen.",
  judulOpsional: "Title (optional)",
  judulPetunjuk: "Leave empty to take the title from the first 40 characters of the text",
  gagalHitungan: "The prompt was copied, but its usage count could not be saved.",
  isiPetunjuk: "Write or paste the prompt here.\nVariables can be written as {{bahasa}}.",
  karakterHitung: "{{jumlah}} characters, maximum 50,000.",
  pilihFolder: "Choose folder",
  labelFolder: "Folder",
  labelTag: "Tag",
  hapusTag: "Remove tag {{nama}}",
  buangTagBaru: "Discard new tag {{nama}}",
  tagPetunjuk: "Type a tag name then press Enter",
  tambahTag: "Add tag",
  warnaTagBaru: "New tag colour:",
  pakaiWarna: "Use the {{warna}} colour",
  perubahanBelumTersimpan: "Changes not saved",
  perubahanBelumTersimpanPesan: "Save now, discard the changes, or keep typing.",
  lanjutMengetik: "Keep typing",
  buang: "Discard",

  // Pesan aksi daftar dan form
  toastTersimpan: "Prompt saved.",
  toastDiubah: "Changes saved.",
  toastDuplikat: "Duplicate created.",
  toastDipindahkan: "Prompt moved.",

  // Dialog isian variabel (C2)
  isiVariabel: "Fill in variables",
  isiVariabelPesan: "Values are used for this copy only. The original prompt text stays the same.",
  isiVariabelNama: "Enter {{nama}}",
  pratinjauHasil: "Result preview",
  variabelKosong:
    "Some variables are empty, continue? Empty variables are dropped from the copied text.",
  kembaliMengisi: "Keep filling",
  menyalin: "Copying",
  lanjutkanMenyalin: "Continue copying",

  // Panel salin manual (C1, alur gagal)
  salinManual: "Copy manually",
  salinManualPesan:
    "The app cannot access the clipboard. All text below is already selected, just press Ctrl+C and paste it into your AI app.",
  isiUntukSalinManual: "Prompt content to copy manually",
  pilihSemua: "Select all",
  selesai: "Done",

  // Riwayat versi (C3)
  riwayatVersi: "Version history",
  riwayatPenjelasan:
    "The last ten versions of this prompt are saved automatically whenever its content changes.",
  belumAdaVersi: "No older versions yet. History starts being recorded once this prompt changes.",
  versiDipulihkan: "Old version restored. The state before restoring was recorded as well.",
  pulihkanJudul: "Restore this version?",
  pulihkanPesan:
    "The current prompt content will be replaced. The state before restoring stays recorded as a new version.",
  yaPulihkan: "Yes, restore",

  // Pesan validasi skema prompt, folder, dan tag
  judulMaks: "Title is at most {{maks}} characters.",
  isiWajibSatuKata: "Prompt content cannot be empty. Write at least one word.",
  isiHanyaSpasi: "Prompt content cannot be only spaces.",
  isiMaks: "Prompt content is at most {{maks}} characters.",
  isiWajib: "Prompt content cannot be empty.",
  namaTagKosong: "Tag name cannot be empty.",
  namaTagMaks: "Tag name is at most {{maks}} characters.",
  namaTagTagar: "Tag name cannot contain #.",
  namaTagBarisBaru: "Tag name cannot contain a line break.",
  namaFolderKosong: "Folder name cannot be empty.",
  namaFolderMaks: "Folder name is at most {{maks}} characters.",
  namaFolderBarisBaru: "Folder name cannot contain a line break.",
};

export default prompt;
