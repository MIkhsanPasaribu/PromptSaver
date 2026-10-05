import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { useNavigasi } from "@/app/store/navigasi-store";

import { lencanaVariants } from "@/components/ui/badge-variants";
import { Tombol } from "@/components/ui/button";
import { DialogKonfirmasi } from "@/components/ui/dialog";
import { FormNama } from "@/components/ui/inline-name-form";
import { Petunjuk } from "@/components/ui/label";
import {
  BATAS_PANJANG,
  WARNA_TAG,
  type Tag,
  type WarnaTag,
} from "@/features/prompts/types/prompt.types";
import { skemaTag } from "@/features/prompts/types/prompt-skema";
import { useTerjemah } from "@/lib/i18n";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";
import { gunakanTags } from "../hooks/use-tags";

type PropertiDaftarTag = {
  /** Halaman kategori menampilkan pengelolaan tag; sidebar cukup chip filternya saja. */
  dapatDikelola?: boolean;
  padaBerubah?: () => void;
  className?: string;
};

type DrafTag = { nama: string; warna: WarnaTag; pesan: string | null };

const FOKUS_CHIP =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fokus";

function ChipTag({ tag, aktif, onUbah }: { tag: Tag; aktif: boolean; onUbah: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onUbah}
      className={cn(
        lencanaVariants({ warna: tag.warna, terpilih: aktif, dapatDitekan: true }),
        FOKUS_CHIP,
      )}
    >
      {aktif && <CheckIcon className="size-4 shrink-0" aria-hidden />}
      <span className="truncate">{tag.nama}</span>
      <span className="shrink-0 tabular-nums">{tag.jumlahPrompt}</span>
    </button>
  );
}

/** Enam hue chip dari DESIGN.md, tidak ada warna lain yang boleh dibuat pengguna. */
function PemilihWarna({ warna, onWarna }: { warna: WarnaTag; onWarna: (warna: WarnaTag) => void }) {
  const { t } = useTerjemah();
  return (
    <div
      role="group"
      aria-label={t("pengorganisir.warnaTag")}
      className="flex flex-wrap items-center gap-xs"
    >
      {WARNA_TAG.map((kandidat) => {
        const dipilih = kandidat === warna;
        return (
          <button
            key={kandidat}
            type="button"
            aria-label={t("pengorganisir.warnaTagAria", { warna: kandidat })}
            aria-pressed={dipilih}
            onClick={() => onWarna(kandidat)}
            className={cn(
              lencanaVariants({ warna: kandidat, dapatDitekan: true }),
              "size-11 shrink-0 justify-center gap-0 px-0",
              dipilih && "border-[3px] shadow-elev-3",
              FOKUS_CHIP,
            )}
          >
            {dipilih && <CheckIcon className="size-5 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** Form inline tag: satu kolom nama plus pemilih warna. Backend tetap sumber kebenaran validasi. */
function FormTag({
  idKolom,
  label,
  draf,
  menyimpan,
  onDraf,
  onSimpan,
  onBatal,
}: {
  idKolom: string;
  label: string;
  draf: DrafTag;
  menyimpan: boolean;
  onDraf: (draf: DrafTag) => void;
  onSimpan: () => void;
  onBatal: () => void;
}) {
  const { t } = useTerjemah();

  return (
    <FormNama
      idKolom={idKolom}
      label={label}
      nilai={draf.nama}
      maks={BATAS_PANJANG.namaTagMaks}
      placeholder={t("pengorganisir.namaTag")}
      pesan={draf.pesan}
      menyimpan={menyimpan}
      onNilai={(nama) => onDraf({ ...draf, nama, pesan: null })}
      onSimpan={onSimpan}
      onBatal={onBatal}
      anak={<PemilihWarna warna={draf.warna} onWarna={(warna) => onDraf({ ...draf, warna })} />}
    />
  );
}

export function DaftarTag({ dapatDikelola = false, padaBerubah, className }: PropertiDaftarTag) {
  const { t } = useTerjemah();
  const { daftar: tags, memuat, galat, muatUlang, buat, ubah, hapus } = gunakanTags();
  const tagIds = useNavigasi((s) => s.tagIds);
  const aturFilter = useNavigasi((s) => s.aturFilter);

  const [menambah, setMenambah] = useState(false);
  const [drafBaru, setDrafBaru] = useState<DrafTag>({ nama: "", warna: "kuning", pesan: null });
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengubah, setMengubah] = useState<(DrafTag & { id: string }) | null>(null);
  const [hapusTarget, setHapusTarget] = useState<Tag | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  /** Backend yang menerapkan logika "semua tag cocok" untuk kombinasi tagIds (PRD B2). */
  const toggle = (id: string) => {
    aturFilter({
      tagIds: tagIds.includes(id) ? tagIds.filter((sekarang) => sekarang !== id) : [...tagIds, id],
    });
  };

  const simpanBaru = async () => {
    const nama = drafBaru.nama.trim();
    const sah = skemaTag.safeParse({ nama, warna: drafBaru.warna });
    if (!sah.success) {
      setDrafBaru({
        ...drafBaru,
        nama,
        pesan: sah.error.issues[0]?.message ?? t("pengorganisir.namaTagKosong"),
      });
      return;
    }

    setMenyimpan(true);
    const hasil = await buat(nama, drafBaru.warna);
    setMenyimpan(false);

    if (!hasil.berhasil) {
      setDrafBaru({ ...drafBaru, nama, pesan: hasil.pesan });
      return;
    }
    setMenambah(false);
    setDrafBaru({ nama: "", warna: "kuning", pesan: null });
    beriTahuBerhasil(t("pengorganisir.tagDibuat", { nama }));
    padaBerubah?.();
  };

  const simpanUbah = async () => {
    if (!mengubah) return;
    const nama = mengubah.nama.trim();
    const sah = skemaTag.safeParse({ nama, warna: mengubah.warna });
    if (!sah.success) {
      setMengubah({
        ...mengubah,
        nama,
        pesan: sah.error.issues[0]?.message ?? t("pengorganisir.namaTagKosong"),
      });
      return;
    }

    setMenyimpan(true);
    const hasil = await ubah(mengubah.id, nama, mengubah.warna);
    setMenyimpan(false);

    if (!hasil.berhasil) {
      setMengubah({ ...mengubah, nama, pesan: hasil.pesan });
      return;
    }
    setMengubah(null);
    beriTahuBerhasil(t("pengorganisir.tagDisimpan", { nama }));
    padaBerubah?.();
  };

  const konfirmasiHapus = async () => {
    if (!hapusTarget) return;
    const target = hapusTarget;

    setMenghapus(true);
    const hasil = await hapus(target.id);
    setMenghapus(false);

    if (!hasil.berhasil) {
      beriTahuGalat(hasil.pesan ?? t("pengorganisir.tagGagalDihapus"));
      return;
    }
    if (tagIds.includes(target.id)) {
      aturFilter({ tagIds: tagIds.filter((sekarang) => sekarang !== target.id) });
    }
    setHapusTarget(null);
    beriTahuBerhasil(t("pengorganisir.tagDihapus", { nama: target.nama }));
    padaBerubah?.();
  };

  return (
    <div className={cn("flex flex-col gap-sm", className)}>
      <div className="flex items-center justify-between gap-xs">
        <h2 className="font-display text-label-md">{t("navigasi.tag")}</h2>
        {dapatDikelola && (
          <Tombol
            varian="sekunder"
            ukuran="ikon"
            aria-label={t("pengorganisir.buatTagBaru")}
            onClick={() => {
              setMenambah((sekarang) => !sekarang);
              setDrafBaru({ nama: "", warna: "kuning", pesan: null });
            }}
          >
            <PlusIcon />
          </Tombol>
        )}
      </div>

      {dapatDikelola && menambah && (
        <FormTag
          idKolom="tag-baru"
          label={t("pengorganisir.namaTagBaru")}
          draf={drafBaru}
          menyimpan={menyimpan}
          onDraf={setDrafBaru}
          onSimpan={() => void simpanBaru()}
          onBatal={() => {
            setMenambah(false);
            setDrafBaru({ nama: "", warna: "kuning", pesan: null });
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

      {memuat && tags.length === 0 && (
        <div className="flex flex-wrap gap-xs" role="status">
          <p className="sr-only">{t("pengorganisir.memuatDaftarTag")}</p>
          {[0, 1, 2].map((baris) => (
            <div
              key={baris}
              aria-hidden
              className="h-7 w-24 animate-pulse rounded-sm border-2 border-neutral bg-surface-sunken"
            />
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <ul className="flex flex-col gap-xs">
          {tags.map((tag) => (
            <li key={tag.id} className="flex flex-col gap-xs">
              <div className="flex flex-wrap items-center gap-xs">
                <ChipTag tag={tag} aktif={tagIds.includes(tag.id)} onUbah={() => toggle(tag.id)} />
                {dapatDikelola && (
                  <div className="ml-auto flex items-center gap-xs">
                    <Tombol
                      varian="sekunder"
                      ukuran="ikon"
                      aria-label={t("pengorganisir.ubahTagAria", { nama: tag.nama })}
                      onClick={() =>
                        setMengubah({ id: tag.id, nama: tag.nama, warna: tag.warna, pesan: null })
                      }
                    >
                      <PencilIcon />
                    </Tombol>
                    <Tombol
                      varian="sekunder"
                      ukuran="ikon"
                      aria-label={t("pengorganisir.hapusTagAria", { nama: tag.nama })}
                      onClick={() => {
                        setMengubah(null);
                        setHapusTarget(tag);
                      }}
                    >
                      <Trash2Icon />
                    </Tombol>
                  </div>
                )}
              </div>

              {mengubah?.id === tag.id && (
                <FormTag
                  idKolom={`tag-${tag.id}`}
                  label={t("pengorganisir.ubahTagLabel")}
                  draf={mengubah}
                  menyimpan={menyimpan}
                  onDraf={(nilai) => setMengubah({ ...mengubah, ...nilai })}
                  onSimpan={() => void simpanUbah()}
                  onBatal={() => setMengubah(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!memuat && tags.length === 0 && !galat && (
        <p className="text-body-sm text-secondary">{t("pengorganisir.belumAdaTag")}</p>
      )}

      {tagIds.length > 0 && (
        <Tombol varian="hantu" ukuran="kecil" onClick={() => aturFilter({ tagIds: [] })}>
          {t("pengorganisir.lepasFilterTag")}
        </Tombol>
      )}

      <DialogKonfirmasi
        terbuka={hapusTarget !== null}
        judul={t("pengorganisir.konfirmasiHapusTag", { nama: hapusTarget?.nama ?? "" })}
        pesan={
          hapusTarget ? t("pengorganisir.pesanHapusTag", { jumlah: hapusTarget.jumlahPrompt }) : ""
        }
        labelAksi={t("pengorganisir.hapusTagAksi")}
        sedangProses={menghapus}
        onAksi={() => void konfirmasiHapus()}
        onTutup={() => setHapusTarget(null)}
      />
    </div>
  );
}
