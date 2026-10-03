import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";

import { Tombol, type PropertiTombol } from "@/components/ui/button";

export type MenuItem = {
  label: string;
  onPilih: () => void;
  bahaya?: boolean;
  nonaktif?: boolean;
};

type PropertiMenu = {
  pemicu: React.ReactNode;
  item: MenuItem[];
  /** Sisi bukaan menu, dipetakan ke nilai sisi Radix. */
  arah?: "bawah" | "atas" | "kiri" | "kanan";
  labelAria: string;
} & Pick<PropertiTombol, "varian" | "ukuran">;

/** Menu dropdown brutalis berbasis Radix. Dipakai aksi "Pindahkan" dan menu lain. */
const SISI: Record<NonNullable<PropertiMenu["arah"]>, "top" | "right" | "bottom" | "left"> = {
  bawah: "bottom",
  atas: "top",
  kiri: "left",
  kanan: "right",
};

export function MenuTombol({
  pemicu,
  item,
  arah = "bawah",
  labelAria,
  varian,
  ukuran,
}: PropertiMenu) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>
        <Tombol varian={varian ?? "sekunder"} ukuran={ukuran ?? "kecil"} aria-label={labelAria}>
          {pemicu}
          <ChevronDownIcon aria-hidden />
        </Tombol>
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          side={SISI[arah]}
          align="start"
          sideOffset={6}
          className={cn(
            "z-popover min-w-52 rounded-sm border-2 border-primary bg-surface p-xs shadow-elev-4",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "duration-[180ms] ease-standard",
          )}
        >
          {item.map((satuan) => (
            <MenuPrimitive.Item
              key={satuan.label}
              disabled={satuan.nonaktif}
              onSelect={satuan.onPilih}
              className={cn(
                "flex cursor-pointer select-none items-center rounded-sm px-3 py-2.5 text-body-md outline-none",
                "focus-visible:bg-tertiary focus-visible:text-on-tertiary",
                "data-[disabled]:cursor-not-allowed data-[disabled]:text-secondary",
                satuan.bahaya && "text-error focus-visible:bg-error focus-visible:text-on-error",
              )}
            >
              {satuan.label}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
