import { useCallback, useState } from "react";
import { HistoryIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { DialogKonfirmasi } from "@/components/ui/dialog";
import { Petunjuk } from "@/components/ui/label";
import {
  daftarRiwayatPrompt,
  pulihkanVersiPrompt,
} from "@/features/prompts/services/prompt-service";
import type { Prompt, VersiPrompt } from "@/features/prompts/types/prompt.types";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";
import { tanggalLengkap } from "@/lib/format-waktu";
import { potongTeks } from "@/lib/teks";

/** Isi riwayat dipotong supaya daftar tetap pendek; isi penuh muncul saat dipulihkan. */
const PANJANG_TAMPIL = 90;

/** C3 riwayat versi prompt. Dimuat saat dibuka, bukan setiap kali halaman dirender. */
export function DaftarVersiPrompt({
  promptId,
  onPulih,
}: {
  promptId: string;
  onPulih: (hasil: Prompt) => void;
}) {
  const { t } = useTerjemah();
  const [terbuka, setTerbuka] = useState(false);
  const [daftar, setDaftar] = useState<VersiPrompt[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [menungguPulih, setMenungguPulih] = useState<VersiPrompt | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      setDaftar(await daftarRiwayatPrompt(promptId));
    } catch (mentah) {
      setGalat(pesanGalat(mentah));
    } finally {
      setMemuat(false);
    }
  }, [promptId]);

  const ganti = () => {
    const baru = !terbuka;
    setTerbuka(baru);
    // Dimuat ulang setiap kali dibuka: riwayat bisa bertambah dari jendela lain (misalnya
    // suntingan di form), dan daftar basi lebih membingungkan daripada satu panggilan IPC.
    if (baru && !memuat) void muat();
  };

  const pulihkan = async (versi: VersiPrompt) => {
    setMenungguPulih(null);
    try {
      const hasil = await pulihkanVersiPrompt(promptId, versi.id);
      onPulih(hasil);
      beriTahuBerhasil(t("prompt.versiDipulihkan"));
      await muat();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  return (
    <Kartu as="section" className="grid gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="flex items-center gap-xs font-display text-headline-sm">
          <HistoryIcon aria-hidden />
          {t("prompt.riwayatVersi")}
        </h2>
        <Tombol varian="hantu" ukuran="kecil" aria-expanded={terbuka} onClick={ganti}>
          {terbuka ? t("umum.tutup") : t("umum.lihat")}
        </Tombol>
      </div>

      {!terbuka ? <Petunjuk>{t("prompt.riwayatPenjelasan")}</Petunjuk> : null}

      {terbuka && memuat ? <Petunjuk>{t("umum.memuatRiwayat")}</Petunjuk> : null}

      {terbuka && galat ? <Petunjuk galat>{galat}</Petunjuk> : null}

      {terbuka && !memuat && daftar.length === 0 ? (
        <Petunjuk>{t("prompt.belumAdaVersi")}</Petunjuk>
      ) : null}

      {terbuka && !memuat && daftar.length > 0 ? (
        <ul className="grid gap-sm">
          {daftar.map((versi) => (
            <li
              key={versi.id}
              className="flex flex-wrap items-center justify-between gap-sm border-t-2 border-primary pt-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-secondary">
                  {tanggalLengkap(versi.disimpanPada)}
                </span>
                <span className="block truncate font-code text-code-sm">
                  {potongTeks(versi.isi, PANJANG_TAMPIL)}
                </span>
              </span>
              <Tombol varian="sekunder" ukuran="kecil" onClick={() => setMenungguPulih(versi)}>
                {t("umum.pulihkan")}
              </Tombol>
            </li>
          ))}
        </ul>
      ) : null}

      <DialogKonfirmasi
        terbuka={Boolean(menungguPulih)}
        judul={t("prompt.pulihkanJudul")}
        pesan={t("prompt.pulihkanPesan")}
        labelAksi={t("prompt.yaPulihkan")}
        onAksi={() => menungguPulih && void pulihkan(menungguPulih)}
        onTutup={() => setMenungguPulih(null)}
      />
    </Kartu>
  );
}
