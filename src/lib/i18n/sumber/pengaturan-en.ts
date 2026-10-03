/** Teks layar Pengaturan, Daftar Pintasan, dan Halaman Privasi, bahasa Inggris.
   Kunci harus sama dengan berkas id-nya. */
export default {
  judul: "Settings",
  memuatPengaturan: "Loading settings...",
  tampilan: "Appearance",

  labelTema: "Theme",
  temaIkutSistem: "Follow system",
  temaTerang: "Light",
  temaGelap: "Dark",
  petunjukTema: "Dark mode keeps the thick borders and the minimum AA contrast.",

  labelBahasa: "Language",
  petunjukBahasa:
    "The interface language changes instantly without closing the app. Your data and files are untouched.",

  kurangiAnimasi: "Reduce animation",
  petunjukKurangiAnimasi:
    "Honours the system reduce motion setting. Feedback still appears, only without movement.",

  labelUrutan: "List order",
  urutanTerbaru: "Recently changed",
  urutanDipakai: "Last used",
  urutanAbjad: "Alphabetical",

  labelIngatNilai: "Remember variable values",
  petunjukIngatNilai: "Uses the last value as a suggestion when filling template variables.",
  tampilkanPanduanLagi: "Show the guide again",

  modeWidgetDesktop: "Widget Mode (desktop)",
  perluasJendelaPenuh: "Expand to full window",
  cobaModeWidget: "Try Widget Mode",
  sematkanDiAtas: "Pin on top",
  petunjukSematkan: "The widget stays above other windows while you work.",
  sembunyikanKeTray: "Hide to tray when closed",
  petunjukTray:
    "If turned off, the close button exits completely and the global shortcut no longer calls it.",
  transparansiJendela: "Window transparency: {{nilai}}%",
  petunjukTransparansi:
    "The lower limit of {{min}}% keeps text readable. Below {{maks}}% block shadows are hidden and borders are thickened.",
  labelPintasanGlobal: "Global shortcut",
  aktifkanPintasanGlobal: "Enable global shortcut",
  simpanPintasan: "Save shortcut",
  petunjukPintasanGlobal:
    "Off by default. The app does not register any system shortcut until you turn it on, and it backs off when another app already owns the combination.",

  cadanganOtomatis: "Automatic backup",
  cadangkanSekarang: "Back up now",
  labelCadanganMingguan: "Back up every week",
  petunjukCadanganMingguan:
    "Once a week the app writes a copy of your collection into the app data folder. Only the five newest backups are kept. The format is the same as an export file, so its contents can be read on another device.",
  belumAdaCadangan: "No backups on this device yet.",
  cadanganDibuat: "Backup created in the app data folder.",
  judulPulihkan: "Restore this backup?",
  petunjukPulihkan:
    "Prompts from the backup are added to your current collection. The strategy decides what happens to prompts that already exist, exactly like importing a file.",
  yaPulihkan: "Yes, restore",
  pemulihanSelesai: "Restore finished. {{ditambah}} prompts added, {{dilewati}} skipped.",

  statistikKoleksi: "Collection statistics",
  statPrompt: "Prompts",
  statFolder: "Folders",
  statTag: "Tags",
  statSampah: "In Trash",
  statistikUkuran:
    "The local database is about {{kb}} KB. Everything is counted on your device, no network.",
  petunjukStatistik:
    "Press {{hitung}} to see the number of prompts, folders, tags, and the database size.",

  zonaBerbahaya: "Danger zone",
  labelAturUlang: "Reset to defaults",
  petunjukAturUlang:
    "Restores the theme, animation, order, and widget settings. Your whole prompt collection is untouched.",
  labelPrivasiData: "Data privacy",
  halamanPrivasi: "Privacy Page",
  petunjukDaftarPintasan: "The list of keyboard shortcuts that apply in this app.",
  hapusSemuaData: "Delete all data",
  petunjukHapusSemuaData: "Deletes every prompt, folder, tag, draft, and setting from this device.",
  lencanaBelumAdaCadangan: "No backup yet? Export one first from the Export and Import menu.",
  judulKonfirmasiHapus: "Delete all data?",
  judulKonfirmasiKedua: "Confirm the second step",
  petunjukKonfirmasiHapus:
    "All prompts, folders, tags, and settings on this device will be gone. Data already exported to a file stays where it is.",
  petunjukKonfirmasiKedua: "Type {{kata}} to continue. This action cannot be undone.",
  labelKataKonfirmasi: "Confirmation word",
  hapusBerkasCadangan: "Delete backup files too",
  petunjukHapusBerkasCadangan:
    "Weekly backups and the files in the export exchange folder are complete copies of your collection in plain text. Without this checkmark those copies stay on disk.",
  hapusPermanen: "Delete permanently",
  hapusSelesai: "All data on this device has been deleted.",
  hapusSelesaiTermasuk:
    "All data on this device has been deleted, including {{jumlah}} backup files.",

  judulPintasan: "Keyboard shortcuts",
  pintasanPromptBaru: "New prompt",
  pintasanPromptBaruKet: "Opens an empty prompt form.",
  pintasanFokusPencarian: "Focus search",
  pintasanFokusPencarianKet: "Starts typing keywords right away.",
  pintasanSalinFokus: "Copy focused row",
  pintasanSalinFokusKet: "Works while a list card has focus.",
  pintasanKembaliKet: "Leaves the screen or closes a dialog.",
  pintasanModeWidgetKet: "Desktop only.",
  catatanPintasan:
    "The shortcuts above work while the app has focus. System-level global shortcuts stay off until you enable them in Settings, and they can be cancelled when another app already uses them.",

  privasiJudul: "Privacy",
  privasiPengantar:
    "A short summary of what happens to the contents of your prompts. There are no hidden services beyond this list.",
  privasiTanpaJaringan: "No network access",
  privasiTanpaJaringanIsi:
    "PromptSaver never contacts any server. No account, no analytics, no ads, and no error reporter. On Android the INTERNET permission is not requested at all.",
  privasiDataLokal: "Data lives only on this device",
  privasiDataLokalIsi:
    "All prompts, folders, tags, and settings are stored in one SQLite database inside the app's private data folder. No copy is sent outside the device, and no other device can read it without your export file.",
  privasiTeksPolos: "Export files are plain text",
  privasiTeksPolosIsi:
    "A .promptsaver export file can be read by any application because it is not encrypted. Keep backup files somewhere you control, and delete temporary files once you are done moving data.",
  privasiHapusData: "Deleting your data",
  privasiHapusDataIsi:
    "Use the Delete all data button on the Settings page to wipe the database contents. Removing the app from the system does not always delete its data folder, so empty it first if someone else will use the device.",
  privasiKunci: "App lock with a PIN",
  privasiKunciIsi:
    "You can set a 4 to 12 digit PIN on the Settings page. The app asks for it on every start, after the window has been idle, and when the Android app moves to the background. The lock stops someone reading your collection on a device that is lying around unlocked; it does not encrypt anything, so the database and your backups stay readable if the files are copied away.",
  privasiBelumTersedia: "Not available in this version",
  privasiBelumEnkripsi:
    "Database encryption at rest (data on disk is still readable if your device is seized or compromised).",
};
