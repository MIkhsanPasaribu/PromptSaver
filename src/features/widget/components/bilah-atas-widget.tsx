import { Maximize2Icon, PinIcon, PinOffIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Tombol, type PropertiTombol } from "@/components/ui/button";
import { usePengaturan } from "@/app/store/pengaturan-store";
import { useTerjemah } from "@/lib/i18n";
import { deteksiPlatform } from "@/lib/platform";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

import {
  keluarModeWidget,
  sembunyikanWidget,
  simpanGeometriSekarang,
} from "../services/widget-service";

export type PropertiBilahAtas = {
  /** Aksi tambahan shell setelah widget diperluas. Opsional karena mode dibaca ulang dari ukuran. */
  onPerluas?: () => void | Promise<void>;
  /** Menggantikan perilaku tutup, misalnya ke tray atau keluar penuh (PRD G3). */
  onTutup?: () => void | Promise<void>;
};

type PropertiTombolBilah = Pick<PropertiTombol, "aria-label" | "onClick" | "children"> & {
  /** Hanya diisi untuk tombol keadaan (sematkan). Tombol langkah tidak boleh memakai aria-pressed. */
  keadaan?: boolean;
};

/** Tombol ikon di atas tinta bilah. Desktop memakai ikonKecil yang dipadatkan ke 32px;
   mobile memakai ukuran ikon supaya area sentuh 44px (DESIGN.md bagian Breakpoint). */
function TombolBilah({ "aria-label": label, onClick, children, keadaan }: PropertiTombolBilah) {
  const desktop = deteksiPlatform() === "desktop";
  return (
    <Tombol
      varian="bilah"
      ukuran={desktop ? "ikonPadat" : "ikon"}
      className={cn("shrink-0", keadaan && "bg-primary-hover")}
      aria-label={label}
      aria-pressed={keadaan}
      onClick={onClick}
    >
      {children}
    </Tombol>
  );
}

/**
 * Bilah atas Mode Widget: tinggi 32px, bisa digeser, dan hanya memuat aksi yang dibutuhkan
 * setiap saat (sematkan, perluas, tutup). Transparansi diatur di Pengaturan supaya bilah
 * tetap muat pada widget 288px (PRD G1 dan G2).
 */
export function BilahAtasWidget({ onPerluas, onTutup }: PropertiBilahAtas = {}) {
  const { t } = useTerjemah();
  const sematkan = Boolean(usePengaturan((s) => s.pengaturan?.widgetSelaluDiAtas));
  const ubahPengaturan = usePengaturan((s) => s.ubah);

  const perluas = async () => {
    try {
      await keluarModeWidget();
      await simpanGeometriSekarang(false);
      await onPerluas?.();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  const tutup = async () => {
    if (onTutup) {
      await onTutup();
      return;
    }
    // Lewat command, bukan API jendela dari web. Kemampuan `core:default` tidak memberi izin
    // `hide` ke lapisan web, dan Esc sudah memakai jalur command yang sama: satu jalur saja.
    try {
      await sembunyikanWidget();
    } catch (mentah) {
      beriTahuGalat(t("widget.gagalSembunyikan", { pesan: pesanGalat(mentah) }));
    }
  };

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex h-8 min-h-8 shrink-0 select-none items-center justify-between gap-xxs",
        "bg-primary px-xxs text-on-primary",
      )}
    >
      <span
        data-tauri-drag-region
        className="min-w-0 truncate font-display text-label-sm uppercase tracking-[0.08em]"
      >
        {t("navigasi.judul")}
      </span>

      <div className="flex shrink-0 items-center gap-xxs">
        <TombolBilah
          aria-label={t("widget.sematkanDiAtas")}
          keadaan={sematkan}
          onClick={() => void ubahPengaturan({ widgetSelaluDiAtas: !sematkan })}
        >
          {sematkan ? <PinIcon aria-hidden /> : <PinOffIcon aria-hidden />}
        </TombolBilah>

        <TombolBilah aria-label={t("widget.perluas")} onClick={() => void perluas()}>
          <Maximize2Icon aria-hidden />
        </TombolBilah>

        <TombolBilah aria-label={t("widget.tutupWidget")} onClick={() => void tutup()}>
          <XIcon aria-hidden />
        </TombolBilah>
      </div>
    </div>
  );
}
