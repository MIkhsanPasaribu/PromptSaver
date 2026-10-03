import { toast } from "sonner";

import { terjemah } from "@/lib/i18n";

/** Umpan balik salin. Muncul tanpa delay karena clipboard ditulis lebih dulu (PRD C1). */
export function beriTahuTersalin(jumlah?: number) {
  toast.success(
    jumlah ? terjemah("umum.tersalinBanyak", { jumlah }) : terjemah("umum.tersalinSatu"),
    {
      duration: 1600,
      id: "tersalin",
    },
  );
}

export function beriTahuBerhasil(pesan: string) {
  toast.success(pesan, { duration: 2400 });
}

export function beriTahuGalat(pesan: string) {
  toast.error(pesan, { duration: 4200 });
}

export function beriTahuPeringatan(pesan: string) {
  toast.warning(pesan, { duration: 4200 });
}
