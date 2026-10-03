import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs as TabsPrimitive } from "radix-ui";

/** Tab brutalis. Tab aktif memakai kuning plus garis tepi, tab diam memakai teks sekunder. */
function Tab({ className, ...sisa }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tab"
      className={cn("flex w-full flex-col gap-md", className)}
      {...sisa}
    />
  );
}

function TabDaftar({ className, ...sisa }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tab-daftar"
      className={cn("inline-flex w-fit items-center gap-xs", className)}
      {...sisa}
    />
  );
}

function TabPemicu({ className, ...sisa }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tab-pemicu"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-sm border-2 border-primary bg-surface px-3",
        "font-display text-label-sm uppercase tracking-[0.08em] text-secondary whitespace-nowrap",
        "cursor-pointer transition-[background-color,color,box-shadow,transform] duration-[120ms] ease-standard",
        "hover:text-on-surface hover:shadow-elev-1",
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus",
        "data-[state=active]:bg-tertiary data-[state=active]:text-on-tertiary data-[state=active]:shadow-elev-2",
        className,
      )}
      {...sisa}
    />
  );
}

function TabIsi({ className, ...sisa }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tab-isi"
      className={cn("flex-1 outline-none data-[state=inactive]:hidden", className)}
      {...sisa}
    />
  );
}

export { Tab, TabDaftar as TabsList, TabPemicu as TabsTrigger, TabIsi as TabsContent };
