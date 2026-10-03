/** Teks layar Ekspor & Impor, bahasa Inggris. Kunci harus sama dengan berkas id-nya. */
export default {
  judul: "Export & Import",
  pengantar:
    "Move your collection between devices with a single file. The app never uses the internet; moving the file uses whatever your operating system already provides.",
  tanpaEnkripsi: "No encryption",
  peringatanTeksPolos:
    "Export files contain plain text and are not encrypted. Anyone who opens this file can read all of your prompts, so store it somewhere safe.",

  cakupanSemua: "All prompts",
  cakupanSemuaCatatan:
    "The whole active collection together with its folders and tags is written to the file.",
  cakupanPilihan: "Pick prompts",
  cakupanPilihanCatatan: "Only the folders and tags used by the selected prompts are included.",

  tabEkspor: "Export",
  tabImpor: "Import",
  berkasEkspor: "Export file",
  labelCakupan: "Export scope",
  pilihSemua: "Select everything shown in this list",
  memuatDaftar: "Loading the prompt list…",
  belumAdaPromptAktif: "No active prompts to select yet.",
  tanpaJudul: "(untitled)",
  batasDaftar:
    'The list shows the first {{batas}} prompts. Use the "{{semua}}" scope to export the whole collection.',

  labelPrompt: "Prompts",
  labelFolder: "Folders",
  labelTag: "Tags",
  labelBentrok: "Conflicts",
  labelUkuranBerkas: "File size",
  labelVersiSkema: "Schema version",
  labelDitambah: "Added",
  labelDitimpa: "Overwritten",
  labelDilewati: "Skipped",
  labelGagal: "Failed",

  menghitungIsi: "Counting the contents…",
  perkiraanUkuran:
    "The size is expected to be close to {{ukuran}} (the local database size). The exact size appears once the file is written.",
  koleksiKosong: "The collection is still empty, so there is nothing to export.",
  tombolEkspor: "Export",
  memproses: "Working…",
  dialogSimpan: "Save export file",
  eksporSelesai: "Export finished. The file is ready to move to another device.",
  eksporSelesaiFolder: "Export finished. The file is in the app folder, ready to move.",
  eksporBerhasil: "Export succeeded",
  hitungPrompt: "{{n}} prompts",
  hitungFolder: "{{n}} folders",
  hitungTag: "{{n}} tags",
  lokasiBerkas: "File location: {{path}}",
  petunjukPindahkan:
    "Move this file to another device over USB, Bluetooth, a memory card, or any file sharing service you prefer.",

  berkasImpor: "File to be imported",
  salinBerkasDepan: "Copy the",
  salinBerkasBelakang:
    "file into this folder with your device's file manager, then reload the list.",
  memuatFolder: "Loading folder...",
  muatUlang: "Reload",
  belumAdaBerkas: "No export files in this folder yet.",
  pilihBerkas: "Choose File",
  belumAdaBerkasDipilih: "No file selected yet.",
  dialogPilih: "Choose export file",
  berkasBesar: "This file is large. Importing may take a while.",
  bentrokPetunjuk:
    "{{n}} prompts already exist on this device. Pick a strategy below to decide which one wins.",
  pilihBerkasImporDepan: "Select an",
  pilihBerkasImporBelakang:
    "export file. Broken files or unknown schema versions are rejected without changing existing data.",

  saatBentrok: "When data conflicts",
  labelStrategiKonflik: "Conflict strategy",
  tombolImpor: "Import",
  mengimpor: "Importing…",
  imporSelesai: "Import finished. The new collection shows up in the list right away.",
  hasilImpor: "Import result",
  gagalPetunjuk: "Some data failed to load. Existing data was not deleted.",
  transaksiPetunjuk: "The import runs in a single transaction, so old data stays intact.",
  strategiLewati: "Skip duplicates",
  catatanLewati: "Prompts with the same id are left as they are on this device.",
  strategiTimpa: "Overwrite if newer",
  catatanTimpa: "Prompts with the same id are replaced when the file holds a newer version.",
  strategiSalinan: "Save as a copy",
  catatanSalinan: "Conflicting prompts are stored as new entries with new ids.",
};
