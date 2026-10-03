import * as React from "react";
import { cn } from "@/lib/utils";

/** Kolom isis satu baris. Garis tepi 2px tinta, state error memakai garis error dan latar error-tint. */
function KolomIsi({ className, type, ...sisa }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="kolom-isi"
      type={type}
      className={cn(
        "flex h-11 w-full min-w-0 items-center rounded-sm border-2 border-primary bg-surface px-3.5",
        "text-body-md text-on-surface placeholder:text-secondary",
        "transition-[box-shadow,border-color,background-color] duration-[120ms] ease-standard outline-none",
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus",
        "aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-tint",
        "disabled:cursor-not-allowed disabled:border-secondary disabled:text-secondary",
        "file:mr-3 file:border-0 file:bg-transparent file:font-display file:text-label-md",
        className,
      )}
      {...sisa}
    />
  );
}

export { KolomIsi as Input };
