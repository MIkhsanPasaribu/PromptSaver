import * as React from "react";
import { cn } from "@/lib/utils";

type PropertiKartu = React.ComponentProps<"div"> & {
  /** Elemen pembungkus. Pakai section atau article supaya semantik layar terjaga. */
  as?: "div" | "section" | "article";
  /** Kartu terpilih memakai garis 3px dan bayangan kuning sesuai DESIGN.md. */
  terpilih?: boolean;
  /** Kartu boleh di-klik (baris daftar dan tile ringkas). */
  dapatDitekan?: boolean;
};

function Kartu({
  className,
  as: Elemen = "div",
  terpilih = false,
  dapatDitekan = false,
  ...sisa
}: PropertiKartu) {
  return (
    <Elemen
      data-slot="kartu"
      data-terpilih={terpilih || undefined}
      className={cn(
        "rounded-none border-2 border-primary bg-surface p-md text-on-surface shadow-elev-3",
        "transition-[box-shadow,transform,background-color] duration-[120ms] ease-standard",
        dapatDitekan &&
          "cursor-pointer hover:shadow-elev-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-elev-2",
        terpilih && "border-[3px] bg-surface-sunken shadow-elev-terpilih",
        className,
      )}
      {...sisa}
    />
  );
}

function Judul({ className, ...sisa }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="judul-kartu"
      className={cn("font-display text-headline-sm leading-tight", className)}
      {...sisa}
    />
  );
}

function Isi({ className, ...sisa }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="isi-kartu"
      className={cn("text-body-md text-on-surface", className)}
      {...sisa}
    />
  );
}

function Kaki({ className, ...sisa }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kaki-kartu"
      className={cn("mt-sm flex items-center gap-xs", className)}
      {...sisa}
    />
  );
}

export { Kartu, Judul as JudulKartu, Isi as IsiKartu, Kaki as KakiKartu };
