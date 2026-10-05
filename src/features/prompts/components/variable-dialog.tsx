import { useEffect, useMemo, useRef, useState } from "react";
import { BracesIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import {
  Dialog,
  DialogDeskripsi,
  DialogKaki,
  DialogKepala,
  DialogKonten,
  DialogJudul,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import {
  ambilNilaiVariabelTerakhir,
  simpanNilaiVariabelTerakhir,
  susunVariabel,
  variabelDariTeks,
} from "@/features/prompts/services/variabel-service";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

export type PropertiDialogVariabel = {
  prompt: Prompt | null;
  /** Nilai isian disimpan sebagai saran untuk pemakaian berikutnya (PRD Workflow Kritikal 1 no. 9). */
  ingatNilai: boolean;
  versi?: "baku" | "panel";
  onSalin: (teks: string, id: string) => Promise<boolean>;
  onTutup: () => void;
};

function gabungkanNilai(sebelumnya: Record<string, string>, isian: Record<string, string>) {
  const hasil = { ...sebelumnya };
  for (const [nama, nilai] of Object.entries(isian)) {
    if (nilai.trim()) hasil[nama] = nilai;
  }
  return hasil;
}

/** C2 dialog isian variabel: satu kolom per variabel urut kemunculan pertama, pratinjau langsung,
   dan konfirmasi ketika ada kolom kosong (PRD Workflow Kritikal 1). */
export function DialogVariabel({
  prompt,
  ingatNilai,
  versi = "baku",
  onSalin,
  onTutup,
}: PropertiDialogVariabel) {
  const { t } = useTerjemah();
  const namaVariabel = useMemo(() => (prompt ? variabelDariTeks(prompt.isi) : []), [prompt]);
  const [ketikan, setKetikan] = useState<Record<string, string>>({});
  const [saran, setSaran] = useState<Record<string, string>>({});
  const [pratinjau, setPratinjau] = useState("");
  const [konfirmasiKosong, setKonfirmasiKosong] = useState(false);
  const [proses, setProses] = useState(false);
  const antreanPratinjau = useRef(0);

  useEffect(() => {
    if (!prompt) return;
    setKonfirmasiKosong(false);
    setProses(false);
    setKetikan({});
    setSaran({});
    let dibatalkan = false;
    ambilNilaiVariabelTerakhir()
      .then((terakhir) => {
        if (!dibatalkan) setSaran(terakhir);
      })
      .catch(() => undefined);
    return () => {
      dibatalkan = true;
    };
  }, [prompt]);

  // Ketikan pengguna selalu menang atas saran, walaupun saran tiba setelah pengguna mengetik.
  const efektif = useMemo(() => {
    const hasil: Record<string, string> = {};
    for (const nama of namaVariabel) hasil[nama] = ketikan[nama] ?? saran[nama] ?? "";
    return hasil;
  }, [namaVariabel, ketikan, saran]);

  useEffect(() => {
    if (!prompt) return;
    const nomor = ++antreanPratinjau.current;
    // Penggantian dikerjakan backend agar pratinjau dan hasil salin memakai aturan yang sama.
    // Bila panggilan gagal, pratinjau terakhir dipertahankan; jalur salin akan memunculkan galatnya.
    void susunVariabel(prompt.isi, efektif)
      .then((hasil) => {
        if (nomor === antreanPratinjau.current) setPratinjau(hasil);
      })
      .catch(() => undefined);
  }, [prompt, efektif]);

  const kosong = namaVariabel.filter((nama) => !efektif[nama]?.trim());

  const jalankanSalin = async () => {
    if (!prompt) return;
    setProses(true);
    try {
      const tersusun = await susunVariabel(prompt.isi, efektif);
      const tersalin = await onSalin(tersusun, prompt.id);
      if (tersalin && ingatNilai) {
        // Gagal menyimpan saran tidak boleh membatalkan salinan yang sudah berhasil.
        void simpanNilaiVariabelTerakhir(gabungkanNilai(saran, efektif)).catch(() => undefined);
      }
      onTutup();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
      setProses(false);
    }
  };

  const tekanSalin = () => {
    if (kosong.length > 0 && !konfirmasiKosong) {
      setKonfirmasiKosong(true);
      return;
    }
    void jalankanSalin();
  };

  return (
    <Dialog open={Boolean(prompt)} onOpenChange={(buka) => !buka && onTutup()}>
      {prompt && (
        <DialogKonten versi={versi}>
          <DialogKepala>
            <DialogJudul>{t("prompt.isiVariabel")}</DialogJudul>
            <DialogDeskripsi>{t("prompt.isiVariabelPesan")}</DialogDeskripsi>
          </DialogKepala>

          <div className="grid max-h-[50vh] gap-sm overflow-y-auto">
            {namaVariabel.map((nama) => (
              <div key={nama} className="grid gap-xs">
                <Label htmlFor={`variabel-${nama}`}>{nama}</Label>
                <Input
                  id={`variabel-${nama}`}
                  value={efektif[nama] ?? ""}
                  placeholder={t("prompt.isiVariabelNama", { nama })}
                  onChange={(event) => {
                    const nilai = event.target.value;
                    setKetikan((sebelumnya) => ({ ...sebelumnya, [nama]: nilai }));
                    setKonfirmasiKosong(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      tekanSalin();
                    }
                  }}
                />
              </div>
            ))}

            <div className="grid gap-xs">
              <span className="flex items-center gap-xs font-display text-label-md text-secondary">
                <BracesIcon className="size-4 shrink-0" aria-hidden />
                {t("prompt.pratinjauHasil")}
              </span>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-sm border-2 border-primary bg-surface-sunken p-sm font-code text-code-sm">
                {pratinjau}
              </pre>
            </div>
          </div>

          {konfirmasiKosong && kosong.length > 0 && (
            <Petunjuk galat className="mt-md">
              {t("prompt.variabelKosong")}
            </Petunjuk>
          )}

          <DialogKaki>
            {konfirmasiKosong && kosong.length > 0 ? (
              <>
                <Tombol varian="sekunder" onClick={() => setKonfirmasiKosong(false)}>
                  {t("prompt.kembaliMengisi")}
                </Tombol>
                <Tombol varian="bahaya" onClick={() => void jalankanSalin()} disabled={proses}>
                  {proses ? t("prompt.menyalin") : t("prompt.lanjutkanMenyalin")}
                </Tombol>
              </>
            ) : (
              <>
                <Tombol varian="sekunder" onClick={onTutup} disabled={proses}>
                  {t("umum.batal")}
                </Tombol>
                <Tombol onClick={tekanSalin} disabled={proses}>
                  {proses ? t("prompt.menyalin") : t("umum.salin")}
                </Tombol>
              </>
            )}
          </DialogKaki>
        </DialogKonten>
      )}
    </Dialog>
  );
}
