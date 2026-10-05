import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { useTerjemah } from "@/lib/i18n";

/** Baris judul layar dengan tombol kembali. `ikon` menempel di depan judul, `aksi` menampung
   tombol tambahan di kanan setelah tombol kembali (mis. kosongkan Sampah). */
export function KepalaLayar({
  judul,
  ikon,
  aksi,
  padaKembali,
}: {
  judul: string;
  ikon?: ReactNode;
  aksi?: ReactNode;
  padaKembali: () => void;
}) {
  const { t } = useTerjemah();

  return (
    <div className="flex flex-wrap items-center justify-between gap-sm">
      <h1 className="flex items-center gap-xs font-display text-headline-lg">
        {ikon}
        {judul}
      </h1>
      <div className="flex items-center gap-xs">
        <Tombol varian="hantu" ukuran="kecil" onClick={padaKembali}>
          <ArrowLeftIcon aria-hidden />
          {t("umum.kembali")}
        </Tombol>
        {aksi}
      </div>
    </div>
  );
}
