import { CopyIcon, CheckIcon, StarIcon } from "lucide-react";
import { motion } from "motion/react";

import { Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { HasilSorotan } from "@/features/search";
import { useTerjemah } from "@/lib/i18n";
import { tanggalRelatif } from "@/lib/format-waktu";
import { DURASI, EASING } from "@/lib/animasi";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { cn } from "@/lib/utils";

type PropertiKartu = {
  prompt: Prompt;
  tersalin: boolean;
  jeda?: number;
  /** Kata yang disorot saat kartu tampil di hasil pencarian (PRD B3). */
  kueri?: string;
  onBuka: () => void;
  onSalin: () => void;
  onFavorit: (aktif: boolean) => void;
};

/** Kartu prompt di daftar. Salin cukup satu ketuk tanpa membuka detail (PRD C1). */
export function KartuPrompt({
  prompt,
  tersalin,
  jeda = 0,
  kueri,
  onBuka,
  onSalin,
  onFavorit,
}: PropertiKartu) {
  const { t } = useTerjemah();
  const judul = prompt.judul || t("umum.promptTanpaJudul");
  const isi = prompt.potongan ?? prompt.isi;
  const kueriAktif = kueri?.trim();

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURASI.komponen,
        delay: jeda,
        ease: EASING.standar,
      }}
      data-kartu-prompt={prompt.id}
      className={cn(
        "group relative rounded-none border-2 border-primary bg-surface p-md shadow-elev-3",
        "transition-[box-shadow,transform] duration-[120ms] ease-standard",
        "hover:shadow-elev-4",
        prompt.disemat && "border-[3px] shadow-elev-terpilih",
      )}
    >
      <h3 className="mb-xs break-words pr-12 font-display text-headline-sm leading-tight">
        <button
          type="button"
          onClick={onBuka}
          className="cursor-pointer text-left outline-none hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus"
        >
          {kueriAktif ? <HasilSorotan teks={judul} kueri={kueriAktif} /> : judul}
        </button>
      </h3>

      <p className="mb-sm line-clamp-3 break-words text-body-md text-on-surface">
        {kueriAktif ? <HasilSorotan teks={isi} kueri={kueriAktif} /> : isi}
      </p>

      <div className="flex flex-wrap items-center gap-xs">
        {prompt.tags.map((tag) => (
          <Lencana key={tag.id} warna={tag.warna}>
            {tag.nama}
          </Lencana>
        ))}
        {prompt.folderId && (
          <Lencana warna="netral" className="normal-case tracking-normal">
            {prompt.namaFolder}
          </Lencana>
        )}
      </div>

      <div className="mt-sm flex items-center justify-between gap-xs">
        <span className="text-body-sm text-secondary">
          {tanggalRelatif(prompt.diubahPada)}
          {prompt.dipakaiTerakhir
            ? t("koleksi.dipakaiPada", { waktu: tanggalRelatif(prompt.dipakaiTerakhir) })
            : ""}
        </span>

        <div className="flex items-center gap-xs">
          <Tombol
            varian="hantu"
            ukuran="ikonKecil"
            aria-label={t(prompt.favorit ? "koleksi.hapusFavorit" : "koleksi.tandaiFavorit")}
            aria-pressed={prompt.favorit}
            onClick={() => onFavorit(!prompt.favorit)}
          >
            <StarIcon className={cn("size-5", prompt.favorit && "fill-current text-tertiary")} />
          </Tombol>

          <Tombol
            varian={tersalin ? "sekunder" : "utama"}
            ukuran="kecil"
            data-aksi-salin=""
            aria-label={
              tersalin ? t("koleksi.tersalinKeClipboard") : t("koleksi.salinPromptJudul", { judul })
            }
            onClick={onSalin}
          >
            {tersalin ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {tersalin ? t("umum.tersalin") : t("umum.salin")}
          </Tombol>
        </div>
      </div>
    </motion.article>
  );
}
