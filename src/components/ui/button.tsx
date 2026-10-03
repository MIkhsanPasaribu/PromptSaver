import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

/** Varian tombol brutalis. Garis tepi 2px, bayangan blok, dan state tekan memindahkan
   elemen ke arah bayangan. Dimensi mengacu peta komponen DESIGN.md bagian Elevasi. */
const tombolVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-sm " +
    "border-2 border-primary font-display leading-none " +
    "transition-[transform,box-shadow,background-color] duration-[120ms] ease-standard outline-none " +
    "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus " +
    "disabled:cursor-not-allowed disabled:border-secondary disabled:bg-surface-sunken " +
    "disabled:text-secondary disabled:shadow-none " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      varian: {
        utama:
          "bg-primary text-on-primary shadow-elev-2 hover:bg-primary-hover hover:shadow-elev-3 " +
          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        sekunder:
          "bg-surface text-on-surface shadow-elev-2 hover:bg-tertiary hover:text-on-tertiary hover:shadow-elev-3 " +
          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        bahaya:
          "bg-error text-on-error shadow-elev-2 hover:shadow-elev-3 " +
          "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        hantu:
          "border-transparent bg-transparent text-on-surface shadow-none " +
          "hover:bg-surface-sunken hover:shadow-none active:translate-x-0 active:translate-y-0",
        /** Tombol di atas bilah tinta Mode Widget. Warnanya bagian dari varian, bukan
           `className` yang ditimpakan, karena dua kelas warna sekaligus membuat pemenangnya
           ditentukan urutan stylesheet dan ikon jadi tak terlihat sebelum di-hover. */
        bilah:
          "border-transparent bg-transparent text-on-primary shadow-none " +
          "focus-visible:outline-surface " +
          "hover:bg-primary-hover hover:text-on-primary active:translate-x-0 active:translate-y-0",
      },
      rata: {
        tengah: "justify-center",
        kiri: "justify-start text-left",
      },
      ukuran: {
        baku: "h-11 gap-2 px-5 text-label-md [&_svg]:size-5",
        kecil: "h-9 gap-1.5 px-3.5 text-body-sm [&_svg]:size-4",
        ikon: "size-11 px-0 text-label-md shadow-elev-2 hover:shadow-elev-3 [&_svg]:size-5",
        ikonKecil: "size-9 px-0 shadow-elev-1 hover:shadow-elev-2 [&_svg]:size-4",
        /** Baris daftar padat (Mode Widget): tanpa bayangan, 32px, ikon kecil. */
        ikonPadat: "size-8 p-0 shadow-none hover:shadow-none [&_svg]:size-4",
        /** Tombol navigasi bawah layar sempit: tinggi 56px, label di bawah ikon. */
        navigasi: "h-14 gap-1 px-2 text-label-sm [&_svg]:size-5",
      },
    },
    defaultVariants: { varian: "utama", ukuran: "baku", rata: "tengah" },
  },
);

export type PropertiTombol = React.ComponentProps<"button"> &
  VariantProps<typeof tombolVariants> & { asChild?: boolean };

export function Tombol({
  className,
  varian,
  ukuran,
  rata,
  asChild = false,
  ...sisa
}: PropertiTombol) {
  const Komponen = asChild ? Slot.Root : "button";

  return (
    <Komponen
      data-slot="tombol"
      data-variant={varian}
      data-rata={rata}
      className={cn(tombolVariants({ varian, ukuran, rata }), className)}
      {...sisa}
    />
  );
}
