import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";

import { useNavigasi } from "@/app/store/navigasi-store";
import { Tombol } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTerjemah } from "@/lib/i18n";

/** Jeda ketik sebelum kueri dikirim ke pencarian. Di bawah anggaran 200 ms hasil pencarian (PRD B3). */
const JEDA_KETIK = 180;

export function KolomCari({
  className,
  fokusOtomatis = false,
}: {
  className?: string;
  fokusOtomatis?: boolean;
}) {
  const kueriTersimpan = useNavigasi((s) => s.kueri);
  const aturFilter = useNavigasi((s) => s.aturFilter);
  const { t } = useTerjemah();
  const [teks, setTeks] = useState(kueriTersimpan);
  const kolom = useRef<HTMLInputElement>(null);

  // Ikuti perubahan dari luar (reset filter, layar lain) tanpa menimpa ketikan yang sedang berjalan.
  useEffect(() => {
    setTeks((sekarang) => (sekarang === kueriTersimpan ? sekarang : kueriTersimpan));
  }, [kueriTersimpan]);

  useEffect(() => {
    if (teks === kueriTersimpan) return;
    const tundaan = window.setTimeout(() => aturFilter({ kueri: teks }), JEDA_KETIK);
    return () => window.clearTimeout(tundaan);
  }, [teks, kueriTersimpan, aturFilter]);

  useEffect(() => {
    if (fokusOtomatis) kolom.current?.focus();
  }, [fokusOtomatis]);

  const kirim = (nilai: string) => {
    setTeks(nilai);
    aturFilter({ kueri: nilai });
  };

  return (
    <form
      role="search"
      className={cn("relative flex items-center", className)}
      onSubmit={(event) => {
        event.preventDefault();
        kirim(teks);
        kolom.current?.blur();
      }}
    >
      <SearchIcon
        className="pointer-events-none absolute left-3 size-5 shrink-0 text-secondary"
        aria-hidden
      />
      <Input
        id="kolom-cari"
        ref={kolom}
        type="search"
        role="searchbox"
        aria-label={t("umum.cariPrompt")}
        placeholder={t("umum.cariPromptPanjang")}
        autoComplete="off"
        value={teks}
        className="h-11 pl-11 pr-11"
        onChange={(event) => setTeks(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          kirim("");
        }}
      />
      {teks.length > 0 && (
        <Tombol
          varian="hantu"
          ukuran="ikonKecil"
          type="button"
          aria-label={t("koleksi.hapusKueri")}
          className="absolute right-1.5"
          onClick={() => {
            kirim("");
            kolom.current?.focus();
          }}
        >
          <XIcon />
        </Tombol>
      )}
    </form>
  );
}
