import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  CopyPlusIcon,
  FolderInputIcon,
  PencilIcon,
  PinIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { motion } from "motion/react";

import { Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { DialogKonfirmasi } from "@/components/ui/dialog";
import { MenuTombol } from "@/components/ui/menu";
import { gunakanFolders } from "@/features/folders";
import { gunakanSalin } from "@/features/prompts/hooks/use-salin";
import { DaftarVersiPrompt } from "@/features/prompts/components/version-list";
import { DialogSalin } from "@/features/prompts/components/copy-dialog";
import {
  ambilPrompt,
  duplikatPrompt,
  gantiDisematPrompt,
  gantiFavoritPrompt,
  pindahFolderPrompt,
} from "@/features/prompts/services/prompt-service";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { hapusKeSampah } from "@/features/trash/services/trash-service";
import { useNavigasi } from "@/app/store/navigasi-store";
import { VARIAN } from "@/lib/animasi";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";
import { tanggalLengkap } from "@/lib/format-waktu";

/** Halaman detail. Isi penuh memakai huruf mono supaya bentuk teks yang akan disalin terjaga. */
export function HalamanDetail({ id }: { id: string }) {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const salinKeadaan = gunakanSalin();
  const { daftar: folders } = gunakanFolders();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  useEffect(() => {
    let batal = false;
    setMemuat(true);
    ambilPrompt(id)
      .then((hasil) => {
        if (batal) return;
        setPrompt(hasil);
        setGalat(null);
      })
      .catch((mentah) => {
        if (!batal) setGalat(pesanGalat(mentah));
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [id]);

  const perbarui = async (aksi: Promise<Prompt>) => {
    try {
      setPrompt(await aksi);
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  const buang = async () => {
    setKonfirmasiHapus(false);
    try {
      await hapusKeSampah(id);
      beriTahuBerhasil(t("prompt.dipindahKeSampah"));
      navigasi.kembali();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  if (memuat) return <p className="text-body-sm text-secondary">{t("prompt.memuatPrompt")}</p>;

  if (galat || !prompt) {
    return (
      <Kartu className="p-lg">
        <p className="mb-md text-body-md">{galat ?? t("prompt.tidakDitemukan")}</p>
        <Tombol varian="sekunder" onClick={() => navigasi.kembali()}>
          <ArrowLeftIcon aria-hidden />
          {t("umum.kembali")}
        </Tombol>
      </Kartu>
    );
  }

  return (
    <motion.div
      initial={VARIAN.masukBaris.initial}
      animate={VARIAN.masukBaris.animate}
      transition={VARIAN.masukBaris.transition}
      className="flex min-h-0 flex-1 flex-col gap-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
          <ArrowLeftIcon aria-hidden />
          {t("umum.kembali")}
        </Tombol>
        <Tombol
          varian={salinKeadaan.idTersalin === prompt.id ? "sekunder" : "utama"}
          onClick={() => void salinKeadaan.salin(prompt)}
        >
          {salinKeadaan.idTersalin === prompt.id ? (
            <CheckIcon aria-hidden />
          ) : (
            <CopyIcon aria-hidden />
          )}
          {salinKeadaan.idTersalin === prompt.id ? t("umum.tersalin") : t("prompt.salinPrompt")}
        </Tombol>
      </div>

      <h1 className="font-display text-headline-lg">
        {prompt.judul || t("umum.promptTanpaJudul")}
      </h1>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-none border-2 border-primary bg-surface p-md shadow-elev-3"
        aria-label={t("prompt.isiPrompt")}
        tabIndex={0}
      >
        <pre className="whitespace-pre-wrap break-words font-code text-code-md">{prompt.isi}</pre>
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        {prompt.tags.map((tag) => (
          <Lencana key={tag.id} warna={tag.warna}>
            {tag.nama}
          </Lencana>
        ))}
        {prompt.folderId && <Lencana warna="netral">{prompt.namaFolder}</Lencana>}
      </div>

      <p className="text-body-sm text-secondary">
        {t("prompt.dibuatDiubah", {
          dibuat: tanggalLengkap(prompt.dibuatPada),
          diubah: tanggalLengkap(prompt.diubahPada),
        })}
        {prompt.dipakaiTerakhir
          ? t("prompt.terakhirDipakai", { waktu: tanggalLengkap(prompt.dipakaiTerakhir) })
          : ""}
      </p>

      <div className="flex flex-wrap items-center gap-xs border-t-2 border-primary pt-sm">
        <Tombol
          varian="sekunder"
          ukuran="kecil"
          aria-pressed={prompt.favorit}
          onClick={() => void perbarui(gantiFavoritPrompt(prompt.id, !prompt.favorit))}
        >
          <StarIcon
            className={prompt.favorit ? "fill-current text-tertiary" : undefined}
            aria-hidden
          />
          {prompt.favorit ? t("prompt.batalFavorit") : t("umum.favorit")}
        </Tombol>
        <Tombol
          varian="sekunder"
          ukuran="kecil"
          aria-pressed={prompt.disemat}
          onClick={() => void perbarui(gantiDisematPrompt(prompt.id, !prompt.disemat))}
        >
          <PinIcon aria-hidden />
          {prompt.disemat ? t("prompt.lepasSematkan") : t("prompt.sematkan")}
        </Tombol>

        <MenuTombol
          labelAria={t("prompt.pindahkanKeFolder")}
          pemicu={<FolderInputIcon aria-hidden />}
          varian="sekunder"
          ukuran="kecil"
          item={[
            {
              label: t("umum.tanpaFolder"),
              onPilih: () => void perbarui(pindahFolderPrompt(prompt.id, null)),
            },
            ...folders
              .filter((folder) => folder.id !== prompt.folderId)
              .map((folder) => ({
                label: folder.nama,
                onPilih: () => void perbarui(pindahFolderPrompt(prompt.id, folder.id)),
              })),
          ]}
        />

        <Tombol
          varian="sekunder"
          ukuran="kecil"
          onClick={() => navigasi.ke({ nama: "form", id: prompt.id })}
        >
          <PencilIcon aria-hidden />
          {t("prompt.edit")}
        </Tombol>

        <Tombol
          varian="sekunder"
          ukuran="kecil"
          onClick={async () => {
            try {
              const salinan = await duplikatPrompt(prompt.id);
              navigasi.ke({ nama: "detail", id: salinan.id });
            } catch (mentah) {
              beriTahuGalat(pesanGalat(mentah));
            }
          }}
        >
          <CopyPlusIcon aria-hidden />
          {t("prompt.duplikat")}
        </Tombol>

        <Tombol varian="bahaya" ukuran="kecil" onClick={() => setKonfirmasiHapus(true)}>
          <Trash2Icon aria-hidden />
          {t("umum.hapus")}
        </Tombol>
      </div>

      <DaftarVersiPrompt promptId={prompt.id} onPulih={setPrompt} />

      <DialogKonfirmasi
        terbuka={konfirmasiHapus}
        judul={t("prompt.pindahSampahJudul")}
        pesan={t("prompt.pindahSampahPesan")}
        labelAksi={t("prompt.yaPindahkan")}
        onAksi={() => void buang()}
        onTutup={() => setKonfirmasiHapus(false)}
      />

      <DialogSalin keadaan={salinKeadaan} />
    </motion.div>
  );
}
