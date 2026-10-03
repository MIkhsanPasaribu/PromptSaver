import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { deteksiModeJendela } from "@/app/store/pengaturan-store";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";

import { keluarModeWidget, masukModeWidget } from "../services/widget-service";

/** Ukuran jendela bawaan `tauri.conf.json`. Dipakai sampai pengukuran pertama selesai,
   supaya shell tidak sempat merender mode yang salah saat aplikasi baru dibuka. */
const UKURAN_AWAL = { lebar: 1120, tinggi: 760 };

export type UkuranJendela = {
  /** Piksel logis, sebanding dengan ambang `deteksiModeJendela`. */
  lebar: number;
  tinggi: number;
};

export type HasilModeJendela = UkuranJendela & {
  /** Mode widget disimpulkan dari ukuran jendela, bukan dari tombol yang ditekan. */
  modeWidget: boolean;
  /** `true` setelah ukuran pertama kali terbaca. Shell memakai ini untuk menahan
     laporan pergantian mode sebelum pengukuran nyata terjadi. */
  siap: boolean;
  masukWidget: () => Promise<void>;
  perluas: () => Promise<void>;
};

/** Baca ukuran jendela luar (sama dengan yang disimpan backend lewat geometri).
   Di luar Tauri, misalnya jsdom saat test, jatuh ke ukuran WebView. */
async function bacaUkuranJendela(): Promise<UkuranJendela> {
  try {
    const jendela = getCurrentWindow();
    const [ukuran, skala] = await Promise.all([jendela.outerSize(), jendela.scaleFactor()]);
    return {
      lebar: Math.round(ukuran.width / skala),
      tinggi: Math.round(ukuran.height / skala),
    };
  } catch {
    if (typeof window === "undefined") return UKURAN_AWAL;
    return { lebar: window.innerWidth, tinggi: window.innerHeight };
  }
}

/**
 * Sumber tunggal mode jendela untuk frontend (PRD G1).
 *
 * Widget adalah mode dari jendela `utama` yang sama, jadi mode tidak pernah disimpan
 * sebagai state kedua: ia selalu hasil ukur lebar x tinggi. Saat ukuran berubah,
 * backend yang menyimpan geometri dan shell yang mengganti tata letak membaca angka
 * yang sama dari hook ini.
 */
export function gunakanModeJendela(): HasilModeJendela {
  const [ukuran, setUkuran] = useState<UkuranJendela>(UKURAN_AWAL);
  const [siap, setSiap] = useState(false);
  const masihHidup = useRef(false);
  const batalDengar = useRef<null | (() => void)>(null);

  const perbaruiUkuran = useCallback(async () => {
    const terbaca = await bacaUkuranJendela();
    if (!masihHidup.current) return;
    setUkuran(terbaca);
    setSiap(true);
  }, []);

  useEffect(() => {
    masihHidup.current = true;
    void perbaruiUkuran();

    Promise.resolve()
      .then(() => getCurrentWindow().onResized(() => void perbaruiUkuran()))
      .then((batal) => {
        if (masihHidup.current) batalDengar.current = batal;
        else batal();
      })
      .catch(() => {
        // Tidak ada jendela Tauri (lingkungan test atau pratinjau browser).
        // Ukuran WebView biasa tetap dilacak lewat peristiwa resize di bawah.
      });

    const padaResize = () => void perbaruiUkuran();
    window.addEventListener("resize", padaResize);

    return () => {
      masihHidup.current = false;
      window.removeEventListener("resize", padaResize);
      batalDengar.current?.();
      batalDengar.current = null;
    };
  }, [perbaruiUkuran]);

  const jalankanMode = useCallback(
    async (aksi: () => Promise<unknown>, pesanGagal: string) => {
      try {
        await aksi();
        await perbaruiUkuran();
      } catch (mentah) {
        beriTahuGalat(`${pesanGagal} ${pesanGalat(mentah)}`);
      }
    },
    [perbaruiUkuran],
  );

  const masukWidget = useCallback(
    () => jalankanMode(masukModeWidget, "Widget tidak dapat dibuka."),
    [jalankanMode],
  );

  // Geometri mode penuh ikut tersimpan setelah ukuran berubah, lewat pemantau resize
  // di TampilanWidget, jadi di sini cukup melepaskan mode widget.
  const perluas = useCallback(
    () => jalankanMode(keluarModeWidget, "Jendela tidak dapat diperluas."),
    [jalankanMode],
  );

  return {
    modeWidget: deteksiModeJendela(ukuran.lebar, ukuran.tinggi) === "widget",
    lebar: ukuran.lebar,
    tinggi: ukuran.tinggi,
    siap,
    masukWidget,
    perluas,
  };
}
