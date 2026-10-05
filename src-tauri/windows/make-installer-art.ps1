# Membuat bitmap wizard NSIS (sidebar, header, header uninstaller) dari logo master.
# Jalankan:  powershell -NoProfile -ExecutionPolicy Bypass -File src-tauri\windows\make-installer-art.ps1
#
# NSIS menuntut BMP 24-bit tanpa kompresi dengan ukuran persis: sidebar 164x314 untuk
# halaman Welcome/Finish, header 150x57 untuk semua halaman antara.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$akar = Split-Path -Parent $PSScriptRoot
$akar = Split-Path -Parent $akar
$out = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$krem = [System.Drawing.Color]::FromArgb(244, 239, 227)   # --color-neutral
$kuning = [System.Drawing.Color]::FromArgb(255, 210, 63)  # --color-tertiary
$hitam = [System.Drawing.Color]::FromArgb(20, 18, 16)     # --color-primary
$merah = [System.Drawing.Color]::FromArgb(179, 38, 30)    # --color-error
$putih = [System.Drawing.Color]::FromArgb(255, 253, 247)  # --color-surface

function New-Kanvas([int]$lebar, [int]$tinggi, [System.Drawing.Color]$warna) {
  $bmp = New-Object System.Drawing.Bitmap $lebar, $tinggi, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear($warna)
  return @{ Bmp = $bmp; G = $g }
}

# Blok bergaya neo-brutalism: bayangan solid offset tanpa blur, lalu bingkai tebal.
function Gambar-Blok($g, [int]$x, [int]$y, [int]$w, [int]$h, [System.Drawing.Color]$isi, [int]$garis = 3, [int]$geser = 4) {
  $kuasBayangan = New-Object System.Drawing.SolidBrush $hitam
  $g.FillRectangle($kuasBayangan, ($x + $geser), ($y + $geser), $w, $h)
  $kuasIsi = New-Object System.Drawing.SolidBrush $isi
  $g.FillRectangle($kuasIsi, $x, $y, $w, $h)
  $pena = New-Object System.Drawing.Pen $hitam, $garis
  $g.DrawRectangle($pena, $x, $y, $w, $h)
  $kuasBayangan.Dispose(); $kuasIsi.Dispose(); $pena.Dispose()
}

function Simpan($kanvas, [string]$nama) {
  $jalur = Join-Path $out $nama
  $kanvas.Bmp.Save($jalur, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $kanvas.G.Dispose(); $kanvas.Bmp.Dispose()
  Write-Host "  $nama"
}

# --- sidebar 164x314 -------------------------------------------------------
$s = New-Kanvas 164 314 $krem
$logo = [System.Drawing.Image]::FromFile((Join-Path $akar "src\assets\brand\promptsaver-logo.png"))
# Logo punya latar krem sendiri; tempel di atas kotak kuning supaya tepinya tidak terlihat.
Gambar-Blok $s.G 34 44 96 96 $kuning 3 5
$s.G.DrawImage($logo, 40, 50, 84, 84)
Gambar-Blok $s.G 30 176 104 20 $kuning 3 4
Gambar-Blok $s.G 30 206 104 20 $putih 3 4
Gambar-Blok $s.G 30 236 104 20 $kuning 3 4
$penaTebal = New-Object System.Drawing.Pen $hitam, 4
$s.G.DrawLine($penaTebal, 160, 0, 160, 314)
$s.G.Dispose(); $penaTebal.Dispose(); $logo.Dispose()
Simpan $s "sidebar.bmp"

# --- header 150x57 (halaman instalasi) ------------------------------------
$h = New-Kanvas 150 57 $putih
Gambar-Blok $h.G 118 16 20 20 $kuning 3 3
$pena = New-Object System.Drawing.Pen $hitam, 3
$h.G.DrawLine($pena, 0, 54, 150, 54)
$h.G.Dispose(); $pena.Dispose()
Simpan $h "header.bmp"

# --- header 150x57 (halaman uninstaller) ----------------------------------
$u = New-Kanvas 150 57 $putih
Gambar-Blok $u.G 118 16 20 20 $merah 3 3
$pena = New-Object System.Drawing.Pen $hitam, 3
$u.G.DrawLine($pena, 0, 54, 150, 54)
$u.G.Dispose(); $pena.Dispose()
Simpan $u "uninstaller-header.bmp"

Write-Host "selesai: $out"
