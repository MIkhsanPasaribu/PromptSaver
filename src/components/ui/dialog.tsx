import * as React from "react";
import { cn } from "@/lib/utils";
import { useTerjemah } from "@/lib/i18n";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Tombol } from "@/components/ui/button";

const DURASI_DIALOG = "duration-[180ms] ease-standard";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPemicu(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-pemicu" {...props} />;
}

function DialogTutup(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-tutup" {...props} />;
}

function DialogIsiLuar(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogLatar({ className, ...sisa }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-latar"
      className={cn(
        "fixed inset-0 z-dialog bg-scrim/60",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        DURASI_DIALOG,
        className,
      )}
      {...sisa}
    />
  );
}

type PropertiKonten = React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** `panel` dipakai dialog isian variabel di dalam widget. */
  versi?: "baku" | "panel";
};

function DialogKonten({ className, children, versi = "baku", ...sisa }: PropertiKonten) {
  const { t } = useTerjemah();
  return (
    <DialogIsiLuar>
      <DialogLatar />
      <DialogPrimitive.Content
        data-slot="dialog-konten"
        className={cn(
          "fixed z-dialog left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100vw-32px)] max-w-[480px] rounded-md border-[3px] border-primary",
          "bg-surface text-on-surface p-lg shadow-elev-5",
          DURASI_DIALOG,
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          versi === "panel" && "max-w-[380px] p-md shadow-elev-4",
          className,
        )}
        {...sisa}
      >
        {children}
        <DialogTutup
          className="absolute right-3 top-3 inline-flex size-11 cursor-pointer items-center justify-center
                     rounded-sm border-2 border-primary bg-surface text-on-surface shadow-elev-1
                     transition-[transform,box-shadow] duration-[120ms] ease-standard
                     hover:shadow-elev-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                     focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus"
        >
          <XIcon className="size-5" aria-hidden />
          <span className="sr-only">{t("umum.tutup")}</span>
        </DialogTutup>
      </DialogPrimitive.Content>
    </DialogIsiLuar>
  );
}

function DialogKepala({ className, ...sisa }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-kepala"
      className={cn("mb-md grid gap-xs pr-11 text-left", className)}
      {...sisa}
    />
  );
}

function DialogJudul({ className, ...sisa }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-judul"
      className={cn("font-display text-headline-md", className)}
      {...sisa}
    />
  );
}

function DialogDeskripsi({
  className,
  ...sisa
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-deskripsi"
      className={cn("text-body-md text-secondary", className)}
      {...sisa}
    />
  );
}

function DialogKaki({ className, ...sisa }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-kaki"
      className={cn("mt-lg flex flex-wrap items-center justify-end gap-sm", className)}
      {...sisa}
    />
  );
}

/** Dialog konfirmasi hapus. Tombol bahaya selalu butuh konfirmasi eksplisit (PRD A2). */
export function DialogKonfirmasi({
  terbuka,
  judul,
  pesan,
  labelAksi,
  labelBatal,
  sedangProses = false,
  onAksi,
  onTutup,
}: {
  terbuka: boolean;
  judul: string;
  pesan: string;
  labelAksi: string;
  labelBatal?: string;
  sedangProses?: boolean;
  onAksi: () => void;
  onTutup: () => void;
}) {
  const { t } = useTerjemah();
  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogKonten>
        <DialogKepala>
          <DialogJudul>{judul}</DialogJudul>
          <DialogDeskripsi>{pesan}</DialogDeskripsi>
        </DialogKepala>
        <DialogKaki>
          <Tombol varian="sekunder" onClick={onTutup} disabled={sedangProses}>
            {labelBatal ?? t("umum.batal")}
          </Tombol>
          <Tombol varian="bahaya" onClick={onAksi} disabled={sedangProses}>
            {sedangProses ? t("umum.memproses") : labelAksi}
          </Tombol>
        </DialogKaki>
      </DialogKonten>
    </Dialog>
  );
}

export {
  Dialog,
  DialogPemicu,
  DialogTutup,
  DialogKonten,
  DialogKepala,
  DialogJudul,
  DialogDeskripsi,
  DialogKaki,
};
