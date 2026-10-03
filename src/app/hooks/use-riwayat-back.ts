import { useEffect } from "react";

import { useNavigasi } from "@/app/store/navigasi-store";

/** Sambungkan tombol back sistem (Android) ke tumpukan layar.
   WebView memanggil `history.back()` lebih dulu lewat `handleBackNavigation`, lalu event
   `popstate` di sini memotong tumpukan. Tanpa pemotongan lewat JS, back Android akan langsung
   keluar aplikasi (PRD E4 tombol back mobile). */
export function gunakanRiwayatBack(siap: boolean) {
  const potongKe = useNavigasi((s) => s.potongKe);

  useEffect(() => {
    // Layar kunci selalu berada di dasar tumpukan, jadi tombol back di sana cukup handled
    // oleh sistem (aplikasi pindah ke latar) dan tidak boleh memotong tumpukan yang tersembunyi.
    if (!siap) return;
    const saatKembali = (event: PopStateEvent) => {
      const kedalaman = (event.state as { ps?: number } | null)?.ps ?? 1;
      potongKe(kedalaman);
    };
    window.addEventListener("popstate", saatKembali);
    return () => window.removeEventListener("popstate", saatKembali);
  }, [siap, potongKe]);
}
