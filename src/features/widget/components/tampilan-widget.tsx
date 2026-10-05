import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CheckIcon, CopyIcon, PlusIcon, SearchIcon } from "lucide-react";

import { gunakanJeda } from "@/features/widget/hooks/use-jeda";
import { ChipPilih } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigasi } from "@/app/store/navigasi-store";
import { gunakanUrutanDaftar } from "@/app/hooks/use-urutan-daftar";
import { deteksiModeJendela } from "@/app/store/pengaturan-store";
import { cariPrompt } from "@/features/search/services/search-service";
import { FormTambahCepat } from "@/features/widget/components/form-tambah-cepat";
import { DialogSalin, gunakanSalin } from "@/features/prompts";
import { daftarPrompt } from "@/features/prompts/services/prompt-service";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

import { simpanGeometriSekarang } from "../services/widget-service";
import { gunakanModeJendela } from "../hooks/use-mode-jendela";

/** Daftar ringkas: sebagian layar saja, tanpa paginasi di dalam widget. */
const JUMLAH_BARIS = 24;

/** Jeda ketik sebelum hasil dicari. Harus lebih cepat dari animasi (DESIGN.md bagian Motion). */
const JEDA_KUERI = 200;

/** Geometri disimpan setelah pengguna berhenti menarik tepi jendela, bukan per piksel. */
const JEDA_GEOMETRI = 400;

export type PropertiTampilanWidget = {
  /** Mode saat ini menurut shell. Isi widget tidak berubah bentuk, hanya perilaku fokus. */
  modeWidget: boolean;
  /** Dipanggil shell ketika hasil ukur jendela menyatakan mode berganti. */
  onGantiMode?: (modeWidget: boolean) => void;
};

/** Kolom cari mini. `role="searchbox"` dipakai pintasan Ctrl+K di semua shell. */
function KolomCariMini({
  nilai,
  onUbah,
  inputRef,
}: {
  nilai: string;
  onUbah: (nilai: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTerjemah();
  return (
    <div role="search" className="relative flex items-center">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-4 text-secondary"
      />
      <Input
        ref={inputRef}
        role="searchbox"
        type="search"
        value={nilai}
        onChange={(event) => onUbah(event.target.value)}
        placeholder={t("umum.cariPrompt")}
        aria-label={t("umum.cariPrompt")}
        className="h-9 rounded-sm pl-8 text-body-sm"
      />
    </div>
  );
}

type PropertiBaris = {
  prompt: Prompt;
  tersalin: boolean;
  onSalin: () => void;
};

/** Baris padat: tinggi 44px tanpa bayangan (bayangan milik bingkai jendela) dan garis pemisah 1px. */
function BarisWidget({ prompt, tersalin, onSalin }: PropertiBaris) {
  const { t } = useTerjemah();
  const judul = prompt.judul || t("umum.promptTanpaJudul");
  return (
    <li className="baris-widget flex min-h-11 min-w-0 items-center gap-xxs border-b py-xxs">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">{judul}</span>
        <span className="block truncate text-label-sm text-secondary">
          {prompt.potongan ?? prompt.isi}
        </span>
      </span>

      <Tombol
        varian="hantu"
        ukuran="ikonPadat"
        className="shrink-0"
        aria-label={
          tersalin ? t("widget.promptTersalin", { judul }) : t("widget.salinPrompt", { judul })
        }
        onClick={onSalin}
      >
        {tersalin ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      </Tombol>
    </li>
  );
}

/**
 * Isi Mode Widget: cari, tab Favorit / Terbaru / Semua, dan daftar prompt ringkas (PRD G1).
 * Filter ditulis ke store navigasi sehingga jendela penuh dan widget membaca keadaan yang sama.
 */
export function TampilanWidget({ modeWidget, onGantiMode }: PropertiTampilanWidget) {
  const { t } = useTerjemah();
  const { lebar, tinggi, siap, perluas } = gunakanModeJendela();

  const hanyaFavorit = useNavigasi((s) => s.hanyaFavorit);
  const [urutan] = gunakanUrutanDaftar();
  const kueri = useNavigasi((s) => s.kueri);
  const aturFilter = useNavigasi((s) => s.aturFilter);

  const kueriTertunda = gunakanJeda(kueri.trim(), JEDA_KUERI);

  const [daftar, setDaftar] = useState<Prompt[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [tambahTerbuka, setTambahTerbuka] = useState(false);
  const salinKeadaan = gunakanSalin();

  const percobaan = useRef(0);
  const kolomRef = useRef<HTMLInputElement | null>(null);
  const lebarAcuan = useRef<number | null>(null);

  const muat = useCallback(async () => {
    const tanda = ++percobaan.current;
    setMemuat(true);
    try {
      const filter = { hanyaFavorit, urutan, batas: JUMLAH_BARIS };
      const hasil = kueriTertunda
        ? await cariPrompt({ ...filter, kueri: kueriTertunda })
        : await daftarPrompt(filter);
      if (tanda !== percobaan.current) return;
      setDaftar(hasil);
      setGalat(null);
    } catch (mentah) {
      if (tanda !== percobaan.current) return;
      setGalat(pesanGalat(mentah));
    } finally {
      if (tanda === percobaan.current) setMemuat(false);
    }
  }, [hanyaFavorit, urutan, kueriTertunda]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Prompt yang dibuat atau diubah di jendela penuh harus langsung tampak di widget (PRD G1).
  useEffect(() => {
    const padaFokus = () => void muat();
    window.addEventListener("focus", padaFokus);
    return () => window.removeEventListener("focus", padaFokus);
  }, [muat]);

  // Saat widget muncul, kolom cari langsung terfokus (PRD G3).
  useEffect(() => {
    if (modeWidget) kolomRef.current?.focus();
  }, [modeWidget]);

  const modeTerdeteksi = deteksiModeJendela(lebar, tinggi) === "widget";

  // Shell diajak ganti mode hanya setelah ukuran nyata terbaca, supaya layout tidak berkedip.
  useEffect(() => {
    if (siap && modeTerdeteksi !== modeWidget) onGantiMode?.(modeTerdeteksi);
  }, [siap, modeTerdeteksi, modeWidget, onGantiMode]);

  // Lebar benar-benar berubah: simpan geometri setelah pengguna berhenti menarik tepi jendela.
  useEffect(() => {
    if (lebarAcuan.current === null) {
      lebarAcuan.current = lebar;
      return;
    }
    if (lebarAcuan.current === lebar) return;
    lebarAcuan.current = lebar;

    const waktu = setTimeout(() => {
      void simpanGeometriSekarang(modeWidget).catch((mentah) => beriTahuGalat(pesanGalat(mentah)));
    }, JEDA_GEOMETRI);
    return () => clearTimeout(waktu);
  }, [lebar, modeWidget]);

  return (
    <div className="bayangan-widget flex min-h-0 flex-1 flex-col gap-xs bg-surface p-xxs">
      <KolomCariMini
        nilai={kueri}
        onUbah={(baru) => aturFilter({ kueri: baru })}
        inputRef={kolomRef}
      />

      <div className="flex shrink-0 items-center gap-xxs">
        <ChipPilih aktif={hanyaFavorit} onUbah={() => aturFilter({ hanyaFavorit: !hanyaFavorit })}>
          {t("umum.favorit")}
        </ChipPilih>
        {(hanyaFavorit || kueri.trim()) && (
          <Tombol
            varian="hantu"
            ukuran="kecil"
            onClick={() => aturFilter({ hanyaFavorit: false, kueri: "" })}
          >
            {t("umum.bersihkan")}
          </Tombol>
        )}
        <Tombol
          varian="sekunder"
          ukuran="ikonPadat"
          className="ml-auto"
          aria-label={t("widget.promptBaru")}
          onClick={() => setTambahTerbuka(true)}
        >
          <PlusIcon aria-hidden />
        </Tombol>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {galat ? (
          <div role="alert" className="grid gap-xs p-sm text-body-sm">
            <p>{galat}</p>
            <Tombol varian="sekunder" ukuran="kecil" onClick={() => void perluas()}>
              {t("widget.perluas")}
            </Tombol>
          </div>
        ) : memuat ? (
          <p className="p-sm text-body-sm text-secondary">{t("umum.muat")}</p>
        ) : daftar.length === 0 ? (
          <p className="p-sm text-body-sm text-secondary">
            {kueriTertunda || hanyaFavorit ? t("umum.tidakAdaHasil") : t("umum.belumAdaPrompt")}
          </p>
        ) : (
          <ul className="grid">
            {daftar.map((prompt) => (
              <BarisWidget
                key={prompt.id}
                prompt={prompt}
                tersalin={salinKeadaan.idTersalin === prompt.id}
                onSalin={() => void salinKeadaan.salin(prompt)}
              />
            ))}
          </ul>
        )}
      </div>

      <DialogSalin keadaan={salinKeadaan} versi="panel" />

      <FormTambahCepat
        terbuka={tambahTerbuka}
        onTutup={() => setTambahTerbuka(false)}
        onTersimpan={() => void muat()}
      />
    </div>
  );
}
