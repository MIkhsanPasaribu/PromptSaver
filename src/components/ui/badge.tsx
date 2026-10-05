import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Chip tag dan lencana status. Enam hue ini adalah satu-satunya warna isi yang diizinkan. */
import { lencanaVariants } from "./badge-variants";

export type PropertiLencana = React.ComponentProps<"span"> & VariantProps<typeof lencanaVariants>;

export function Lencana({ className, warna, terpilih, dapatDitekan, ...sisa }: PropertiLencana) {
  return (
    <span
      data-slot="lencana"
      className={cn(lencanaVariants({ warna, terpilih, dapatDitekan }), className)}
      {...sisa}
    />
  );
}

/** Chip yang bisa dipilih untuk filter tag. Elemen tombol supaya target sentuh dan fokus benar. */

export function ChipPilih({
  aktif,
  onUbah,
  children,
  className,
}: {
  aktif: boolean;
  onUbah: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onUbah}
      className={cn(
        lencanaVariants({
          warna: aktif ? "kuning" : "netral",
          terpilih: aktif,
          dapatDitekan: true,
        }),
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus",
        className,
      )}
    >
      {children}
    </button>
  );
}
