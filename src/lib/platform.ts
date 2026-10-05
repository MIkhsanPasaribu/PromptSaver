/** Deteksi platform dipakai untuk menyembunyikan aksi yang tidak ada di mobile, dan untuk
   menahan command khusus desktop agar tidak dipanggil di Android. */
export function deteksiPlatform(): "desktop" | "mobile" {
  if (typeof navigator === "undefined") return "desktop";
  const ponsel = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  return ponsel ? "mobile" : "desktop";
}
