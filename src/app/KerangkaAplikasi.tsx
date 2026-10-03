import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import {
  FolderTreeIcon,
  MoonIcon,
  SunIcon,
  MonitorIcon,
  SettingsIcon,
  Trash2Icon,
  LayoutGridIcon,
  MoveHorizontalIcon,
} from "lucide-react";

import { Tombol } from "@/components/ui/button";
import { HalamanKategori, DaftarFolder } from "@/features/folders";
import { DaftarTag } from "@/features/tags";
import { FormPrompt, HalamanDetail, HalamanKoleksi } from "@/features/prompts";
import { HalamanSampah } from "@/features/trash/components/halaman-sampah";
import { HalamanPengaturan, HalamanPrivasi, DaftarPintasan } from "@/features/settings";
import { HalamanTransfer } from "@/features/transfer";
import { LayarKunci } from "@/features/kunci";
import { LayarOnboarding } from "@/features/onboarding";
import { BilahAtasWidget, TampilanWidget, gunakanModeJendela } from "@/features/widget";
import {
  deteksiPlatform,
  sembunyikanWidget,
  terapkanTransparansi,
} from "@/features/widget/services/widget-service";
import { useNavigasi, type Layar } from "@/app/store/navigasi-store";
import { pasangPengamatKunci, pasangPengamatLatar, useKunci } from "@/app/store/kunci-store";
import { pasangPengamatSistem, usePengaturan } from "@/app/store/pengaturan-store";
import { gunakanPintasanAplikasi } from "@/app/hooks/use-pintasan";
import { gunakanBerkasImpor } from "@/app/hooks/use-berkas-impor";
import { gunakanRiwayatBack } from "@/app/hooks/use-riwayat-back";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { beriTahuGalat } from "@/lib/notifikasi";
import { cn } from "@/lib/utils";

/** Daftar aksi navigasi utama, dipakai sidebar desktop dan bilah bawah mobile. `kunci` menunjuk
   kelompok `navigasi` di sumber daya i18n; `kunciPendek` hanya untuk bilah bawah mobile, karena
   lima label panjang tidak muat di lebar 412 dp (terukur butuh 480 px dan item terakhir terpotong). */
const NAVIGASI: {
  layar: Layar["nama"];
  kunci: string;
  kunciPendek: string;
  ikon: typeof LayoutGridIcon;
}[] = [
  {
    layar: "koleksi",
    kunci: "navigasi.koleksi",
    kunciPendek: "navigasi.pendekKoleksi",
    ikon: LayoutGridIcon,
  },
  {
    layar: "kategori",
    kunci: "navigasi.folderTag",
    kunciPendek: "navigasi.pendekFolder",
    ikon: FolderTreeIcon,
  },
  {
    layar: "sampah",
    kunci: "navigasi.sampah",
    kunciPendek: "navigasi.pendekSampah",
    ikon: Trash2Icon,
  },
  {
    layar: "transfer",
    kunci: "navigasi.transfer",
    kunciPendek: "navigasi.pendekTransfer",
    ikon: MoveHorizontalIcon,
  },
  {
    layar: "pengaturan",
    kunci: "navigasi.pengaturan",
    kunciPendek: "navigasi.pendekPengaturan",
    ikon: SettingsIcon,
  },
];

function PapanLayar() {
  const layar = useNavigasi((s) => s.layarAktif());

  return (
    <AnimatePresence mode="wait" initial={false}>
      <div
        key={layar.nama + ("id" in layar ? layar.id : "")}
        className="flex min-h-0 flex-1 flex-col"
      >
        {layar.nama === "koleksi" && <HalamanKoleksi />}
        {layar.nama === "detail" && <HalamanDetail id={layar.id} />}
        {layar.nama === "form" && <FormPrompt id={layar.id} />}
        {layar.nama === "kategori" && <HalamanKategori />}
        {layar.nama === "sampah" && <HalamanSampah />}
        {layar.nama === "transfer" && <HalamanTransfer berkas={layar.berkas} />}
        {layar.nama === "pengaturan" && <HalamanPengaturan />}
        {layar.nama === "privasi" && <HalamanPrivasi />}
        {layar.nama === "bantuan" && <DaftarPintasan />}
        {layar.nama === "onboarding" && <LayarOnboarding />}
      </div>
    </AnimatePresence>
  );
}

/** Shell desktop: sidebar kiri tetap, area konten bento, bilah aksi di kanan atas. */
function KerangkaDesktop() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const ubahPengaturan = usePengaturan((s) => s.ubah);
  const pengaturan = usePengaturan((s) => s.pengaturan);
  const { masukWidget } = gunakanModeJendela();
  const layarAktif = navigasi.layarAktif().nama;
  const gelap = pengaturan?.tema === "gelap";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral">
      <aside className="hidden w-64 shrink-0 flex-col gap-md overflow-y-auto border-r-2 border-primary bg-neutral p-md md:flex lg:w-72">
        <div className="flex items-center gap-xs">
          <span className="grid size-9 place-items-center rounded-sm border-2 border-primary bg-primary font-display text-label-md text-on-primary shadow-elev-1">
            PS
          </span>
          <h1 className="font-display text-headline-sm">{t("navigasi.judul")}</h1>
        </div>

        <nav className="grid gap-xs">
          {NAVIGASI.map(({ layar, kunci, ikon: Ikon }) => (
            <Tombol
              key={layar}
              varian={layarAktif === layar ? "utama" : "hantu"}
              ukuran="kecil"
              rata="kiri"
              className={cn(layarAktif === layar && "shadow-elev-2")}
              onClick={() => navigasi.ganti({ nama: layar } as Layar)}
              aria-current={layarAktif === layar ? "page" : undefined}
            >
              <Ikon aria-hidden />
              {t(kunci)}
            </Tombol>
          ))}
        </nav>

        <div className="grid gap-xs border-t-2 border-primary pt-md">
          <span className="font-display text-label-sm uppercase tracking-[0.08em] text-secondary">
            {t("navigasi.folder")}
          </span>
          <DaftarFolder />
        </div>

        <div className="grid gap-xs border-t-2 border-primary pt-md">
          <span className="font-display text-label-sm uppercase tracking-[0.08em] text-secondary">
            {t("navigasi.tag")}
          </span>
          <DaftarTag />
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col gap-md p-md md:p-lg">
        <div className="hidden items-center justify-end gap-xs md:flex">
          <Tombol
            varian="sekunder"
            ukuran="ikonKecil"
            aria-label={t(gelap ? "navigasi.temaKeTerang" : "navigasi.temaKeGelap")}
            onClick={() => void ubahPengaturan({ tema: gelap ? "terang" : "gelap" })}
          >
            {gelap ? <SunIcon /> : <MoonIcon />}
          </Tombol>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => void masukWidget()}>
            <MonitorIcon aria-hidden />
            {t("navigasi.modeWidget")}
          </Tombol>
        </div>
        <PapanLayar />
      </main>
    </div>
  );
}

/** Shell mobile: satu kolom, navigasi bawah, tombol kembali di header. */
function KerangkaMobile() {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const layarAktif = navigasi.layarAktif().nama;

  return (
    <div className="cangkang-aman flex h-dvh w-screen flex-col overflow-hidden bg-neutral">
      <header className="flex items-center justify-between gap-xs border-b-2 border-primary bg-neutral px-md py-sm">
        <div className="flex items-center gap-xs">
          {navigasi.tumpukan.length > 1 && (
            <Tombol varian="hantu" ukuran="kecil" onClick={() => navigasi.kembali()}>
              {t("umum.kembali")}
            </Tombol>
          )}
          <h1 className="font-display text-headline-sm">{t("navigasi.judul")}</h1>
        </div>
        {layarAktif === "koleksi" && (
          <Tombol varian="utama" ukuran="kecil" onClick={() => navigasi.ke({ nama: "form" })}>
            {t("umum.baru")}
          </Tombol>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-md">
        <PapanLayar />
      </main>

      {/* Grid lima kolom sama lebar, bukan flex: tombol dasar memakai `shrink-0` sehingga
          `flex-1` tidak bisa menyusut dan baris meluber 68 px di layar 412 dp. `min-w-0` +
          `truncate` tetap dipasang sebagai jaring pengaman kalau label memanjang. */}
      <nav className="grid grid-cols-5 items-stretch gap-xxs overflow-hidden border-t-2 border-primary bg-surface px-xxs py-xs">
        {NAVIGASI.map(({ layar, kunciPendek, ikon: Ikon }) => (
          <Tombol
            key={layar}
            varian={layarAktif === layar ? "utama" : "hantu"}
            ukuran="navigasi"
            className="w-full min-w-0 flex-col"
            onClick={() => navigasi.ganti({ nama: layar } as Layar)}
            aria-current={layarAktif === layar ? "page" : undefined}
          >
            <Ikon aria-hidden />
            <span className="w-full truncate text-center">{t(kunciPendek)}</span>
          </Tombol>
        ))}
      </nav>
    </div>
  );
}

/** Shell widget: bingkai tebal, bilah atas bisa digeser, daftar ringkas satu kolom. */
function KerangkaWidget() {
  // Esc menyembunyikan widget selama tidak ada dialog yang terbuka. Dialog memakai Esc
  // untuk menutup dirinya sendiri lewat Radix, dan elemennya masih ada saat event ini jalan.
  useEffect(() => {
    const tekan = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"]')) return;
      void sembunyikanWidget().catch((mentah) => beriTahuGalat(pesanGalat(mentah)));
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  return (
    <div className="permukaan-widget flex h-screen w-screen flex-col overflow-hidden border-[3px] border-primary bg-surface">
      <BilahAtasWidget />
      <TampilanWidget modeWidget />
    </div>
  );
}

/** Layar tunggu singkat sebelum shell atau layar kunci dipilih. */
function LayarMuat() {
  const { t } = useTerjemah();
  return (
    <div className="grid h-screen w-screen place-items-center bg-neutral">
      <p className="font-display text-label-md text-secondary">{t("umum.muat")}</p>
    </div>
  );
}

export default function KerangkaAplikasi() {
  const muatPengaturan = usePengaturan((s) => s.muat);
  const sedangMuat = usePengaturan((s) => s.sedangMuat);
  const pengaturan = usePengaturan((s) => s.pengaturan);
  const muatKunci = useKunci((s) => s.muat);
  const statusKunci = useKunci((s) => s.status);
  const sedangMuatKunci = useKunci((s) => s.sedangMuat);
  const modeWidget = gunakanModeJendela().modeWidget;
  const platform = deteksiPlatform();
  const terkunci = Boolean(statusKunci?.terkunci);

  useEffect(() => {
    void muatKunci();
  }, [muatKunci]);

  // Pengaturan hanya dibaca setelah kunci terbuka; command-nya memang ditolak backend, dan
  // memanggilnya saat terkunci hanya memunculkan notifikasi galat di belakang layar kunci.
  useEffect(() => {
    if (terkunci) return;
    void muatPengaturan();
  }, [terkunci, muatPengaturan]);

  useEffect(() => {
    const lepasSistem = pasangPengamatSistem();
    const lepasLatar = pasangPengamatLatar();
    let lepasKunci = () => {};
    void pasangPengamatKunci().then((lepas) => {
      lepasKunci = lepas;
    });
    return () => {
      lepasSistem();
      lepasLatar();
      lepasKunci();
    };
  }, []);

  // Efek Acrylic dipasang saat start dan setiap kali slider berubah. Mobile tidak punya
  // jendela sehingga panggilannya dilewati di sana.
  const transparansi = pengaturan?.widgetTransparansi;
  useEffect(() => {
    if (transparansi === undefined || platform !== "desktop") return;
    void terapkanTransparansi(transparansi).catch((mentah) => beriTahuGalat(pesanGalat(mentah)));
  }, [transparansi, platform]);

  gunakanPintasanAplikasi(!terkunci);
  gunakanBerkasImpor(!terkunci);
  gunakanRiwayatBack(!terkunci);

  // Layar kunci diperiksa lebih dulu: shell tidak boleh sempat merender daftar apa pun, dan
  // pengaturan belum tentu sempat dimuat saat aplikasi menyala dalam keadaan terkunci.
  if (terkunci) return <LayarKunci />;
  if (sedangMuatKunci || sedangMuat) return <LayarMuat />;

  if (pengaturan && !pengaturan.onboardingSelesai && !modeWidget) {
    return <LayarOnboarding />;
  }

  // Mode widget hanya ada di desktop. Di ponsel kecil jendela aplikasi sendiri bisa lolos
  // ambang ukurannya, dan shell widget memanggil command khusus desktop yang tidak terdaftar
  // di mobile.
  if (modeWidget && platform === "desktop") return <KerangkaWidget />;

  return platform === "mobile" ? <KerangkaMobile /> : <KerangkaDesktop />;
}
