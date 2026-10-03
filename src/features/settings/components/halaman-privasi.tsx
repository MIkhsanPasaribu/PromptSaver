import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";

import { Kartu, JudulKartu } from "@/components/ui/card";
import { Tombol } from "@/components/ui/button";
import { useNavigasi } from "@/app/store/navigasi-store";
import { useTerjemah } from "@/lib/i18n";

/** Halaman Privasi singkat (PRD Bagian 5, butir Kepatuhan). Isinya menjelaskan apa yang
   memang terjadi pada data pengguna, termasuk batasan yang belum ditutup versi ini. Teksnya
   disimpan sebagai kunci i18n supaya dua bahasa tersedia tanpa mengubah susunan halaman. */
const POKOK: { kunciJudul: string; kunciIsi: string }[] = [
  {
    kunciJudul: "pengaturan.privasiTanpaJaringan",
    kunciIsi: "pengaturan.privasiTanpaJaringanIsi",
  },
  {
    kunciJudul: "pengaturan.privasiDataLokal",
    kunciIsi: "pengaturan.privasiDataLokalIsi",
  },
  {
    kunciJudul: "pengaturan.privasiTeksPolos",
    kunciIsi: "pengaturan.privasiTeksPolosIsi",
  },
  {
    kunciJudul: "pengaturan.privasiHapusData",
    kunciIsi: "pengaturan.privasiHapusDataIsi",
  },
  {
    kunciJudul: "pengaturan.privasiKunci",
    kunciIsi: "pengaturan.privasiKunciIsi",
  },
];

const BELUM_TERSEDIA = ["pengaturan.privasiBelumEnkripsi"];

export function HalamanPrivasi() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();

  return (
    <div className="grid gap-lg">
      <div className="flex items-center justify-between gap-sm">
        <h1 className="flex items-center gap-xs font-display text-headline-lg">
          <ShieldCheckIcon aria-hidden />
          {t("pengaturan.privasiJudul")}
        </h1>
        <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
          <ArrowLeftIcon aria-hidden />
          {t("umum.kembali")}
        </Tombol>
      </div>

      <p className="text-body-md text-secondary">{t("pengaturan.privasiPengantar")}</p>

      {POKOK.map((bagian) => (
        <Kartu key={bagian.kunciJudul} as="section" className="grid gap-xs">
          <JudulKartu>{t(bagian.kunciJudul)}</JudulKartu>
          <p className="text-body-md">{t(bagian.kunciIsi)}</p>
        </Kartu>
      ))}

      <Kartu as="section" className="grid gap-xs">
        <JudulKartu>{t("pengaturan.privasiBelumTersedia")}</JudulKartu>
        <ul className="grid list-disc gap-xs pl-5 text-body-md text-secondary">
          {BELUM_TERSEDIA.map((kunci) => (
            <li key={kunci}>{t(kunci)}</li>
          ))}
        </ul>
      </Kartu>
    </div>
  );
}
