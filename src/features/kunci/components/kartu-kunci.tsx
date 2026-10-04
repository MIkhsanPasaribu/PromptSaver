import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheckIcon } from "lucide-react";

import { ChipPilih, Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import { DAFTAR_JEDA, type StatusKunci } from "@/features/kunci/services/kunci-service";
import { galatPin } from "@/features/kunci/types/kunci-skema";
import { useKunci } from "@/app/store/kunci-store";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuBerhasil } from "@/lib/notifikasi";

/** Kunci teks untuk satu pilihan jeda. Nilai 0 berarti kunci segera saat jendela kehilangan fokus,
   dan 60 detik adalah bawaan yang dihitung ulang di backend kalau belum ada nilainya. */
function labelJeda(detik: number): { kunci: string; opsi?: { detik: number } | { menit: number } } {
  if (detik === 0) return { kunci: "kunci.jedaSeketika" };
  if (detik < 60) return { kunci: "kunci.jedaDetik", opsi: { detik } };
  if (detik === 60) return { kunci: "kunci.jedaSatuMenit" };
  return { kunci: "kunci.jedaMenit", opsi: { menit: detik / 60 } };
}

function KolomPin({
  id,
  label,
  nilai,
  onUbah,
}: {
  id: string;
  label: string;
  nilai: string;
  onUbah: (nilai: string) => void;
}) {
  const { t } = useTerjemah();
  return (
    <div className="grid gap-xs">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        required
        value={nilai}
        onChange={(event) => onUbah(event.target.value)}
      />
      <Petunjuk>{t("kunci.petunjukPin")}</Petunjuk>
    </div>
  );
}

function GalatInline({ pesan }: { pesan: string | null }) {
  if (!pesan) return null;
  return (
    <p role="alert" className="text-body-sm text-error">
      {pesan}
    </p>
  );
}

/** F4 kartu kunci aplikasi. Aturan panjang dan isi PIN hidup di `kunci-skema.ts` dan ditegakkan
   ulang oleh `kunci::service` di Rust, sedangkan kecocokan dua kolom diperiksa di sini karena itu
   murni interaksi tampilan, bukan aturan data. */
export function KartuKunci() {
  const { t } = useTerjemah();
  const { status, muat, pasang, ganti, aturJeda, lepas, kunciTangan } = useKunci();
  const [pinLama, setPinLama] = useState("");
  const [pinBaru, setPinBaru] = useState("");
  const [pinUlang, setPinUlang] = useState("");
  const [panel, setPanel] = useState<"ganti" | "lepas" | null>(null);
  const [sedangProses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    void muat();
  }, [muat]);

  const aktif = Boolean(status?.aktif);
  const jeda = status?.jedaDetik ?? 60;
  const tidakCocok = pinUlang.length > 0 && pinBaru !== pinUlang;
  const salahPin = galatPin(pinBaru);

  const kosongkan = () => {
    setPinLama("");
    setPinBaru("");
    setPinUlang("");
    setPanel(null);
  };

  const jalankan = async (
    event: FormEvent,
    aksi: () => Promise<StatusKunci>,
    kunciSukses: string,
  ) => {
    event.preventDefault();
    if (sedangProses || tidakCocok || salahPin) return;
    setProses(true);
    setGalat(null);
    try {
      await aksi();
      beriTahuBerhasil(t(kunciSukses));
      kosongkan();
    } catch (mentah) {
      setGalat(pesanGalat(mentah));
    } finally {
      setProses(false);
    }
  };

  const simpanJeda = (detik: number) => {
    setGalat(null);
    aturJeda(detik).catch((mentah) => setGalat(pesanGalat(mentah)));
  };

  return (
    <Kartu as="section" className="grid gap-md">
      <h2 className="flex items-center gap-xs font-display text-headline-sm">
        <ShieldCheckIcon aria-hidden />
        {t("kunci.judul")}
      </h2>

      <div className="grid gap-xs">
        <Lencana warna={aktif ? "berhasil" : "netral"}>
          {t(aktif ? "kunci.statusAktif" : "kunci.statusMati")}
        </Lencana>
        <Petunjuk>{t("kunci.petunjuk")}</Petunjuk>
      </div>

      {aktif && (
        <div className="grid gap-xs">
          <Label>{t("kunci.labelJeda")}</Label>
          <div className="flex flex-wrap gap-xs">
            {DAFTAR_JEDA.map((detik) => {
              const label = labelJeda(detik);
              return (
                <ChipPilih key={detik} aktif={jeda === detik} onUbah={() => simpanJeda(detik)}>
                  {t(label.kunci, label.opsi)}
                </ChipPilih>
              );
            })}
          </div>
        </div>
      )}

      {!aktif ? (
        <form
          className="grid gap-md"
          onSubmit={(event) =>
            void jalankan(event, () => pasang(pinBaru, jeda), "kunci.berhasilPasang")
          }
        >
          <KolomPin
            id="pin-baru"
            label={t("kunci.labelPinBaru")}
            nilai={pinBaru}
            onUbah={setPinBaru}
          />
          <KolomPin
            id="pin-ulang"
            label={t("kunci.labelPinUlang")}
            nilai={pinUlang}
            onUbah={setPinUlang}
          />
          <GalatInline pesan={salahPin ?? (tidakCocok ? t("kunci.pinTidakCocok") : null)} />
          <Tombol
            type="submit"
            varian="sekunder"
            ukuran="kecil"
            disabled={
              sedangProses || pinBaru.length === 0 || tidakCocok || Boolean(salahPin)
            }
          >
            {t("kunci.tombolPasang")}
          </Tombol>
        </form>
      ) : (
        <div className="grid gap-md">
          <div className="flex flex-wrap gap-xs">
            <Tombol
              varian="sekunder"
              ukuran="kecil"
              onClick={() => setPanel(panel === "ganti" ? null : "ganti")}
            >
              {t("kunci.tombolGanti")}
            </Tombol>
            <Tombol
              varian="sekunder"
              ukuran="kecil"
              onClick={() => setPanel(panel === "lepas" ? null : "lepas")}
            >
              {t("kunci.tombolLepas")}
            </Tombol>
            <Tombol varian="hantu" ukuran="kecil" onClick={() => void kunciTangan()}>
              {t("kunci.tombolKunci")}
            </Tombol>
          </div>

          {panel === "ganti" && (
            <form
              className="grid gap-md"
              onSubmit={(event) =>
                void jalankan(event, () => ganti(pinLama, pinBaru), "kunci.berhasilGanti")
              }
            >
              <KolomPin
                id="pin-lama"
                label={t("kunci.labelPinLama")}
                nilai={pinLama}
                onUbah={setPinLama}
              />
              <KolomPin
                id="pin-baru-ganti"
                label={t("kunci.labelPinBaru")}
                nilai={pinBaru}
                onUbah={setPinBaru}
              />
              <KolomPin
                id="pin-ulang-ganti"
                label={t("kunci.labelPinUlang")}
                nilai={pinUlang}
                onUbah={setPinUlang}
              />
              <GalatInline pesan={salahPin ?? (tidakCocok ? t("kunci.pinTidakCocok") : null)} />
              <Tombol
                type="submit"
                varian="sekunder"
                ukuran="kecil"
                disabled={
                  sedangProses ||
                  pinLama.length === 0 ||
                  pinBaru.length === 0 ||
                  tidakCocok ||
                  Boolean(salahPin)
                }
              >
                {t("kunci.tombolGanti")}
              </Tombol>
            </form>
          )}

          {panel === "lepas" && (
            <form
              className="grid gap-md"
              onSubmit={(event) =>
                void jalankan(event, () => lepas(pinLama), "kunci.berhasilLepas")
              }
            >
              <KolomPin
                id="pin-lama-lepas"
                label={t("kunci.labelPinLama")}
                nilai={pinLama}
                onUbah={setPinLama}
              />
              <Tombol
                type="submit"
                varian="bahaya"
                ukuran="kecil"
                disabled={sedangProses || pinLama.length === 0}
              >
                {t("kunci.tombolLepas")}
              </Tombol>
            </form>
          )}
        </div>
      )}

      <GalatInline pesan={galat} />

      {/* Kejujuran lapisan: kunci ini menjaga aplikasi pada perangkat yang sedang terbuka, bukan
          mengenkripsi berkas. Halaman Privasi mengatakan hal yang sama. */}
      <Petunjuk>{t("kunci.peringatan")}</Petunjuk>
    </Kartu>
  );
}
