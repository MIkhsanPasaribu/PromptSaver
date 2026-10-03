package com.promptsaver.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import org.json.JSONObject
import java.io.File

class MainActivity : TauriActivity() {
  // Tombol back Android diarahkan ke riwayat halaman. Frontend mendorong satu entri riwayat
  // setiap kali berpindah layar, jadi back = kembali satu layar. Di layar utama riwayat habis
  // dan sistem melanjutkan perilaku bawaannya (aplikasi masuk latar belakang).
  //
  // `handleBackNavigation` bawaan Tauri sengaja tidak dipakai. Mekanisme itu mengandalkan
  // WebView.canGoBack(), dan terukur di perangkat (API 36, WebView 133) canGoBack() tetap false
  // setelah history.pushState, jadi setiap tekanan back langsung keluar aplikasi. Di sini
  // tumpukan layar frontend yang jadi sumber kebenaran.

  private var layar: WebView? = null
  private var berkasTunda: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Edge-to-edge dipasang sesudah super: sebelum ini inset sistem belum tentu siap,
    // sehingga konten bisa tergambar di bawah bilah status.
    enableEdgeToEdge()
    pasangTombolBack()
    serahkan(intent)
  }

  private fun pasangTombolBack() {
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        val t = layar
        if (t == null) {
          lewatiKeBawaan(this)
          return
        }
        t.evaluateJavascript("window.psPanjangTumpukan || 1") { nilai ->
          val kedalaman = nilai?.trim()?.toIntOrNull() ?: 1
          if (kedalaman > 1) {
            // history.back() memicu popstate, dan lapisan web memotong tumpukannya sendiri.
            t.evaluateJavascript("history.back()", null)
          } else {
            lewatiKeBawaan(this)
          }
        }
      }
    })
  }

  /** Serahkan kembali peristiwa ke perilaku sistem (aplikasi masuk latar belakang). */
  @Suppress("DEPRECATION")
  private fun lewatiKeBawaan(kendali: OnBackPressedCallback) {
    kendali.isEnabled = false
    onBackPressedDispatcher.onBackPressed()
    kendali.isEnabled = true
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    serahkan(intent)
  }

  override fun onWebViewCreate(webView: WebView) {
    layar = webView
    // Halaman mungkin belum selesai dimuat saat intent datang, jadi jalurnya juga disimpan di
    // properti global. Lapisan web membacanya ketika terpasang, lalu kejadian ini dikirim ulang.
    berkasTunda?.let { kabarkan(it) }
    webView.postDelayed({ berkasTunda?.let { kabarkan(it) } }, 2000)
  }

  /** Berkas yang dibuka dari luar datang sebagai URI content yang tidak bisa dibaca Rust
     maupun plugin berkas resminya. Salin ke folder tukar aplikasi — jalur yang sama persis dengan
     `transfer::service::folder_ekspor` — lalu serahkan path hasilnya ke lapisan web (PRD D2, D4). */
  private fun serahkan(intent: Intent?) {
    val untaian = untaianUri(intent)
    if (untaian.isEmpty()) return

    var pertama: String? = null
    for (uri in untaian) {
      val jalur = salinKeFolderTukar(uri)
      if (jalur != null && pertama == null) pertama = jalur
    }

    pertama?.let { jalur ->
      berkasTunda = jalur
      layar?.let { kabarkan(jalur) }
    }
  }

  /** ACTION_SEND membawa satu URI, ACTION_SEND_MULTIPLE membawa daftar. Keduanya dinyatakan
     sebagai list supaya tidak ada aksi yang terdaftar di manifest tapi tidak ditangani. */
  @Suppress("DEPRECATION")
  private fun untaianUri(intent: Intent?): List<Uri> {
    if (intent == null) return emptyList()
    return when (intent.action) {
      Intent.ACTION_VIEW -> listOfNotNull(intent.data)
      Intent.ACTION_SEND -> listOfNotNull(intent.getParcelableExtra(Intent.EXTRA_STREAM))
      Intent.ACTION_SEND_MULTIPLE ->
        intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM) ?: emptyList()
      else -> emptyList()
    }
  }

  private fun salinKeFolderTukar(uri: Uri): String? {
    val namaAsli = uri.lastPathSegment?.substringAfterLast('/')
    val nama = if (namaAsli != null && namaAsli.endsWith(EKSTENSI)) namaAsli
    else "dari-luar-${System.currentTimeMillis()}$EKSTENSI"

    val folder = folderTukar()
    val tujuan = File(folder, nama)

    return runCatching {
      contentResolver.openInputStream(uri)?.use { masuk ->
        tujuan.outputStream().use { keluar -> masuk.copyTo(keluar) }
        tujuan.absolutePath
      }
    }.getOrElse { sebab ->
      Log.w(TAG, "Berkas ${uri.scheme} tidak dapat disalin: ${sebab.message}")
      null
    }
  }

  /** Sama dengan `dir_data/ekspor` di Rust (app_data_dir = dataDir aplikasi). */
  private fun folderTukar(): File =
    File(dataDir, "ekspor").apply { mkdirs() }

  private fun kabarkan(jalur: String) {
    // Jalur ditulis sebagai string JS yang di-escape, bukan disisipkan mentah.
    val aman = JSONObject.quote(jalur)
    layar?.evaluateJavascript(
      "window.promptsaverBerkasMasuk = $aman;" +
        "window.dispatchEvent(new CustomEvent('promptsaver:berkas-masuk', { detail: $aman }));",
      null,
    )
  }

  private companion object {
    const val TAG = "PromptSaver"
    const val EKSTENSI = ".promptsaver"
  }
}
