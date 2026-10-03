import { InboxIcon, type LucideIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { IsiKartu, JudulKartu, Kartu } from "@/components/ui/card";

export type PropertiKeadaanKosong = {
  /** Judul pendek, satu baris. */
  judul: string;
  /** Penjelasan satu sampai dua kalimat dan apa yang harus dilakukan pengguna. */
  pesan: string;
  /** Label tombol aksi. Bila tidak diisi, kartu tampil tanpa tombol. */
  aksiLabel?: string;
  /** Aksi utama kartu. Hanya dipanggil bila `aksiLabel` diisi. */
  onAksi?: () => void;
  /** Ikon pengganti. Default laci kosong, dipakai ulang di koleksi, folder, tag, sampah, dan transfer. */
  ikon?: LucideIcon;
};

/**
 * Kartu keadaan kosong bergaya brutalis. Ilustrasi dotLottie sengaja tidak dipakai di sini:
 * komponen ini ada di jalur render awal, jadi cukup ikon lucide dalam kotak bergaris tepi.
 */
export function KeadaanKosong({
  judul,
  pesan,
  aksiLabel,
  onAksi,
  ikon: Ikon = InboxIcon,
}: PropertiKeadaanKosong) {
  return (
    <Kartu className="mx-auto grid w-full max-w-[420px] place-items-center gap-md rounded-lg p-xl text-center">
      <span
        aria-hidden
        className="grid size-[72px] place-items-center rounded-sm border-2 border-primary bg-surface-sunken"
      >
        <Ikon className="size-10" />
      </span>

      <div className="grid gap-xxs">
        <JudulKartu>{judul}</JudulKartu>
        <IsiKartu className="text-secondary">{pesan}</IsiKartu>
      </div>

      {aksiLabel && onAksi && <Tombol onClick={onAksi}>{aksiLabel}</Tombol>}
    </Kartu>
  );
}
