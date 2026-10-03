import { KeyboardIcon } from "lucide-react";

import { Kartu } from "@/components/ui/card";
import { Tombol } from "@/components/ui/button";
import { useNavigasi } from "@/app/store/navigasi-store";
import { deteksiPlatform } from "@/features/widget/services/widget-service";
import { useTerjemah } from "@/lib/i18n";

/** Notasi tombol dibiarkan apa adanya (istilah lintas bahasa); judul dan keterangan dibaca lewat
   kunci i18n saat render supaya pergantian bahasa langsung terlihat. */
const PINTASAN_APLIKASI: { kunci: string; tombol: string[]; kunciKet: string }[] = [
  {
    kunci: "pengaturan.pintasanPromptBaru",
    tombol: ["Ctrl", "N"],
    kunciKet: "pengaturan.pintasanPromptBaruKet",
  },
  {
    kunci: "pengaturan.pintasanFokusPencarian",
    tombol: ["Ctrl", "K"],
    kunciKet: "pengaturan.pintasanFokusPencarianKet",
  },
  {
    kunci: "pengaturan.pintasanSalinFokus",
    tombol: ["Enter"],
    kunciKet: "pengaturan.pintasanSalinFokusKet",
  },
  { kunci: "umum.kembali", tombol: ["Esc"], kunciKet: "pengaturan.pintasanKembaliKet" },
  {
    kunci: "navigasi.modeWidget",
    tombol: ["Alt", "Enter"],
    kunciKet: "pengaturan.pintasanModeWidgetKet",
  },
];

/** E5 daftar pintasan, dibuka dari Pengaturan atau tombol bantuan di bilah atas. */
export function DaftarPintasan() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const desktop = deteksiPlatform() === "desktop";

  return (
    <div className="grid gap-md">
      <div className="flex items-center justify-between gap-sm">
        <h1 className="flex items-center gap-xs font-display text-headline-lg">
          <KeyboardIcon aria-hidden />
          {t("pengaturan.judulPintasan")}
        </h1>
        <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
          {t("umum.kembali")}
        </Tombol>
      </div>

      <Kartu as="section">
        <ul className="grid gap-sm">
          {PINTASAN_APLIKASI.map((pintasan) => (
            <li
              key={pintasan.kunci}
              className="flex flex-wrap items-center justify-between gap-sm border-b-2 border-primary pb-sm last:border-b-0 last:pb-0"
            >
              <span className="text-body-md">
                {t(pintasan.kunci)}
                <span className="ml-xs text-body-sm text-secondary">{t(pintasan.kunciKet)}</span>
              </span>
              <span className="flex items-center gap-xxs">
                {pintasan.tombol.map((tombol, indeks) => (
                  <kbd
                    key={tombol}
                    className="rounded-sm border-2 border-primary bg-surface-sunken px-xs py-xxs font-code text-code-sm"
                  >
                    {indeks > 0 && !desktop ? "" : tombol}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Kartu>

      <p className="text-body-sm text-secondary">{t("pengaturan.catatanPintasan")}</p>
    </div>
  );
}
