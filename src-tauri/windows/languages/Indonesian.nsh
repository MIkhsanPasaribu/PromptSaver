; Berkas string kustom Tauri untuk bahasa Indonesia.
;
; Tauri hanya membundel 23 bahasa kustom dan Indonesia tidak termasuk, jadi
; bundle > windows > nsis > customLanguageFiles menunjuk ke berkas ini. Tanpa ini
; build gagal dengan pesan "not a valid language". Terjemahan MUI2 yang standar
; (Berikut, Batalkan, Pilih Lokasi Instalasi) tetap datang dari Indonesian.nsh
; bawaan NSIS, bukan dari berkas ini.
;
; Placeholder dipertahankan persis seperti berkas Inggris.asli: ${PRODUCTNAME},
; ${VERSION}, $R4, $0, $1, $\n, dan {{product_name}} yang diisi Handlebars saat build.

LangString addOrReinstall ${LANG_INDONESIAN} "Tambah/Pasang ulang komponen"
LangString alreadyInstalled ${LANG_INDONESIAN} "Sudah Terpasang"
LangString alreadyInstalledLong ${LANG_INDONESIAN} "${PRODUCTNAME} ${VERSION} sudah terpasang. Pilih tindakan yang ingin kamu lakukan lalu klik Berikutnya untuk melanjutkan."
LangString appRunning ${LANG_INDONESIAN} "{{product_name}} sedang berjalan! Tutup dulu aplikasinya lalu coba lagi."
LangString appRunningOkKill ${LANG_INDONESIAN} "{{product_name}} sedang berjalan!$\nKlik OK untuk menghentikannya"
LangString chooseMaintenanceOption ${LANG_INDONESIAN} "Pilih opsi perbaikan yang ingin dilakukan."
LangString choowHowToInstall ${LANG_INDONESIAN} "Pilih cara memasang ${PRODUCTNAME}."
LangString createDesktop ${LANG_INDONESIAN} "Buat pintasan di desktop"
LangString dontUninstall ${LANG_INDONESIAN} "Jangan hapus pemasangan"
LangString dontUninstallDowngrade ${LANG_INDONESIAN} "Jangan hapus pemasangan (turun versi tanpa menghapus pemasangan dimatikan untuk installer ini)"
LangString failedToKillApp ${LANG_INDONESIAN} "Gagal menghentikan {{product_name}}. Tutup dulu aplikasinya lalu coba lagi"
LangString installingWebview2 ${LANG_INDONESIAN} "Memasang WebView2..."
LangString newerVersionInstalled ${LANG_INDONESIAN} "Versi ${PRODUCTNAME} yang lebih baru sudah terpasang! Memasang versi lama tidak disarankan. Kalau kamu benar-benar ingin memasang versi lama ini, sebaiknya hapus dulu versi yang sekarang. Pilih tindakan yang ingin kamu lakukan lalu klik Berikutnya untuk melanjutkan."
LangString older ${LANG_INDONESIAN} "lebih lama"
LangString olderOrUnknownVersionInstalled ${LANG_INDONESIAN} "Sistemmu memasang ${PRODUCTNAME} versi $R4. Sebaiknya hapus versi yang sekarang sebelum memasang. Pilih tindakan yang ingin kamu lakukan lalu klik Berikutnya untuk melanjutkan."
LangString silentDowngrades ${LANG_INDONESIAN} "Installer ini tidak menurunkan versi, jadi tidak bisa lanjut dalam mode tanpa antarmuka. Silakan gunakan installer yang berantarmuka.$\n"
LangString unableToUninstall ${LANG_INDONESIAN} "Tidak bisa menghapus pemasangan!"
LangString uninstallApp ${LANG_INDONESIAN} "Hapus pemasangan ${PRODUCTNAME}"
LangString uninstallBeforeInstalling ${LANG_INDONESIAN} "Hapus pemasangan dulu, lalu pasang"
LangString unknown ${LANG_INDONESIAN} "tidak diketahui"
LangString webview2AbortError ${LANG_INDONESIAN} "Gagal memasang WebView2! Aplikasi tidak bisa jalan tanpa itu. Coba jalankan ulang installernya."
LangString webview2DownloadError ${LANG_INDONESIAN} "Galat: gagal mengunduh WebView2 - $0"
LangString webview2DownloadSuccess ${LANG_INDONESIAN} "Bootstrapper WebView2 berhasil diunduh"
LangString webview2Downloading ${LANG_INDONESIAN} "Mengunduh bootstrapper WebView2..."
LangString webview2InstallError ${LANG_INDONESIAN} "Galat: memasang WebView2 gagal dengan kode keluar $1"
LangString webview2InstallSuccess ${LANG_INDONESIAN} "WebView2 berhasil dipasang"
LangString deleteAppData ${LANG_INDONESIAN} "Hapus data aplikasi"
