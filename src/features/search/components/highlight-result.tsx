import { Fragment } from "react";
import { cn } from "@/lib/utils";

import { potongSorotan } from "../services/search-service";

/** Sorot kata yang cocok dengan latar kuning (DESIGN.md: kuning khusus highlight pencarian).
   Selain warna, sorotan dibedakan dengan bobot huruf dan elemen `mark` supaya tidak menjadi
   indikator tunggal. */
export function HasilSorotan({
  teks,
  kueri,
  className,
}: {
  teks: string;
  kueri: string;
  className?: string;
}) {
  return (
    <span className={cn("break-words", className)}>
      {potongSorotan(teks, kueri).map((bagian, indeks) =>
        bagian.cocok ? (
          <mark
            key={`${indeks}-${bagian.teks}`}
            className="rounded-sm bg-tertiary px-0.5 font-medium text-on-tertiary transition-colors duration-[120ms] ease-standard"
          >
            {bagian.teks}
          </mark>
        ) : (
          <Fragment key={`${indeks}-${bagian.teks}`}>{bagian.teks}</Fragment>
        ),
      )}
    </span>
  );
}
