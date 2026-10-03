import * as React from "react";
import { cn } from "@/lib/utils";

/** Label field. Dipakai bersama KolomIsi dan AreaTeks, terhubung lewat htmlFor. */
function Label({ className, ...sisa }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-xs font-display text-label-md text-on-surface",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-secondary",
        className,
      )}
      {...sisa}
    />
  );
}

/** Teks petunjuk atau pesan validasi di bawah field. */
export function Petunjuk({
  children,
  galat = false,
  className,
}: {
  children: React.ReactNode;
  galat?: boolean;
  className?: string;
}) {
  return (
    <p
      role={galat ? "alert" : undefined}
      className={cn("text-body-sm", galat ? "font-medium text-error" : "text-secondary", className)}
    >
      {children}
    </p>
  );
}

export { Label };
