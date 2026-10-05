import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";

import { Tombol } from "@/components/ui/button";
import {
  Dialog,
  DialogDeskripsi,
  DialogJudul,
  DialogKaki,
  DialogKonten,
  DialogKepala,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import { AreaTeks } from "@/components/ui/textarea";
import { buatPrompt } from "@/features/prompts/services/prompt-service";
import { skemaPrompt, type FormPrompt } from "@/features/prompts/types/prompt-skema";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";

const kosong: FormPrompt = { judul: "", isi: "", folderId: null, tagIds: [], tagBaru: [] };

/**
 * G4 aksi cepat di widget: form ringkas judul dan isi tanpa membuka jendela penuh.
 * Aturan validasi memakai skema yang sama dengan A1, dan backend tetap memvalidasi ulang.
 */
export function FormTambahCepat({
  terbuka,
  onTutup,
  onTersimpan,
}: {
  terbuka: boolean;
  onTutup: () => void;
  onTersimpan: () => void;
}) {
  const { t } = useTerjemah();
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormPrompt>({
    resolver: zodResolver(skemaPrompt) as Resolver<FormPrompt> as Resolver<FormPrompt>,
    defaultValues: kosong,
    mode: "onBlur",
  });

  const simpan = handleSubmit(async (nilai) => {
    setGalatSimpan(null);
    try {
      await buatPrompt({
        judul: (nilai.judul ?? "").trim() || null,
        isi: nilai.isi,
        folderId: null,
        tagIds: [],
        tagBaru: [],
      });
      beriTahuBerhasil(t("widget.toastPromptTersimpan"));
      reset(kosong);
      onTersimpan();
      onTutup();
    } catch (mentah) {
      const pesan = pesanGalat(mentah);
      setGalatSimpan(pesan);
      beriTahuGalat(pesan);
    }
  });

  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogKonten versi="panel">
        <form onSubmit={(event) => void simpan(event)}>
          <DialogKepala>
            <DialogJudul>{t("widget.promptBaru")}</DialogJudul>
            <DialogDeskripsi>{t("widget.deskripsiFormCepat")}</DialogDeskripsi>
          </DialogKepala>

          <div className="grid gap-xs">
            <Label htmlFor="widget-judul">{t("widget.labelJudul")}</Label>
            <Input
              id="widget-judul"
              placeholder={t("widget.opsional")}
              aria-invalid={Boolean(errors.judul)}
              {...register("judul")}
            />
            {errors.judul ? <Petunjuk galat>{errors.judul.message}</Petunjuk> : null}
          </div>

          <div className="grid gap-xs">
            <Label htmlFor="widget-isi">{t("widget.labelIsiPrompt")}</Label>
            <AreaTeks
              id="widget-isi"
              className="min-h-24"
              aria-invalid={Boolean(errors.isi)}
              {...register("isi")}
            />
            {errors.isi ? <Petunjuk galat>{errors.isi.message}</Petunjuk> : null}
          </div>

          {galatSimpan ? <Petunjuk galat>{galatSimpan}</Petunjuk> : null}

          <DialogKaki>
            <Tombol varian="sekunder" type="button" onClick={onTutup}>
              {t("umum.batal")}
            </Tombol>
            <Tombol varian="utama" type="submit" disabled={isSubmitting}>
              <SaveIcon aria-hidden />
              {isSubmitting ? t("umum.menyimpan") : t("umum.simpan")}
            </Tombol>
          </DialogKaki>
        </form>
      </DialogKonten>
    </Dialog>
  );
}
