import { useState } from "react";
import { motion } from "motion/react";
import {
  ClipboardCopyIcon,
  FolderTreeIcon,
  MoveHorizontalIcon,
  SkipForwardIcon,
} from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { VARIAN } from "@/lib/animasi";
import { useNavigasi } from "@/app/store/navigasi-store";
import { usePengaturan } from "@/app/store/pengaturan-store";
import { useTerjemah } from "@/lib/i18n";

/** Teks tiap layar disimpan sebagai kunci i18n; urutan layar dan ikonnya tidak berubah. */
const LAYAR = [
  {
    kunciJudul: "onboarding.judulSimpan",
    kunciPesan: "onboarding.pesanSimpan",
    ikon: FolderTreeIcon,
  },
  {
    kunciJudul: "onboarding.judulCariSalin",
    kunciPesan: "onboarding.pesanCariSalin",
    ikon: ClipboardCopyIcon,
  },
  {
    kunciJudul: "onboarding.judulPindahkan",
    kunciPesan: "onboarding.pesanPindahkan",
    ikon: MoveHorizontalIcon,
  },
];

/** E4 onboarding singkat: maksimal tiga layar, bisa dilewati, hanya muncul sekali. */
export function LayarOnboarding() {
  const [indeks, setIndeks] = useState(0);
  const { t } = useTerjemah();
  const ubah = usePengaturan((s) => s.ubah);
  const navigasi = useNavigasi();

  const selesai = async () => {
    await ubah({ onboardingSelesai: true });
    navigasi.ganti({ nama: "koleksi" });
  };

  const layar = LAYAR[indeks] ?? LAYAR[0]!;
  const Ikon = layar.ikon;
  const terakhir = indeks === LAYAR.length - 1;

  return (
    <div className="grid min-h-screen w-screen place-items-center bg-neutral p-lg">
      <motion.section
        initial={VARIAN.masukBaris.initial}
        animate={VARIAN.masukBaris.animate}
        transition={VARIAN.masukBaris.transition}
        className="w-full max-w-[560px] border-2 border-primary bg-surface p-xl shadow-elev-5"
        aria-live="polite"
      >
        <div className="mb-lg flex items-center justify-between gap-sm">
          <ol
            className="flex items-center gap-xs"
            aria-label={t("onboarding.layarDari", { nomor: indeks + 1, total: LAYAR.length })}
          >
            {LAYAR.map((_, i) => (
              <li
                key={i}
                aria-hidden
                className={`h-2 w-8 rounded-sm border-2 border-primary ${
                  i <= indeks ? "bg-tertiary" : "bg-surface"
                }`}
              />
            ))}
          </ol>
          <Tombol varian="hantu" ukuran="kecil" onClick={() => void selesai()}>
            <SkipForwardIcon aria-hidden />
            {t("onboarding.lewati")}
          </Tombol>
        </div>

        <div className="mb-lg grid place-items-center">
          <span className="grid size-16 place-items-center rounded-sm border-2 border-primary bg-surface-sunken shadow-elev-3">
            <Ikon className="size-8" aria-hidden />
          </span>
        </div>

        <h1 className="font-display text-headline-lg">{t(layar.kunciJudul)}</h1>
        <p className="mt-sm text-body-lg text-on-surface">{t(layar.kunciPesan)}</p>

        <div className="mt-xl flex items-center justify-between gap-sm">
          <Tombol
            varian="hantu"
            disabled={indeks === 0}
            onClick={() => setIndeks((n) => Math.max(0, n - 1))}
          >
            {t("onboarding.sebelumnya")}
          </Tombol>
          <Tombol
            onClick={() => {
              if (terakhir) void selesai();
              else setIndeks((n) => n + 1);
            }}
          >
            {terakhir ? t("onboarding.mulaiMemakai") : t("umum.lanjut")}
          </Tombol>
        </div>
      </motion.section>
    </div>
  );
}
