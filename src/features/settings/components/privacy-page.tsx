import { ShieldCheckIcon } from "lucide-react";

import { Kartu, JudulKartu } from "@/components/ui/card";
import { KepalaLayar } from "@/components/ui/page-header";
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
      <KepalaLayar
        judul={t("pengaturan.privasiJudul")}
        ikon={<ShieldCheckIcon aria-hidden />}
        padaKembali={() => navigasi.kembali()}
      />

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
