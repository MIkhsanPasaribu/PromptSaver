import { useEffect, useState } from "react";
import { RotateCcwIcon, Trash2Icon, EraserIcon, ArrowLeftIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { DialogKonfirmasi } from "@/components/ui/dialog";
import { DialogSalin } from "@/features/prompts/components/dialog-salin";
import { gunakanSalin } from "@/features/prompts/hooks/use-salin";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import {
  daftarSampah,
  hapusPermanenPrompt,
  kosongkanSampah,
  pulihkanPrompt,
} from "@/features/trash/services/trash-service";
import { useNavigasi } from "@/app/store/navigasi-store";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";
import { tanggalRelatif } from "@/lib/format-waktu";

/** A3 Sampah. Daftar hanya berisi prompt dengan sampah_pada, dan tidak masuk pencarian biasa. */
export function HalamanSampah() {
  const { t } = useTerjemah();
  const navigasi = useNavigasi();
  const salinKeadaan = gunakanSalin();
  const [daftar, setDaftar] = useState<Prompt[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<{
    jenis: "permanen" | "kosongkan";
    id?: string;
  } | null>(null);

  const muat = async () => {
    setMemuat(true);
    try {
      setDaftar(await daftarSampah());
      setGalat(null);
    } catch (mentah) {
      setGalat(pesanGalat(mentah));
    } finally {
      setMemuat(false);
    }
  };

  useEffect(() => {
    void muat();
  }, []);

  const pulihkan = async (id: string) => {
    try {
      await pulihkanPrompt(id);
      beriTahuBerhasil(t("pengorganisir.toastDipulihkan"));
      await muat();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  const jalankanKonfirmasi = async () => {
    if (!konfirmasi) return;
    try {
      if (konfirmasi.jenis === "permanen" && konfirmasi.id) {
        await hapusPermanenPrompt(konfirmasi.id);
        beriTahuBerhasil(t("pengorganisir.toastHapusPermanen"));
      } else {
        const jumlah = await kosongkanSampah();
        beriTahuBerhasil(t("pengorganisir.toastKosongkan", { jumlah }));
      }
      setKonfirmasi(null);
      await muat();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
      setKonfirmasi(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h1 className="font-display text-headline-lg">{t("navigasi.sampah")}</h1>
        <div className="flex items-center gap-xs">
          <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
            <ArrowLeftIcon aria-hidden />
            {t("umum.kembali")}
          </Tombol>
          {daftar.length > 0 && (
            <Tombol
              varian="bahaya"
              ukuran="kecil"
              onClick={() => setKonfirmasi({ jenis: "kosongkan" })}
            >
              <EraserIcon aria-hidden />
              {t("pengorganisir.kosongkanSampah")}
            </Tombol>
          )}
        </div>
      </div>

      <p className="text-body-sm text-secondary">{t("pengorganisir.bahayaSampah")}</p>

      {galat && (
        <p className="border-2 border-error bg-error-tint p-sm text-body-sm" role="alert">
          {galat}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {memuat ? (
          <p className="text-body-sm text-secondary">{t("pengorganisir.memuatSampah")}</p>
        ) : daftar.length === 0 ? (
          <Kartu className="p-xl text-center">
            <p className="font-display text-headline-sm">{t("pengorganisir.sampahKosong")}</p>
            <p className="mt-xs text-body-md text-secondary">
              {t("pengorganisir.sampahKosongDetail")}
            </p>
          </Kartu>
        ) : (
          <ul className="grid gap-md">
            {daftar.map((prompt) => (
              <li key={prompt.id}>
                <Kartu className="grid gap-xs">
                  <h2 className="font-display text-headline-sm">
                    {prompt.judul || t("umum.promptTanpaJudul")}
                  </h2>
                  <p className="line-clamp-2 text-body-md">{prompt.potongan ?? prompt.isi}</p>
                  <p className="text-body-sm text-secondary">
                    {t("pengorganisir.dibuangPada", {
                      waktu: tanggalRelatif(prompt.sampahPada ?? prompt.diubahPada),
                    })}
                  </p>
                  <div className="flex flex-wrap gap-xs">
                    <Tombol
                      varian="sekunder"
                      ukuran="kecil"
                      onClick={() => void pulihkan(prompt.id)}
                    >
                      <RotateCcwIcon aria-hidden />
                      {t("umum.pulihkan")}
                    </Tombol>
                    <Tombol
                      varian="sekunder"
                      ukuran="kecil"
                      onClick={() => void salinKeadaan.salin(prompt)}
                    >
                      {t("umum.salin")}
                    </Tombol>
                    <Tombol
                      varian="bahaya"
                      ukuran="kecil"
                      onClick={() => setKonfirmasi({ jenis: "permanen", id: prompt.id })}
                    >
                      <Trash2Icon aria-hidden />
                      {t("pengorganisir.hapusPermanen")}
                    </Tombol>
                  </div>
                </Kartu>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogKonfirmasi
        terbuka={Boolean(konfirmasi)}
        judul={
          konfirmasi?.jenis === "kosongkan"
            ? t("pengorganisir.konfirmasiKosongkan")
            : t("pengorganisir.konfirmasiHapusPermanen")
        }
        pesan={t("pengorganisir.pesanKonfirmasiHapus")}
        labelAksi={t("pengorganisir.labelAksiHapus")}
        onAksi={() => void jalankanKonfirmasi()}
        onTutup={() => setKonfirmasi(null)}
      />

      <DialogSalin keadaan={salinKeadaan} />
    </div>
  );
}
