import { useCallback, useEffect, useRef } from "react";
import { ClipboardCopyIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import {
  Dialog,
  DialogDeskripsi,
  DialogKaki,
  DialogKepala,
  DialogKonten,
  DialogJudul,
} from "@/components/ui/dialog";
import { AreaTeks } from "@/components/ui/textarea";
import type { AntreanSalinManual } from "@/features/prompts/hooks/use-salin";
import { useTerjemah } from "@/lib/i18n";

/** Alur gagal PRD C1: clipboard ditolak sistem, pengguna tetap diberi teks siap blok. */
export function PanelSalinManual({
  antrean,
  versi = "baku",
  onTutup,
}: {
  antrean: AntreanSalinManual | null;
  versi?: "baku" | "panel";
  onTutup: () => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const { t } = useTerjemah();

  const pilihSemua = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, el.value.length);
  }, []);

  useEffect(() => {
    if (antrean) pilihSemua();
  }, [antrean, pilihSemua]);

  return (
    <Dialog open={Boolean(antrean)} onOpenChange={(buka) => !buka && onTutup()}>
      {antrean && (
        <DialogKonten versi={versi}>
          <DialogKepala>
            <DialogJudul>{t("prompt.salinManual")}</DialogJudul>
            <DialogDeskripsi>{t("prompt.salinManualPesan")}</DialogDeskripsi>
          </DialogKepala>

          <AreaTeks
            ref={area}
            readOnly
            aria-label={t("prompt.isiUntukSalinManual")}
            value={antrean.teks}
            className="min-h-32 max-h-[45vh] font-code text-code-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) onTutup();
            }}
          />

          <DialogKaki>
            <Tombol varian="sekunder" onClick={pilihSemua}>
              <ClipboardCopyIcon aria-hidden />
              {t("prompt.pilihSemua")}
            </Tombol>
            <Tombol onClick={onTutup}>{t("prompt.selesai")}</Tombol>
          </DialogKaki>
        </DialogKonten>
      )}
    </Dialog>
  );
}
