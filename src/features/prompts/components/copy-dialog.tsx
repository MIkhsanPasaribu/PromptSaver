import { DialogVariabel } from "@/features/prompts/components/variable-dialog";
import { PanelSalinManual } from "@/features/prompts/components/manual-copy-panel";
import type { KeadaanSalin } from "@/features/prompts/hooks/use-salin";
import { usePengaturan } from "@/app/store/pengaturan-store";

/** Memasang kedua lapisan salin sekali pasang: dialog isian variabel (PRD C2) dan
   panel salin manual saat clipboard ditolak (PRD C1). */
export function DialogSalin({
  keadaan,
  versi = "baku",
}: {
  keadaan: KeadaanSalin;
  versi?: "baku" | "panel";
}) {
  const ingatNilai = usePengaturan((s) => Boolean(s.pengaturan?.ingatNilaiVariabel));

  return (
    <>
      <DialogVariabel
        prompt={keadaan.menungguVariabel}
        ingatNilai={ingatNilai}
        versi={versi}
        onSalin={keadaan.salinTeks}
        onTutup={keadaan.tutupVariabel}
      />
      <PanelSalinManual
        antrean={keadaan.salinManual}
        versi={versi}
        onTutup={keadaan.tutupSalinManual}
      />
    </>
  );
}
