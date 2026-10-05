import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FolderIcon,
  FolderOpenIcon,
  InboxIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { useNavigasi } from "@/app/store/navigasi-store";
import { Tombol } from "@/components/ui/button";
import {
  Dialog,
  DialogDeskripsi,
  DialogJudul,
  DialogKaki,
  DialogKepala,
  DialogKonten,
  DialogKonfirmasi,
} from "@/components/ui/dialog";
import { FormNama } from "@/components/ui/inline-name-form";
import { Petunjuk } from "@/components/ui/label";
import { BATAS_PANJANG } from "@/features/prompts/types/prompt.types";
import { skemaFolder } from "@/features/prompts/types/prompt-skema";
import { terjemah, useTerjemah } from "@/lib/i18n";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";
import { gunakanFolders } from "../hooks/use-folders";
import type { AksiHapusFolder, Folder } from "../services/folder-service";

type PropertiDaftarFolder = {
  /** Dipanggil setelah pengguna memilih folder, misalnya untuk menutup drawer di mobile. */
  setelahPilih?: () => void;
  /** Dipanggil setiap daftar berubah (buat, ubah nama, hapus) agar statistik ikut dimuat ulang. */
  padaBerubah?: () => void;
  className?: string;
};

/** Penghapusan folder selalu dua langkah: tentukan tujuan prompt, lalu pastikan (PRD B1). */
type TargetHapus = { folder: Folder; aksi: AksiHapusFolder; tahap: "tujuan" | "pastikan" };
type FormUbah = { id: string; teks: string; pesan: string | null };
type FilterFolder = { folderId: string | null; tanpaFolder: boolean };

/** Ikon 20px di dalam baris daftar, sesuai peta ikonografi DESIGN.md. */
const IKON_BARIS = { className: "size-5 shrink-0", "aria-hidden": true } as const;

/** Helper di luar komponen React, jadi dibaca lewat `terjemah()`. Nilainya dipakai DialogKonfirmasi. */
function pesanHapusFolder(target: TargetHapus): string {
  const { folder, aksi } = target;
  if (folder.jumlahPrompt === 0) {
    return terjemah("pengorganisir.pesanHapusKosong");
  }
  return aksi === "pindahkan"
    ? terjemah("pengorganisir.pesanPindahTanpaFolder", { jumlah: folder.jumlahPrompt })
    : terjemah("pengorganisir.pesanPindahSampah", { jumlah: folder.jumlahPrompt });
}

/** Baris filter folder memakai pola nav-item: garis tepi transparan saat diam, garis tepi tinta
   plus bayangan blok saat aktif. Jadi state terpilih tidak hanya ditandai kuning. */
function BarisFilter({
  label,
  ikon,
  jumlah,
  aktif,
  onPilih,
}: {
  label: string;
  ikon: ReactNode;
  jumlah?: number;
  aktif: boolean;
  onPilih: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPilih}
      aria-current={aktif ? "true" : undefined}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-xs rounded-sm border-2 px-sm",
        "font-display text-label-md transition-[background-color,border-color,box-shadow,transform]",
        "duration-[120ms] ease-standard",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fokus",
        aktif
          ? "border-primary bg-tertiary text-on-tertiary shadow-elev-2"
          : "border-transparent text-on-surface hover:bg-surface-sunken",
      )}
    >
      {ikon}
      <span className="truncate">{label}</span>
      {jumlah !== undefined && (
        <span
          className={cn(
            "ml-auto shrink-0 text-body-sm",
            aktif ? "font-medium text-on-tertiary" : "text-secondary",
          )}
        >
          {jumlah}
        </span>
      )}
    </button>
  );
}

export function DaftarFolder({ setelahPilih, padaBerubah, className }: PropertiDaftarFolder) {
  const { t } = useTerjemah();
  const { daftar: folder, memuat, galat, muatUlang, buat, ubahNama, hapus } = gunakanFolders();
  const folderId = useNavigasi((s) => s.folderId);
  const tanpaFolder = useNavigasi((s) => s.tanpaFolder);
  const aturFilter = useNavigasi((s) => s.aturFilter);

  const [menambah, setMenambah] = useState(false);
  const [teksBaru, setTeksBaru] = useState("");
  const [pesanBaru, setPesanBaru] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [ubah, setUbah] = useState<FormUbah | null>(null);
  const [hapusTarget, setHapusTarget] = useState<TargetHapus | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const pilih = (filter: FilterFolder) => {
    aturFilter(filter);
    setelahPilih?.();
  };

  const simpanBaru = async () => {
    const nama = teksBaru.trim();
    const sah = skemaFolder.safeParse({ nama });
    if (!sah.success) {
      setPesanBaru(sah.error.issues[0]?.message ?? t("pengorganisir.namaFolderKosong"));
      return;
    }

    setMenyimpan(true);
    const hasil = await buat(nama);
    setMenyimpan(false);

    if (!hasil.berhasil) {
      setPesanBaru(hasil.pesan);
      return;
    }
    setMenambah(false);
    setTeksBaru("");
    setPesanBaru(null);
    beriTahuBerhasil(t("pengorganisir.folderDibuat", { nama }));
    padaBerubah?.();
  };

  const simpanUbah = async () => {
    if (!ubah) return;
    const nama = ubah.teks.trim();
    const sah = skemaFolder.safeParse({ nama });
    if (!sah.success) {
      setUbah({
        ...ubah,
        pesan: sah.error.issues[0]?.message ?? t("pengorganisir.namaFolderKosong"),
      });
      return;
    }

    setMenyimpan(true);
    const hasil = await ubahNama(ubah.id, nama);
    setMenyimpan(false);

    if (!hasil.berhasil) {
      setUbah({ ...ubah, pesan: hasil.pesan });
      return;
    }
    setUbah(null);
    beriTahuBerhasil(t("pengorganisir.folderDisimpan", { nama }));
    padaBerubah?.();
  };

  const mulaiHapus = (target: Folder) => {
    setUbah(null);
    setHapusTarget({
      folder: target,
      aksi: "pindahkan",
      tahap: target.jumlahPrompt > 0 ? "tujuan" : "pastikan",
    });
  };

  const konfirmasiHapus = async () => {
    if (!hapusTarget) return;
    const { folder: target, aksi } = hapusTarget;

    setMenghapus(true);
    const hasil = await hapus(target.id, aksi);
    setMenghapus(false);

    if (!hasil.berhasil) {
      beriTahuGalat(hasil.pesan ?? t("pengorganisir.folderGagalDihapus"));
      return;
    }
    if (folderId === target.id) aturFilter({ folderId: null, tanpaFolder: false });
    setHapusTarget(null);
    beriTahuBerhasil(t("pengorganisir.folderDihapus", { nama: target.nama }));
    padaBerubah?.();
  };

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <div className="flex items-center justify-between gap-xs">
        <h2 className="font-display text-label-md">{t("navigasi.folder")}</h2>
        <Tombol
          varian="sekunder"
          ukuran="ikon"
          aria-label={t("pengorganisir.buatFolderBaru")}
          onClick={() => {
            setMenambah((sekarang) => !sekarang);
            setPesanBaru(null);
          }}
        >
          <PlusIcon />
        </Tombol>
      </div>

      {menambah && (
        <FormNama
          idKolom="folder-baru"
          label={t("pengorganisir.namaFolderBaru")}
          nilai={teksBaru}
          maks={BATAS_PANJANG.namaFolderMaks}
          menyimpan={menyimpan}
          pesan={pesanBaru}
          onNilai={(nilai) => {
            setTeksBaru(nilai);
            setPesanBaru(null);
          }}
          onSimpan={() => void simpanBaru()}
          onBatal={() => {
            setMenambah(false);
            setTeksBaru("");
            setPesanBaru(null);
          }}
        />
      )}

      {galat && (
        <div className="flex flex-col gap-xs">
          <Petunjuk galat>{galat}</Petunjuk>
          <Tombol varian="sekunder" ukuran="kecil" onClick={() => void muatUlang()}>
            {t("pengorganisir.cobaLagi")}
          </Tombol>
        </div>
      )}

      {memuat && folder.length === 0 && (
        <div className="flex flex-col gap-xs" role="status">
          <p className="sr-only">{t("pengorganisir.memuatDaftarFolder")}</p>
          {[0, 1, 2].map((baris) => (
            <div
              key={baris}
              aria-hidden
              className="h-11 animate-pulse rounded-sm border-2 border-neutral bg-surface-sunken"
            />
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-xxs">
        <li className="flex items-center gap-xs">
          <BarisFilter
            label={t("pengorganisir.semuaPrompt")}
            ikon={<LayersIcon {...IKON_BARIS} />}
            aktif={folderId === null && !tanpaFolder}
            onPilih={() => pilih({ folderId: null, tanpaFolder: false })}
          />
        </li>
        <li className="flex items-center gap-xs">
          <BarisFilter
            label={t("umum.tanpaFolder")}
            ikon={<InboxIcon {...IKON_BARIS} />}
            aktif={tanpaFolder}
            onPilih={() => pilih({ folderId: null, tanpaFolder: true })}
          />
        </li>

        {folder.map((item) => {
          const aktif = !tanpaFolder && folderId === item.id;

          if (ubah?.id === item.id) {
            return (
              <li key={item.id}>
                <FormNama
                  idKolom={`folder-${item.id}`}
                  label={t("pengorganisir.ubahNamaFolder")}
                  nilai={ubah.teks}
                  maks={BATAS_PANJANG.namaFolderMaks}
                  menyimpan={menyimpan}
                  pesan={ubah.pesan}
                  onNilai={(nilai) => setUbah({ ...ubah, teks: nilai, pesan: null })}
                  onSimpan={() => void simpanUbah()}
                  onBatal={() => setUbah(null)}
                />
              </li>
            );
          }

          return (
            <li key={item.id} className="flex items-center gap-xs">
              <BarisFilter
                label={item.nama}
                jumlah={item.jumlahPrompt}
                ikon={aktif ? <FolderOpenIcon {...IKON_BARIS} /> : <FolderIcon {...IKON_BARIS} />}
                aktif={aktif}
                onPilih={() => pilih({ folderId: item.id, tanpaFolder: false })}
              />
              <Tombol
                varian="sekunder"
                ukuran="ikon"
                aria-label={t("pengorganisir.ubahNamaFolderAria", { nama: item.nama })}
                onClick={() => setUbah({ id: item.id, teks: item.nama, pesan: null })}
              >
                <PencilIcon />
              </Tombol>
              <Tombol
                varian="sekunder"
                ukuran="ikon"
                aria-label={t("pengorganisir.hapusFolderAria", { nama: item.nama })}
                onClick={() => mulaiHapus(item)}
              >
                <Trash2Icon />
              </Tombol>
            </li>
          );
        })}
      </ul>

      {!memuat && folder.length === 0 && !galat && (
        <p className="text-body-sm text-secondary">{t("pengorganisir.belumAdaFolder")}</p>
      )}

      {hapusTarget?.tahap === "tujuan" && (
        <Dialog open onOpenChange={(buka) => !buka && setHapusTarget(null)}>
          <DialogKonten>
            <DialogKepala>
              <DialogJudul>
                {t("pengorganisir.judulPromptDiFolder", {
                  jumlah: hapusTarget.folder.jumlahPrompt,
                  nama: hapusTarget.folder.nama,
                })}
              </DialogJudul>
              <DialogDeskripsi>{t("pengorganisir.deskripsiHapusFolder")}</DialogDeskripsi>
            </DialogKepala>
            <div className="flex flex-col gap-sm">
              <Tombol
                varian="sekunder"
                onClick={() =>
                  setHapusTarget({ ...hapusTarget, aksi: "pindahkan", tahap: "pastikan" })
                }
              >
                <InboxIcon /> {t("pengorganisir.pindahkanKeTanpaFolder")}
              </Tombol>
              <Tombol
                varian="sekunder"
                onClick={() =>
                  setHapusTarget({ ...hapusTarget, aksi: "pindahkan-ke-sampah", tahap: "pastikan" })
                }
              >
                <Trash2Icon /> {t("pengorganisir.pindahkanKeSampah")}
              </Tombol>
              <Petunjuk>{t("pengorganisir.catatanPromptSampah")}</Petunjuk>
            </div>
            <DialogKaki>
              <Tombol varian="hantu" onClick={() => setHapusTarget(null)}>
                {t("umum.batal")}
              </Tombol>
            </DialogKaki>
          </DialogKonten>
        </Dialog>
      )}

      <DialogKonfirmasi
        terbuka={hapusTarget?.tahap === "pastikan"}
        judul={t("pengorganisir.konfirmasiHapusFolder", {
          nama: hapusTarget?.folder.nama ?? "",
        })}
        pesan={hapusTarget ? pesanHapusFolder(hapusTarget) : ""}
        labelAksi={t("pengorganisir.hapusFolderAksi")}
        sedangProses={menghapus}
        onAksi={() => void konfirmasiHapus()}
        onTutup={() => setHapusTarget(null)}
      />
    </div>
  );
}
