import { useEffect, useRef, type ReactNode } from "react";

import { Tombol } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import { useTerjemah } from "@/lib/i18n";

/** Form inline satu kolom nama untuk pengelolaan folder dan tag: otomatis menerima fokus,
   Esc membatalkan, dan slot `anak` dipakai pemilih warna tag. Backend tetap sumber kebenaran
   validasi, jadi `maks` hanya membatasi mengetik sebelum command dikirim. */
export function FormNama({
  idKolom,
  label,
  nilai,
  maks,
  placeholder,
  pesan,
  menyimpan,
  onNilai,
  onSimpan,
  onBatal,
  anak,
}: {
  idKolom: string;
  label: string;
  nilai: string;
  maks: number;
  placeholder?: string;
  pesan: string | null;
  menyimpan: boolean;
  onNilai: (nilai: string) => void;
  onSimpan: () => void;
  onBatal: () => void;
  anak?: ReactNode;
}) {
  const { t } = useTerjemah();
  const kolom = useRef<HTMLInputElement>(null);

  useEffect(() => {
    kolom.current?.focus();
    kolom.current?.select();
  }, []);

  return (
    <form
      className="flex animate-in flex-col gap-xs fade-in-0 slide-in-from-top-1 duration-[180ms] ease-standard"
      onSubmit={(event) => {
        event.preventDefault();
        onSimpan();
      }}
    >
      <Label htmlFor={idKolom}>{label}</Label>
      <Input
        id={idKolom}
        ref={kolom}
        value={nilai}
        maxLength={maks}
        placeholder={placeholder}
        aria-invalid={pesan ? true : undefined}
        onChange={(event) => onNilai(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onBatal();
        }}
      />
      {anak}
      {pesan && <Petunjuk galat>{pesan}</Petunjuk>}
      <div className="flex items-center gap-xs">
        <Tombol type="submit" varian="utama" disabled={menyimpan}>
          {menyimpan ? t("umum.menyimpan") : t("umum.simpan")}
        </Tombol>
        <Tombol type="button" varian="sekunder" disabled={menyimpan} onClick={onBatal}>
          {t("umum.batal")}
        </Tombol>
      </div>
    </form>
  );
}
