/** Teks UI fitur pengorganisir (folder, tag, kategori, sampah), bahasa Inggris.
   Kunci harus sama persis dengan berkas id-nya. */
export const pengorganisir = {
  // Category page
  judulKategori: "Categories",
  subjudulKategori: "Organise folders and tags. All data stays on this device.",
  ariaStatistikKoleksi: "Collection statistics",
  tilePrompt: "Prompts",
  tileFolder: "Folders",
  tileTag: "Tags",
  tileDiSampah: "In Trash",
  ukuranDatabaseLokal: "Local database size: {{ukuran}}",
  ukuranKb: "{{angka}} KB",
  ukuranMb: "{{angka}} MB",
  statistikGagal: "Collection statistics could not be loaded.",
  cobaLagi: "Try again",

  // Folders
  buatFolderBaru: "Create new folder",
  namaFolderBaru: "New folder name",
  ubahNamaFolder: "Rename folder",
  ubahNamaFolderAria: "Rename folder {{nama}}",
  hapusFolderAria: "Delete folder {{nama}}",
  hapusFolderAksi: "Delete folder",
  namaFolderKosong: "Folder name cannot be empty.",
  folderDibuat: 'Folder "{{nama}}" created.',
  folderDisimpan: 'Folder "{{nama}}" saved.',
  folderDihapus: 'Folder "{{nama}}" deleted.',
  folderGagalDihapus: "Folder could not be deleted.",
  memuatDaftarFolder: "Loading folder list",
  semuaPrompt: "All Prompts",
  belumAdaFolder: "No folders yet.",
  judulPromptDiFolder: '{{jumlah}} prompts in folder "{{nama}}"',
  deskripsiHapusFolder:
    "This folder will be deleted. Choose where its prompts go first, so nothing is deleted silently.",
  pindahkanKeTanpaFolder: 'Move to "No Folder"',
  pindahkanKeSampah: "Move to Trash",
  catatanPromptSampah: "Prompts in Trash can still be restored to the collection.",
  konfirmasiHapusFolder: 'Delete folder "{{nama}}"?',
  pesanHapusKosong: "This folder is empty, so no prompt will be deleted along with it.",
  pesanPindahTanpaFolder: '{{jumlah}} prompts will be moved to "No Folder" and kept.',
  pesanPindahSampah:
    "{{jumlah}} prompts will be moved to Trash. They can still be restored from there.",

  // Tags
  buatTagBaru: "Create new tag",
  namaTagBaru: "New tag name",
  namaTag: "Tag name",
  ubahTagLabel: "Rename tag and change colour",
  ubahTagAria: "Edit tag {{nama}}",
  hapusTagAria: "Delete tag {{nama}}",
  hapusTagAksi: "Delete tag",
  namaTagKosong: "Tag name cannot be empty.",
  tagDibuat: 'Tag "{{nama}}" created.',
  tagDisimpan: 'Tag "{{nama}}" saved.',
  tagDihapus: 'Tag "{{nama}}" deleted.',
  tagGagalDihapus: "Tag could not be deleted.",
  memuatDaftarTag: "Loading tag list",
  warnaTag: "Tag colour",
  warnaTagAria: "{{warna}} colour",
  belumAdaTag: "No tags yet.",
  lepasFilterTag: "Clear all tag filters",
  konfirmasiHapusTag: 'Delete tag "{{nama}}"?',
  pesanHapusTag: "The tag is removed from {{jumlah}} prompts. The prompts stay.",

  // Trash
  kosongkanSampah: "Empty Trash",
  bahayaSampah:
    "Permanent deletion cannot be undone. Prompts in Trash do not appear in the normal list or search.",
  memuatSampah: "Loading trash...",
  sampahKosong: "Trash is empty",
  sampahKosongDetail:
    "Prompts you delete wait here until they are restored or deleted permanently.",
  dibuangPada: "Deleted {{waktu}}",
  hapusPermanen: "Delete permanently",
  konfirmasiKosongkan: "Empty Trash?",
  konfirmasiHapusPermanen: "Delete permanently?",
  pesanKonfirmasiHapus:
    "This action cannot be undone. The prompt text will be gone from the local database.",
  labelAksiHapus: "Yes, delete permanently",
  toastDipulihkan: "Prompt returned to the collection.",
  toastHapusPermanen: "Prompt deleted permanently.",
  toastKosongkan: "{{jumlah}} prompts deleted permanently.",
};

export default pengorganisir;
