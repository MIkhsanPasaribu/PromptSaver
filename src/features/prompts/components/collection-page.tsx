import { useMemo } from "react";
import { LoaderCircleIcon, PlusIcon, AlertTriangleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Tombol } from "@/components/ui/button";
import { KeadaanKosong } from "@/features/onboarding";
import { DialogSalin } from "@/features/prompts/components/copy-dialog";
import { KartuPrompt } from "@/features/prompts/components/prompt-card";
import { gunakanDaftarPrompt, JUMLAH_PER_HALAMAN } from "@/features/prompts/hooks/use-prompts";
import { gunakanSalin } from "@/features/prompts/hooks/use-salin";
import { KolomCari, gunakanPencarian } from "@/features/search";
import { ChipPilih } from "@/components/ui/badge";
import { useNavigasi } from "@/app/store/navigasi-store";
import { gunakanUrutanDaftar } from "@/app/hooks/use-urutan-daftar";
import { usePengaturan } from "@/app/store/pengaturan-store";
import type { UrutanPrompt } from "@/features/prompts/types/prompt.types";
import { useTerjemah } from "@/lib/i18n";
import { DURASI, EASING } from "@/lib/animasi";

/** Kunci sumber daya i18n per mode urutan (kelompok `koleksi`). Labelnya baru dibaca saat render
   supaya pergantian bahasa langsung terlihat, sama seperti daftar navigasi di shell aplikasi. */
const KUNCI_URUTAN: Record<UrutanPrompt, string> = {
  terbaru: "koleksi.urutanTerbaru",
  dipakai: "koleksi.urutanDipakai",
  abjad: "koleksi.urutanAbjad",
};

/** Layar utama: pencarian, penyaring cepat, urutan, dan daftar prompt dengan salin satu ketuk. */
export function HalamanKoleksi() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const pengaturan = usePengaturan((s) => s.pengaturan);
  const [urutanAktif, setelUrutan] = gunakanUrutanDaftar();
  const salinKeadaan = gunakanSalin();

  const filter = useMemo(
    () => ({
      folderId: navigasi.folderId,
      tanpaFolder: navigasi.tanpaFolder,
      hanyaFavorit: navigasi.hanyaFavorit,
      tagIds: navigasi.tagIds,
      urutan: urutanAktif,
    }),
    [navigasi.folderId, navigasi.tanpaFolder, navigasi.hanyaFavorit, navigasi.tagIds, urutanAktif],
  );

  const adaKueri = navigasi.kueri.trim().length > 0;
  const koleks = gunakanDaftarPrompt(filter);
  const hasilCari = gunakanPencarian({ ...filter, kueri: navigasi.kueri });

  const daftar = adaKueri ? hasilCari.daftar : koleks.daftar;
  const memuat = adaKueri ? hasilCari.memuat : koleks.memuat;
  const galat = adaKueri ? hasilCari.galat : koleks.galat;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex flex-wrap items-center gap-sm">
        <div className="min-w-[220px] flex-1">
          <KolomCari />
        </div>
        <Tombol onClick={() => navigasi.ke({ nama: "form" })}>
          <PlusIcon aria-hidden />
          {t("umum.promptBaru")}
        </Tombol>
      </header>

      <div className="flex flex-wrap items-center gap-xs">
        {(Object.keys(KUNCI_URUTAN) as UrutanPrompt[]).map((urutan) => (
          <ChipPilih key={urutan} aktif={urutanAktif === urutan} onUbah={() => setelUrutan(urutan)}>
            {t(KUNCI_URUTAN[urutan])}
          </ChipPilih>
        ))}
        <ChipPilih
          aktif={navigasi.hanyaFavorit}
          onUbah={() => navigasi.aturFilter({ hanyaFavorit: !navigasi.hanyaFavorit })}
        >
          {t("umum.favorit")}
        </ChipPilih>
        {(navigasi.folderId || navigasi.tanpaFolder || navigasi.tagIds.length > 0) && (
          <Tombol varian="hantu" ukuran="kecil" onClick={navigasi.resetFilter}>
            {t("koleksi.bersihkanPenyaring")}
          </Tombol>
        )}
      </div>

      {galat && (
        <p className="flex items-center gap-xs border-2 border-error bg-error-tint p-sm text-body-sm text-on-surface">
          <AlertTriangleIcon className="size-5 shrink-0" aria-hidden />
          {galat}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-md">
        {memuat && daftar.length === 0 ? (
          <p className="flex items-center gap-xs text-body-sm text-secondary">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
            {t("koleksi.memuatKoleksi")}
          </p>
        ) : daftar.length === 0 ? (
          <KeadaanKosong
            judul={adaKueri ? t("koleksi.tidakAdaCocok") : t("koleksi.belumAdaPrompt")}
            pesan={
              adaKueri
                ? t("koleksi.tidakAdaCocokPesan", { kueri: navigasi.kueri })
                : t("koleksi.belumAdaPromptPesan")
            }
            aksiLabel={adaKueri ? t("koleksi.bersihkanPenyaring") : t("umum.promptBaru")}
            onAksi={() => (adaKueri ? navigasi.resetFilter() : navigasi.ke({ nama: "form" }))}
          />
        ) : (
          <div className="grid grid-cols-1 gap-md">
            <AnimatePresence initial={false}>
              {daftar.map((prompt, indeks) => (
                <motion.div
                  key={prompt.id}
                  layout
                  transition={{ duration: DURASI.komponen, ease: EASING.standar }}
                >
                  <KartuPrompt
                    prompt={prompt}
                    tersalin={salinKeadaan.idTersalin === prompt.id}
                    jeda={pengaturan?.kurangiAnimasi ? 0 : indeks < 8 ? indeks * 0.024 : 0}
                    kueri={adaKueri ? navigasi.kueri : undefined}
                    onBuka={() => navigasi.ke({ nama: "detail", id: prompt.id })}
                    onSalin={() => void salinKeadaan.salin(prompt)}
                    onFavorit={(aktif) => void koleks.tandaiFavorit(prompt.id, aktif)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {!adaKueri && koleks.sisaHalaman && (
              <Tombol
                varian="sekunder"
                className="w-full"
                disabled={koleks.memuatLagi}
                onClick={() => void koleks.muatBerikutnya()}
              >
                {t("koleksi.muatBerikutnya", { jumlah: JUMLAH_PER_HALAMAN })}
              </Tombol>
            )}
          </div>
        )}
      </div>

      <DialogSalin keadaan={salinKeadaan} />
    </div>
  );
}
