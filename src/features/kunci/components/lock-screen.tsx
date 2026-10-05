import { useEffect, useState, type FormEvent } from "react";
import { FingerprintIcon, LockIcon, ShieldCheckIcon } from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import { useKunci } from "@/app/store/kunci-store";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import logoMerek from "@/assets/brand/logo-64.png";

/** F4 layar kunci. Menggantikan seluruh shell, jadi tidak ada command data yang sempat dipanggil
   sebelum PIN diterima. Pinfield memakai type=password supaya isinya tidak terlihat di bahu. */
export function LayarKunci() {
  const { t } = useTerjemah();
  const buka = useKunci((s) => s.buka);
  const bukaBiometrik = useKunci((s) => s.bukaBiometrik);
  const status = useKunci((s) => s.status);
  const [pin, setPin] = useState("");
  const [sedangMemeriksa, setMemeriksa] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [sisaTunggu, setSisaTunggu] = useState(0);

  // Backend yang memutuskan lama tunggu; tampilan hanya menurunkannya tiap detik.
  useEffect(() => setSisaTunggu(status?.blokirSisa ?? 0), [status]);
  useEffect(() => {
    if (sisaTunggu <= 0) return;
    const jam = window.setTimeout(() => setSisaTunggu((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(jam);
  }, [sisaTunggu]);

  const kirim = async (event: FormEvent) => {
    event.preventDefault();
    if (sedangMemeriksa || sisaTunggu > 0) return;
    setMemeriksa(true);
    setPesan(null);
    try {
      const hasil = await buka(pin);
      if (hasil.terkunci) setPesan(t("kunci.pinSalahMasuk"));
    } catch (mentah) {
      setPesan(pesanGalat(mentah));
    } finally {
      // Kolom selalu dikosongkan, termasuk saat berhasil, supaya PIN tidak tertinggal di layar.
      setPin("");
      setMemeriksa(false);
    }
  };

  const cobaBiometrik = async () => {
    if (sedangMemeriksa) return;
    setMemeriksa(true);
    setPesan(null);
    try {
      const hasil = await bukaBiometrik();
      if (hasil.terkunci) setPesan(t("kunci.biometrikGagal"));
    } catch (mentah) {
      setPesan(pesanGalat(mentah));
    } finally {
      setMemeriksa(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-screen flex-col items-center overflow-y-auto overscroll-contain bg-neutral p-md">
      {/* Lebar ditulis sebagai nilai bebas: pada Tailwind v4 di proyek ini `max-w-sm` mengambil
          token jarak `--spacing-sm` (12px), jadi kartu menyusut dan teksnya meluber keluar bingkai. */}
      <Kartu as="section" className="my-auto grid w-full max-w-[384px] gap-md shadow-elev-3">
        <div className="flex items-center gap-xs">
          <img
            src={logoMerek}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-sm border-2 border-primary"
          />
          <h1 className="font-display text-headline-sm">{t("kunci.layarJudul")}</h1>
        </div>

        <p className="text-body-md text-on-surface">{t("kunci.layarPetunjuk")}</p>

        <form className="grid gap-xs" onSubmit={(event) => void kirim(event)}>
          <Label htmlFor="pin-masuk">{t("kunci.labelKodePin")}</Label>
          <Input
            id="pin-masuk"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            required
            value={pin}
            disabled={sisaTunggu > 0}
            aria-invalid={Boolean(pesan)}
            aria-describedby="pin-masuk-pesan"
            onChange={(event) => setPin(event.target.value)}
          />
          <Petunjuk>{t("kunci.petunjukPin")}</Petunjuk>

          <div
            id="pin-masuk-pesan"
            role="alert"
            aria-live="polite"
            className="min-h-6 text-body-sm text-error"
          >
            {sisaTunggu > 0 ? t("kunci.layarTunggu", { detik: sisaTunggu }) : pesan}
          </div>

          <Tombol
            type="submit"
            varian="utama"
            disabled={sedangMemeriksa || pin.length === 0 || sisaTunggu > 0}
          >
            {sedangMemeriksa ? <ShieldCheckIcon aria-hidden /> : <LockIcon aria-hidden />}
            {sedangMemeriksa ? t("kunci.memeriksa") : t("kunci.layarBuka")}
          </Tombol>

          {/* Tombol ini hanya muncul bila Android melaporkan sensor yang siap pakai, jadi PIN
              selalu tetap menjadi jalan utama. */}
          {status?.biometrikTersedia && (
            <Tombol
              type="button"
              varian="sekunder"
              ukuran="kecil"
              disabled={sedangMemeriksa || sisaTunggu > 0}
              onClick={() => void cobaBiometrik()}
            >
              <FingerprintIcon aria-hidden />
              {t("kunci.biometrik")}
            </Tombol>
          )}
        </form>

        <p className="text-body-sm text-secondary">{t("kunci.layarKaki")}</p>
      </Kartu>
    </div>
  );
}
