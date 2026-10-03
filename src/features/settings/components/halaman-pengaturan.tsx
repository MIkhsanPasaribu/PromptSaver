import { useCallback, useEffect, useState } from "react";
import {
  MonitorIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  ArrowLeftIcon,
  KeyboardIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { ChipPilih, Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { Kartu } from "@/components/ui/card";
import {
  Dialog,
  DialogDeskripsi,
  DialogJudul,
  DialogKaki,
  DialogKonten,
  DialogKepala,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Petunjuk } from "@/components/ui/label";
import {
  cadangkanSekarang,
  daftarCadangan,
  pulihkanCadangan,
  type Cadangan,
} from "@/features/cadangan";
import { statistikKoleksi } from "@/features/prompts/services/prompt-service";
import { KartuKunci } from "@/features/kunci";
import type { Statistik, UrutanPrompt } from "@/features/prompts/types/prompt.types";
import {
  STRATEGI_IMPOR,
  type StrategiKonflik,
} from "@/features/transfer/services/transfer-service";
import {
  TRANSPARANSI_MAKS,
  TRANSPARANSI_MIN,
  type Pengaturan,
  type Tema,
} from "@/features/settings/services/settings-service";
import { gunakanModeJendela } from "@/features/widget/hooks/use-mode-jendela";
import { deteksiPlatform, terapkanPintasanGlobal } from "@/features/widget/services/widget-service";
import { useNavigasi } from "@/app/store/navigasi-store";
import { usePengaturan } from "@/app/store/pengaturan-store";
import { DAFTAR_BAHASA, useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { tanggalLengkap, ukuranBerkas } from "@/lib/format-waktu";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";

/** Label dibaca lewat `kunci` saat render supaya pergantian bahasa langsung terlihat, sama seperti
   daftar navigasi di KerangkaAplikasi. */
const TEMA: { nilai: Tema; kunci: string }[] = [
  { nilai: "ikut-sistem", kunci: "pengaturan.temaIkutSistem" },
  { nilai: "terang", kunci: "pengaturan.temaTerang" },
  { nilai: "gelap", kunci: "pengaturan.temaGelap" },
];

const URUTAN: { nilai: UrutanPrompt; kunci: string }[] = [
  { nilai: "terbaru", kunci: "pengaturan.urutanTerbaru" },
  { nilai: "dipakai", kunci: "pengaturan.urutanDipakai" },
  { nilai: "abjad", kunci: "pengaturan.urutanAbjad" },
];

const KATA_KONFIRMASI = "HAPUS";

function Saklar({
  aktif,
  label,
  onUbah,
}: {
  aktif: boolean;
  label: string;
  onUbah: (nilai: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aktif}
      onClick={() => onUbah(!aktif)}
      className="inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-sm border-2 border-primary bg-surface p-xxs shadow-elev-1 transition-[background-color] duration-[120ms] ease-standard focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-fokus data-[aktif=true]:bg-tertiary"
      data-aktif={aktif}
    >
      <span
        className="block size-5 rounded-sm border-2 border-primary bg-surface transition-transform duration-[120ms] ease-standard"
        style={{ transform: aktif ? "translateX(34px)" : "translateX(0)" }}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** F1 pengaturan aplikasi. Perubahan berlaku langsung tanpa restart (PRD F1). */
export function HalamanPengaturan() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const { pengaturan, ubah, aturUlang, kosongkanData } = usePengaturan();
  const desktop = deteksiPlatform() === "desktop";
  const { modeWidget, masukWidget, perluas } = gunakanModeJendela();
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<0 | 1 | 2>(0);
  const [kataKonfirmasi, setKataKonfirmasi] = useState("");
  const [hapusBerkas, setHapusBerkas] = useState(false);
  const [pintasanTeks, setPintasanTeks] = useState(pengaturan?.pintasanGlobal ?? "");
  const [daftarCadanganTerisi, setDaftarCadangan] = useState<Cadangan[]>([]);
  const [sedangCadangan, setSedangCadangan] = useState(false);
  const [akanPulih, setAkanPulih] = useState<Cadangan | null>(null);
  const [strategiPulih, setStrategiPulih] = useState<StrategiKonflik>("lewati-duplikat");

  const muatStatistik = async () => {
    try {
      setStatistik(await statistikKoleksi());
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  const muatCadangan = useCallback(async () => {
    setSedangCadangan(true);
    try {
      setDaftarCadangan(await daftarCadangan());
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    } finally {
      setSedangCadangan(false);
    }
  }, []);

  useEffect(() => {
    void muatCadangan();
  }, [muatCadangan]);

  const cadangkanManual = async () => {
    setSedangCadangan(true);
    try {
      await cadangkanSekarang();
      beriTahuBerhasil(t("pengaturan.cadanganDibuat"));
      await muatCadangan();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    } finally {
      setSedangCadangan(false);
    }
  };

  const jalankanPulih = async (item: Cadangan) => {
    setAkanPulih(null);
    setSedangCadangan(true);
    try {
      const hasil = await pulihkanCadangan(item.nama, strategiPulih);
      beriTahuBerhasil(
        t("pengaturan.pemulihanSelesai", {
          ditambah: hasil.ditambah,
          dilewati: hasil.dilewati,
        }),
      );
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    } finally {
      setSedangCadangan(false);
    }
  };

  if (!pengaturan) {
    return <p className="text-body-sm text-secondary">{t("pengaturan.memuatPengaturan")}</p>;
  }

  const transparansi = pengaturan.widgetTransparansi;
  const catatanPulih = STRATEGI_IMPOR.find((opsi) => opsi.nilai === strategiPulih);

  /** Simpan preferensi pintasan lalu daftarkan ulang sekarang juga (PRD F1: berlaku tanpa
     restart, G3: bentrok dilaporkan ke pengguna). Mobile tidak punya command ini. */
  const simpanPintasan = async (
    patch: Partial<Pick<Pengaturan, "pintasanGlobalAktif" | "pintasanGlobal">>,
  ) => {
    await ubah(patch);
    if (!desktop) return;
    try {
      await terapkanPintasanGlobal();
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
    }
  };

  return (
    <div className="grid gap-lg">
      <div className="flex items-center justify-between gap-sm">
        <h1 className="font-display text-headline-lg">{t("pengaturan.judul")}</h1>
        <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
          <ArrowLeftIcon aria-hidden />
          {t("umum.kembali")}
        </Tombol>
      </div>

      <Kartu as="section" className="grid gap-md">
        <h2 className="font-display text-headline-sm">{t("pengaturan.tampilan")}</h2>

        <div className="grid gap-xs">
          <Label>{t("pengaturan.labelTema")}</Label>
          <div className="flex flex-wrap gap-xs">
            {TEMA.map((opsi) => (
              <ChipPilih
                key={opsi.nilai}
                aktif={pengaturan.tema === opsi.nilai}
                onUbah={() => void ubah({ tema: opsi.nilai })}
              >
                {t(opsi.kunci)}
              </ChipPilih>
            ))}
          </div>
          <Petunjuk>{t("pengaturan.petunjukTema")}</Petunjuk>
        </div>

        <div className="grid gap-xs">
          <Label>{t("pengaturan.labelBahasa")}</Label>
          <div className="flex flex-wrap gap-xs">
            {DAFTAR_BAHASA.map((opsi) => (
              <ChipPilih
                key={opsi.nilai}
                aktif={pengaturan.bahasa === opsi.nilai}
                onUbah={() => void ubah({ bahasa: opsi.nilai })}
              >
                {opsi.label}
              </ChipPilih>
            ))}
          </div>
          <Petunjuk>{t("pengaturan.petunjukBahasa")}</Petunjuk>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label htmlFor="kurangi-animasi">{t("pengaturan.kurangiAnimasi")}</Label>
            <Petunjuk>{t("pengaturan.petunjukKurangiAnimasi")}</Petunjuk>
          </div>
          <Saklar
            aktif={pengaturan.kurangiAnimasi}
            label={t("pengaturan.kurangiAnimasi")}
            onUbah={(nilai) => void ubah({ kurangiAnimasi: nilai })}
          />
        </div>

        <div className="grid gap-xs">
          <Label>{t("pengaturan.labelUrutan")}</Label>
          <div className="flex flex-wrap gap-xs">
            {URUTAN.map((opsi) => (
              <ChipPilih
                key={opsi.nilai}
                aktif={pengaturan.urutanDaftar === opsi.nilai}
                onUbah={() => void ubah({ urutanDaftar: opsi.nilai })}
              >
                {t(opsi.kunci)}
              </ChipPilih>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label htmlFor="ingat-nilai">{t("pengaturan.labelIngatNilai")}</Label>
            <Petunjuk>{t("pengaturan.petunjukIngatNilai")}</Petunjuk>
          </div>
          <Saklar
            aktif={pengaturan.ingatNilaiVariabel}
            label={t("pengaturan.labelIngatNilai")}
            onUbah={(nilai) => void ubah({ ingatNilaiVariabel: nilai })}
          />
        </div>

        <Tombol
          varian="sekunder"
          ukuran="kecil"
          onClick={() => {
            void ubah({ onboardingSelesai: false });
            navigasi.ganti({ nama: "onboarding" });
          }}
        >
          {t("pengaturan.tampilkanPanduanLagi")}
        </Tombol>
      </Kartu>

      {desktop && (
        <Kartu as="section" className="grid gap-md">
          <h2 className="flex items-center gap-xs font-display text-headline-sm">
            <MonitorIcon aria-hidden />
            {t("pengaturan.modeWidgetDesktop")}
          </h2>

          <Tombol varian="sekunder" onClick={() => (modeWidget ? perluas() : void masukWidget())}>
            {modeWidget ? t("pengaturan.perluasJendelaPenuh") : t("pengaturan.cobaModeWidget")}
          </Tombol>

          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div>
              <Label htmlFor="selalu-di-atas">{t("pengaturan.sematkanDiAtas")}</Label>
              <Petunjuk>{t("pengaturan.petunjukSematkan")}</Petunjuk>
            </div>
            <Saklar
              aktif={pengaturan.widgetSelaluDiAtas}
              label={t("pengaturan.sematkanDiAtas")}
              onUbah={(nilai) => void ubah({ widgetSelaluDiAtas: nilai })}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div>
              <Label htmlFor="tutup-tray">{t("pengaturan.sembunyikanKeTray")}</Label>
              <Petunjuk>{t("pengaturan.petunjukTray")}</Petunjuk>
            </div>
            <Saklar
              aktif={pengaturan.widgetTutupKeTray}
              label={t("pengaturan.sembunyikanKeTray")}
              onUbah={(nilai) => void ubah({ widgetTutupKeTray: nilai })}
            />
          </div>

          <div className="grid gap-xs">
            <Label htmlFor="transparansi">
              {t("pengaturan.transparansiJendela", { nilai: transparansi })}
            </Label>
            <input
              id="transparansi"
              type="range"
              min={TRANSPARANSI_MIN}
              max={TRANSPARANSI_MAKS}
              step={5}
              value={transparansi}
              onChange={(event) => void ubah({ widgetTransparansi: Number(event.target.value) })}
              className="h-2 w-full max-w-80 cursor-pointer appearance-none rounded-sm border-2 border-primary bg-surface-sunken accent-tertiary"
            />
            <Petunjuk>
              {t("pengaturan.petunjukTransparansi", {
                min: TRANSPARANSI_MIN,
                maks: TRANSPARANSI_MAKS,
              })}
            </Petunjuk>
          </div>

          <div className="grid gap-xs">
            <Label htmlFor="pintasan-global">{t("pengaturan.labelPintasanGlobal")}</Label>
            <div className="flex flex-wrap items-center gap-sm">
              <Saklar
                aktif={pengaturan.pintasanGlobalAktif}
                label={t("pengaturan.aktifkanPintasanGlobal")}
                onUbah={(nilai) => void simpanPintasan({ pintasanGlobalAktif: nilai })}
              />
              <Input
                id="pintasan-global"
                className="max-w-48"
                value={pintasanTeks}
                onChange={(event) => setPintasanTeks(event.target.value)}
                placeholder="Control+Alt+K"
              />
              <Tombol
                varian="sekunder"
                ukuran="kecil"
                onClick={() => void simpanPintasan({ pintasanGlobal: pintasanTeks })}
              >
                {t("pengaturan.simpanPintasan")}
              </Tombol>
            </div>
            <Petunjuk>{t("pengaturan.petunjukPintasanGlobal")}</Petunjuk>
          </div>
        </Kartu>
      )}

      <Kartu as="section" className="grid gap-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 className="font-display text-headline-sm">{t("pengaturan.cadanganOtomatis")}</h2>
          <Tombol
            varian="sekunder"
            ukuran="kecil"
            disabled={sedangCadangan}
            onClick={() => void cadangkanManual()}
          >
            <SaveIcon aria-hidden />
            {t("pengaturan.cadangkanSekarang")}
          </Tombol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label htmlFor="cadangan-otomatis">{t("pengaturan.labelCadanganMingguan")}</Label>
            <Petunjuk>{t("pengaturan.petunjukCadanganMingguan")}</Petunjuk>
          </div>
          <Saklar
            aktif={pengaturan.cadanganOtomatis}
            label={t("pengaturan.labelCadanganMingguan")}
            onUbah={(nilai) => void ubah({ cadanganOtomatis: nilai })}
          />
        </div>

        {daftarCadanganTerisi.length === 0 ? (
          <Petunjuk>{t("pengaturan.belumAdaCadangan")}</Petunjuk>
        ) : (
          <ul className="grid gap-xs">
            {daftarCadanganTerisi.map((item) => (
              <li
                key={item.nama}
                className="flex flex-wrap items-center justify-between gap-sm border-t-2 border-primary pt-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm">{tanggalLengkap(item.dibuatPada)}</span>
                  <span className="block truncate font-code text-code-sm text-secondary">
                    {item.nama} • {ukuranBerkas(item.ukuranByte)}
                  </span>
                </span>
                <Tombol
                  varian="sekunder"
                  ukuran="kecil"
                  disabled={sedangCadangan}
                  onClick={() => setAkanPulih(item)}
                >
                  {t("umum.pulihkan")}
                </Tombol>
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      <Dialog
        open={Boolean(akanPulih)}
        onOpenChange={(buka) => {
          if (!buka) setAkanPulih(null);
        }}
      >
        <DialogKonten>
          <DialogKepala>
            <DialogJudul>{t("pengaturan.judulPulihkan")}</DialogJudul>
            <DialogDeskripsi>{t("pengaturan.petunjukPulihkan")}</DialogDeskripsi>
          </DialogKepala>

          <div className="grid gap-xs">
            <Label>{t("transfer.labelStrategiKonflik")}</Label>
            <div className="flex flex-wrap gap-xs">
              {STRATEGI_IMPOR.map((opsi) => (
                <ChipPilih
                  key={opsi.nilai}
                  aktif={strategiPulih === opsi.nilai}
                  onUbah={() => setStrategiPulih(opsi.nilai)}
                >
                  {t(opsi.kunciLabel)}
                </ChipPilih>
              ))}
            </div>
            <Petunjuk>{catatanPulih ? t(catatanPulih.kunciCatatan) : ""}</Petunjuk>
          </div>

          <DialogKaki>
            <Tombol varian="sekunder" onClick={() => setAkanPulih(null)}>
              {t("umum.batal")}
            </Tombol>
            <Tombol varian="utama" onClick={() => akanPulih && void jalankanPulih(akanPulih)}>
              {t("pengaturan.yaPulihkan")}
            </Tombol>
          </DialogKaki>
        </DialogKonten>
      </Dialog>

      <KartuKunci />

      <Kartu as="section" className="grid gap-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 className="font-display text-headline-sm">{t("pengaturan.statistikKoleksi")}</h2>
          <Tombol varian="hantu" ukuran="kecil" onClick={() => void muatStatistik()}>
            <RefreshCwIcon aria-hidden />
            {t("umum.hitung")}
          </Tombol>
        </div>

        {statistik ? (
          <div className="grid grid-cols-2 gap-md md:grid-cols-4">
            {[
              { label: t("pengaturan.statPrompt"), nilai: statistik.jumlahPrompt },
              { label: t("pengaturan.statFolder"), nilai: statistik.jumlahFolder },
              { label: t("pengaturan.statTag"), nilai: statistik.jumlahTag },
              { label: t("pengaturan.statSampah"), nilai: statistik.jumlahSampah },
            ].map((tile) => (
              <div
                key={tile.label}
                className="border-2 border-primary bg-surface p-md shadow-elev-3"
              >
                <p className="font-display text-headline-xl">{tile.nilai}</p>
                <p className="text-body-sm text-secondary">{tile.label}</p>
              </div>
            ))}
            <p className="col-span-2 text-body-sm text-secondary md:col-span-4">
              {t("pengaturan.statistikUkuran", { kb: statistik.ukuranDatabaseKb })}
            </p>
          </div>
        ) : (
          <Petunjuk>{t("pengaturan.petunjukStatistik", { hitung: t("umum.hitung") })}</Petunjuk>
        )}
      </Kartu>

      <Kartu as="section" className="grid gap-md border-[3px] border-error">
        <h2 className="flex items-center gap-xs font-display text-headline-sm text-error">
          <TriangleAlertIcon aria-hidden />
          {t("pengaturan.zonaBerbahaya")}
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label>{t("pengaturan.labelAturUlang")}</Label>
            <Petunjuk>{t("pengaturan.petunjukAturUlang")}</Petunjuk>
          </div>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => void aturUlang()}>
            <RefreshCwIcon aria-hidden />
            {t("umum.aturUlang")}
          </Tombol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm border-t-2 border-primary pt-md">
          <Label>{t("pengaturan.labelPrivasiData")}</Label>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => navigasi.ke({ nama: "privasi" })}>
            <ShieldCheckIcon aria-hidden />
            {t("pengaturan.halamanPrivasi")}
          </Tombol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label>{t("navigasi.bantuan")}</Label>
            <Petunjuk>{t("pengaturan.petunjukDaftarPintasan")}</Petunjuk>
          </div>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => navigasi.ke({ nama: "bantuan" })}>
            <KeyboardIcon aria-hidden />
            {t("navigasi.daftarPintasan")}
          </Tombol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <Label>{t("pengaturan.hapusSemuaData")}</Label>
            <Petunjuk>{t("pengaturan.petunjukHapusSemuaData")}</Petunjuk>
          </div>
          <Tombol varian="bahaya" ukuran="kecil" onClick={() => setKonfirmasi(1)}>
            <Trash2Icon aria-hidden />
            {t("pengaturan.hapusSemuaData")}
          </Tombol>
        </div>

        <Lencana warna="netral">{t("pengaturan.lencanaBelumAdaCadangan")}</Lencana>
      </Kartu>

      <Dialog open={konfirmasi > 0} onOpenChange={(buka) => !buka && setKonfirmasi(0)}>
        <DialogKonten>
          <DialogKepala>
            <DialogJudul>
              {konfirmasi === 1
                ? t("pengaturan.judulKonfirmasiHapus")
                : t("pengaturan.judulKonfirmasiKedua")}
            </DialogJudul>
            <DialogDeskripsi>
              {konfirmasi === 1
                ? t("pengaturan.petunjukKonfirmasiHapus")
                : t("pengaturan.petunjukKonfirmasiKedua", { kata: KATA_KONFIRMASI })}
            </DialogDeskripsi>
          </DialogKepala>

          {konfirmasi === 2 && (
            <div className="mb-md grid gap-xs">
              <Label htmlFor="kata-konfirmasi">{t("pengaturan.labelKataKonfirmasi")}</Label>
              <Input
                id="kata-konfirmasi"
                value={kataKonfirmasi}
                onChange={(event) => setKataKonfirmasi(event.target.value)}
                placeholder={KATA_KONFIRMASI}
              />
            </div>
          )}

          {konfirmasi === 2 && (
            <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
              <div>
                <Label htmlFor="hapus-cadangan">{t("pengaturan.hapusBerkasCadangan")}</Label>
                <Petunjuk>{t("pengaturan.petunjukHapusBerkasCadangan")}</Petunjuk>
              </div>
              <Saklar
                aktif={hapusBerkas}
                label={t("pengaturan.hapusBerkasCadangan")}
                onUbah={setHapusBerkas}
              />
            </div>
          )}

          <DialogKaki>
            <Tombol varian="hantu" onClick={() => setKonfirmasi(0)}>
              {t("umum.batal")}
            </Tombol>
            {konfirmasi === 1 && (
              <Tombol varian="bahaya" onClick={() => setKonfirmasi(2)}>
                {t("umum.lanjut")}
              </Tombol>
            )}
            {konfirmasi === 2 && (
              <Tombol
                varian="bahaya"
                disabled={kataKonfirmasi !== KATA_KONFIRMASI}
                onClick={async () => {
                  const berkas = await kosongkanData(hapusBerkas);
                  if (berkas !== null) {
                    beriTahuBerhasil(
                      berkas > 0
                        ? t("pengaturan.hapusSelesaiTermasuk", { jumlah: berkas })
                        : t("pengaturan.hapusSelesai"),
                    );
                    setKonfirmasi(0);
                    setKataKonfirmasi("");
                    setHapusBerkas(false);
                  }
                }}
              >
                {t("pengaturan.hapusPermanen")}
              </Tombol>
            )}
          </DialogKaki>
        </DialogKonten>
      </Dialog>
    </div>
  );
}
