import { cn } from "@/lib/utils";

import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Petunjuk } from "@/components/ui/label";
import { gunakanStatistik } from "@/features/settings";
import { terjemah, useTerjemah } from "@/lib/i18n";
import { DaftarFolder } from "./folder-list";
import { DaftarTag } from "@/features/tags";

const ANGKA = new Intl.NumberFormat("id-ID");

/** Satuan dibaca lewat `terjemah()` karena fungsi ini dipanggil di luar komponen React. */
function formatUkuran(kb: number): string {
  if (kb < 1024) return terjemah("pengorganisir.ukuranKb", { angka: ANGKA.format(kb) });
  return terjemah("pengorganisir.ukuranMb", { angka: (kb / 1024).toFixed(1).replace(".", ",") });
}

function TileAngka({ label, nilai }: { label: string; nilai: number | null }) {
  return (
    <Kartu className="flex flex-col gap-xxs">
      {nilai === null ? (
        <span
          aria-hidden
          className="h-12 w-24 animate-pulse rounded-sm border-2 border-neutral bg-surface-sunken"
        />
      ) : (
        <span className="font-display text-headline-xl tabular-nums">{ANGKA.format(nilai)}</span>
      )}
      <span className="font-display text-label-md text-secondary">{label}</span>
    </Kartu>
  );
}

export function HalamanKategori({ className }: { className?: string }) {
  const { t } = useTerjemah();
  const { statistik, memuat, muatUlang } = gunakanStatistik();
  const padaBerubah = () => void muatUlang();

  return (
    <div className={cn("mx-auto flex w-full max-w-[1080px] flex-col gap-md", className)}>
      <header className="flex flex-col gap-xxs">
        <h1 className="font-display text-headline-md">{t("pengorganisir.judulKategori")}</h1>
        <p className="text-body-md text-secondary">{t("pengorganisir.subjudulKategori")}</p>
      </header>

      <section
        aria-label={t("pengorganisir.ariaStatistikKoleksi")}
        className="grid grid-cols-2 gap-md md:grid-cols-4"
      >
        <TileAngka label={t("pengorganisir.tilePrompt")} nilai={statistik?.jumlahPrompt ?? null} />
        <TileAngka label={t("pengorganisir.tileFolder")} nilai={statistik?.jumlahFolder ?? null} />
        <TileAngka label={t("pengorganisir.tileTag")} nilai={statistik?.jumlahTag ?? null} />
        <TileAngka
          label={t("pengorganisir.tileDiSampah")}
          nilai={statistik?.jumlahSampah ?? null}
        />
      </section>

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <Kartu>
          <DaftarFolder padaBerubah={padaBerubah} />
        </Kartu>
        <Kartu>
          <DaftarTag dapatDikelola padaBerubah={padaBerubah} />
        </Kartu>
      </div>

      {statistik && (
        <Petunjuk>
          {t("pengorganisir.ukuranDatabaseLokal", {
            ukuran: formatUkuran(statistik.ukuranDatabaseKb),
          })}
        </Petunjuk>
      )}

      {!statistik && !memuat && (
        <div className="flex items-center gap-xs">
          <Petunjuk galat>{t("pengorganisir.statistikGagal")}</Petunjuk>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => void muatUlang()}>
            {t("pengorganisir.cobaLagi")}
          </Tombol>
        </div>
      )}
    </div>
  );
}
