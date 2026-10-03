import * as React from "react";
import { cn } from "@/lib/utils";

/** Area teks. Badan prompt memakai kelas `font-code` supaya isinya terlihat apa adanya. */
function AreaTeks({ className, ...sisa }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="area-teks"
      className={cn(
        "flex min-h-28 w-full rounded-sm border-2 border-primary bg-surface p-3.5",
        "text-body-md text-on-surface placeholder:text-secondary",
        "transition-[box-shadow,border-color,background-color] duration-[120ms] ease-standard outline-none",
        "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus",
        "aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-tint",
        "disabled:cursor-not-allowed disabled:border-secondary disabled:text-secondary",
        "field-sizing-content",
        className,
      )}
      {...sisa}
    />
  );
}

export { AreaTeks };
