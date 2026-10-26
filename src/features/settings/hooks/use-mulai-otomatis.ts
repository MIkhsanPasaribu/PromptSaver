import { useCallback, useEffect, useRef } from "react";

import { usePengaturan } from "@/app/store/pengaturan-store";
import { deteksiPlatform } from "@/lib/platform";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";
import {
  bacaMulaiOtomatisSistem,
  terapkanMulaiOtomatis,
} from "@/features/settings/services/autostart-service";

/** Tulis keadaan saklar "jalankan otomatis saat masuk".
 *
 * Urutannya disengaja: database lebih dulu, baru entri start sistem. Kalau penyimpanan
 * pengaturan gagal, store sudah mengembalikan nilainya sendiri dan sistem belum disentuh.
 * Kalau yang gagal justru entri sistem, nilai database dikembalikan lagi di sini supaya
 * saklar tidak berbohong. */
export function gunakanUbahMulaiOtomatis(): (aktif: boolean) => Promise<void> {
  const { t } = useTerjemah();
  const ubah = usePengaturan((s) => s.ubah);

  return useCallback(
    async (aktif: boolean) => {
      if (!(await ubah({ mulaiOtomatis: aktif }))) return;
      try {
        await terapkanMulaiOtomatis(aktif);
      } catch (mentah) {
        await ubah({ mulaiOtomatis: !aktif });
        beriTahuGalat(t("pengaturan.gagalMulaiOtomatis", { pesan: pesanGalat(mentah) }));
      }
    },
    [t, ubah],
  );
}

/** Samakan salinan di database dengan keadaan entri start yang sebenarnya, sekali saat
   aplikasi siap.
 *
 * Windows punya saklarnya sendiri di Settings > Apps > Startup dan pengguna bisa mematikannya
 * di sana, jadi keadaan sistem yang jadi sumber kebenaran. Di mobile plugin ini tidak
 * terpasang, jadi jalur ini dilewati. */
export function gunakanSinkronMulaiOtomatis(siap: boolean) {
  const sudahDicek = useRef(false);

  useEffect(() => {
    if (!siap || sudahDicek.current || deteksiPlatform() !== "desktop") return;
    sudahDicek.current = true;
    void (async () => {
      try {
        const sistem = await bacaMulaiOtomatisSistem();
        const { pengaturan, ubah } = usePengaturan.getState();
        if (pengaturan && sistem !== pengaturan.mulaiOtomatis) {
          await ubah({ mulaiOtomatis: sistem });
        }
      } catch (mentah) {
        // Plugin gagal dibaca (misalnya kemampuan tidak tersedia): lebih baik nilai tersimpan
        // dibiarkan daripada saklar tiba-tiba mati sendiri.
        beriTahuGalat(pesanGalat(mentah));
      }
    })();
  }, [siap]);
}
