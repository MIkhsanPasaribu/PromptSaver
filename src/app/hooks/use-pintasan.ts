import { useEffect } from "react";

import { useNavigasi } from "@/app/store/navigasi-store";
import { gunakanModeJendela } from "@/features/widget/hooks/use-mode-jendela";
import { deteksiPlatform } from "@/features/widget/services/widget-service";

/** E5 pintasan keyboard desktop. Pintasan global (sistem) diatur terpisah di Pengaturan.
   `siap` menunda pemasangan sampai layar kunci terbuka: pintasan yang bekerja di balik layar
   terkunci akan mengubah navigasi tanpa pernah terlihat pengguna. */
export function gunakanPintasanAplikasi(siap: boolean) {
  const navigasi = useNavigasi();
  const { modeWidget, masukWidget, perluas } = gunakanModeJendela();
  const desktop = deteksiPlatform() === "desktop";

  useEffect(() => {
    if (!siap) return;
    const saatKetuk = (event: KeyboardEvent) => {
      const pengubah = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement | null;
      const sedangMengetik =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (event.key === "Escape") {
        if (!navigasi.kembali()) event.preventDefault();
        return;
      }

      if (pengubah && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const kolom = document.querySelector<HTMLInputElement>('input[role="searchbox"]');
        kolom?.focus();
        kolom?.select();
        return;
      }

      if (pengubah && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigasi.ke({ nama: "form" });
        return;
      }

      if (event.altKey && event.key === "Enter" && desktop) {
        event.preventDefault();
        if (modeWidget) {
          perluas();
        } else {
          void masukWidget();
        }
      }

      // Enter pada kartu yang sedang fokus menyalin isinya tanpa membuka detail.
      if (event.key === "Enter" && sedangMengetik === false) {
        const kartu = document.activeElement?.closest<HTMLElement>("[data-kartu-prompt]");
        const tombolSalin = kartu?.querySelector<HTMLButtonElement>("[data-aksi-salin]");
        if (tombolSalin) {
          event.preventDefault();
          tombolSalin.click();
        }
      }
    };

    window.addEventListener("keydown", saatKetuk);
    return () => window.removeEventListener("keydown", saatKetuk);
  }, [siap, desktop, modeWidget, navigasi, masukWidget, perluas]);
}
