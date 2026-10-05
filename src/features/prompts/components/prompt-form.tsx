import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, SaveIcon, XIcon } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";

import { Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
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
import { MenuTombol } from "@/components/ui/menu";
import { AreaTeks } from "@/components/ui/textarea";
import { gunakanFolders } from "@/features/folders";
import { gunakanTags } from "@/features/tags";
import {
  ambilDrafPrompt,
  ambilPrompt,
  buatPrompt,
  buangDrafPrompt,
  simpanDrafPrompt,
  ubahPrompt,
} from "@/features/prompts/services/prompt-service";
import { skemaPrompt, type FormPrompt } from "@/features/prompts/types/prompt-skema";
import type { DataPrompt, TagBaru, WarnaTag } from "@/features/prompts/types/prompt.types";
import { useNavigasi } from "@/app/store/navigasi-store";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";

const WARNA_BARU: WarnaTag[] = ["kuning", "hijau", "cyan", "pink", "lavender", "oranye"];

/** Kelas ditulis lengkap supaya Tailwind menyediakannya, bukan hasil susunan string. */
const KELAS_SWATCH: Record<WarnaTag, string> = {
  kuning: "bg-chip-kuning",
  hijau: "bg-chip-hijau",
  cyan: "bg-chip-cyan",
  pink: "bg-chip-pink",
  lavender: "bg-chip-lavender",
  oranye: "bg-chip-oranye",
};

const JEDA_DRAF_MS = 800;

const kosong: FormPrompt = { judul: "", isi: "", folderId: null, tagIds: [], tagBaru: [] };

function ubahKeData(isi: FormPrompt): DataPrompt {
  return {
    judul: (isi.judul ?? "").trim() || null,
    isi: isi.isi,
    folderId: isi.folderId ?? null,
    tagIds: isi.tagIds ?? [],
    tagBaru: (isi.tagBaru ?? []).filter((tag) => tag.nama.trim().length > 0),
  };
}

/** A1 dan A2. Validasi client mempercepat umpan balik, Rust tetap memvalidasi ulang. */
export function FormPrompt({ id }: { id?: string }) {
  const navigasi = useNavigasi();
  const { t } = useTerjemah();
  const { daftar: folders } = gunakanFolders();
  const { daftar: tags } = gunakanTags();

  const [teksTag, setTeksTag] = useState("");
  const [warnaTag, setWarnaTag] = useState<WarnaTag>("kuning");
  const [drafPulih, setDrafPulih] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const jedaDraf = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormPrompt>({
    resolver: zodResolver(skemaPrompt) as Resolver<FormPrompt> as Resolver<FormPrompt>,
    defaultValues: kosong,
    mode: "onBlur",
  });

  const nilai = watch();

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        if (id) {
          const prompt = await ambilPrompt(id);
          if (batal) return;
          reset({
            judul: prompt.judul,
            isi: prompt.isi,
            folderId: prompt.folderId,
            tagIds: prompt.tags.map((tag) => tag.id),
            tagBaru: [],
          });
          return;
        }
        const draf = await ambilDrafPrompt();
        if (batal || (!draf.judul && !draf.isi)) return;
        reset({
          judul: draf.judul,
          isi: draf.isi,
          folderId: draf.folderId,
          tagIds: draf.tagIds,
          tagBaru: [],
        });
        setDrafPulih(true);
      } catch (mentah) {
        if (!batal) setGalatSimpan(pesanGalat(mentah));
      }
    })();
    return () => {
      batal = true;
    };
  }, [id, reset]);

  // Draf otomatis hanya untuk prompt baru, supaya suntingan tidak menimpa draf.
  useEffect(() => {
    if (id || (!nilai.isi && !nilai.judul)) return;
    if (jedaDraf.current) clearTimeout(jedaDraf.current);
    jedaDraf.current = setTimeout(() => {
      void simpanDrafPrompt(ubahKeData(nilai)).catch(() => undefined);
    }, JEDA_DRAF_MS);
    return () => {
      if (jedaDraf.current) clearTimeout(jedaDraf.current);
    };
  }, [id, nilai]);

  const usulTag = useMemo(() => {
    const kata = teksTag.trim().toLowerCase();
    return tags
      .filter((tag) => !nilai.tagIds.includes(tag.id))
      .filter((tag) => (kata ? tag.nama.toLowerCase().includes(kata) : false))
      .slice(0, 5);
  }, [tags, teksTag, nilai.tagIds]);

  const tagTerpilih = nilai.tagIds
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  const gantiTagIds = (tagIds: string[]) => setValue("tagIds", tagIds, { shouldDirty: true });
  const gantiTagBaru = (tagBaru: TagBaru[]) => setValue("tagBaru", tagBaru, { shouldDirty: true });

  const tambahTag = (teks: string) => {
    const nama = teks.trim();
    if (!nama) return;
    const sudahAda = tags.find((tag) => tag.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) {
      if (!nilai.tagIds.includes(sudahAda.id)) gantiTagIds([...nilai.tagIds, sudahAda.id]);
    } else if (!nilai.tagBaru.some((tag) => tag.nama.toLowerCase() === nama.toLowerCase())) {
      gantiTagBaru([...nilai.tagBaru, { nama, warna: warnaTag }]);
    }
    setTeksTag("");
  };

  const simpan = handleSubmit(async (isi) => {
    setGalatSimpan(null);
    try {
      const data = ubahKeData(isi);
      const hasil = id ? await ubahPrompt(id, data) : await buatPrompt(data);
      if (!id) await buangDrafPrompt().catch(() => undefined);
      navigasi.ganti({ nama: "detail", id: hasil.id });
    } catch (mentah) {
      setGalatSimpan(pesanGalat(mentah));
    }
  });

  const namaFolder =
    folders.find((folder) => folder.id === nilai.folderId)?.nama ?? t("umum.tanpaFolder");

  return (
    <form className="flex min-h-0 flex-1 flex-col gap-md" onSubmit={simpan} noValidate>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Tombol
          varian="hantu"
          ukuran="kecil"
          type="button"
          onClick={() => (isDirty ? setKonfirmasiKeluar(true) : navigasi.kembali())}
        >
          <ArrowLeftIcon aria-hidden />
          {t("umum.batal")}
        </Tombol>
        <Tombol type="submit" disabled={isSubmitting}>
          <SaveIcon aria-hidden />
          {id ? t("prompt.simpanPerubahan") : t("prompt.simpanPrompt")}
        </Tombol>
      </div>

      {drafPulih && (
        <p className="border-2 border-primary bg-surface-sunken p-sm text-body-sm" role="status">
          {t("prompt.drafDipulihkan")}
        </p>
      )}

      {galatSimpan && (
        <p className="border-2 border-error bg-error-tint p-sm text-body-sm" role="alert">
          {galatSimpan} {t("prompt.drafMasihTersimpan")}
        </p>
      )}

      <div className="grid gap-xs">
        <Label htmlFor="judul">{t("prompt.judulOpsional")}</Label>
        <Input id="judul" placeholder={t("prompt.judulPetunjuk")} {...register("judul")} />
        <Petunjuk galat={Boolean(errors.judul)}>{errors.judul?.message}</Petunjuk>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-xs">
        <Label htmlFor="isi">{t("prompt.isiPrompt")}</Label>
        <AreaTeks
          id="isi"
          className="min-h-64 flex-1 font-code text-code-md"
          placeholder={t("prompt.isiPetunjuk")}
          aria-invalid={Boolean(errors.isi)}
          {...register("isi")}
        />
        <Petunjuk galat={Boolean(errors.isi)}>
          {errors.isi?.message ?? t("prompt.karakterHitung", { jumlah: nilai.isi.length })}
        </Petunjuk>
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        <MenuTombol
          labelAria={t("prompt.pilihFolder")}
          pemicu={namaFolder}
          item={[
            {
              label: t("umum.tanpaFolder"),
              onPilih: () => setValue("folderId", null, { shouldDirty: true }),
            },
            ...folders.map((folder) => ({
              label: folder.nama,
              onPilih: () => setValue("folderId", folder.id, { shouldDirty: true }),
            })),
          ]}
        />
        <span className="text-body-sm text-secondary">{t("prompt.labelFolder")}</span>
      </div>

      <div className="grid gap-xs">
        <span className="font-display text-label-md">{t("prompt.labelTag")}</span>

        <div className="flex flex-wrap items-center gap-xs">
          {tagTerpilih.map((tag) => (
            <Lencana key={tag.id} warna={tag.warna}>
              <span className="inline-flex items-center gap-1">
                {tag.nama}
                <button
                  type="button"
                  className="cursor-pointer inline-flex"
                  aria-label={t("prompt.hapusTag", { nama: tag.nama })}
                  onClick={() => gantiTagIds(nilai.tagIds.filter((s) => s !== tag.id))}
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              </span>
            </Lencana>
          ))}
          {nilai.tagBaru.map((tag, indeks) => (
            <Lencana key={tag.nama} warna={(tag.warna ?? "kuning") as WarnaTag}>
              <span className="inline-flex items-center gap-1">
                {tag.nama}
                <button
                  type="button"
                  className="cursor-pointer inline-flex"
                  aria-label={t("prompt.buangTagBaru", { nama: tag.nama })}
                  onClick={() => gantiTagBaru(nilai.tagBaru.filter((_, i) => i !== indeks))}
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              </span>
            </Lencana>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-xs">
          <Input
            id="tag-baru"
            className="max-w-56"
            list="senarai-tag"
            placeholder={t("prompt.tagPetunjuk")}
            value={teksTag}
            onChange={(event) => setTeksTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              tambahTag(teksTag);
            }}
            aria-label={t("prompt.tambahTag")}
          />
          <Tombol type="button" varian="sekunder" ukuran="kecil" onClick={() => tambahTag(teksTag)}>
            {t("prompt.tambahTag")}
          </Tombol>
        </div>

        <datalist id="senarai-tag">
          {usulTag.map((tag) => (
            <option key={tag.id} value={tag.nama} />
          ))}
        </datalist>

        <div className="flex flex-wrap items-center gap-xs">
          <span className="text-body-sm text-secondary">{t("prompt.warnaTagBaru")}</span>
          {WARNA_BARU.map((warna) => (
            <button
              key={warna}
              type="button"
              aria-label={t("prompt.pakaiWarna", { warna })}
              aria-pressed={warnaTag === warna}
              onClick={() => setWarnaTag(warna)}
              className={`size-7 cursor-pointer rounded-sm border-2 border-primary ${KELAS_SWATCH[warna]}`}
            />
          ))}
        </div>
      </div>

      <Dialog open={konfirmasiKeluar} onOpenChange={(buka) => !buka && setKonfirmasiKeluar(false)}>
        <DialogKonten>
          <DialogKepala>
            <DialogJudul>{t("prompt.perubahanBelumTersimpan")}</DialogJudul>
            <DialogDeskripsi>{t("prompt.perubahanBelumTersimpanPesan")}</DialogDeskripsi>
          </DialogKepala>
          <DialogKaki>
            <Tombol varian="hantu" type="button" onClick={() => setKonfirmasiKeluar(false)}>
              {t("prompt.lanjutMengetik")}
            </Tombol>
            <Tombol
              varian="sekunder"
              type="button"
              onClick={async () => {
                setKonfirmasiKeluar(false);
                if (!id) await buangDrafPrompt().catch(() => undefined);
                navigasi.kembali();
              }}
            >
              {t("prompt.buang")}
            </Tombol>
            <Tombol type="button" onClick={() => void simpan()}>
              {t("umum.simpan")}
            </Tombol>
          </DialogKaki>
        </DialogKonten>
      </Dialog>
    </form>
  );
}
