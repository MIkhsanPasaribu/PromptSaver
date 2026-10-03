import { useEffect, useMemo, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  HardDriveIcon,
  RefreshCwIcon,
  TagsIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";

import { ChipPilih, Lencana } from "@/components/ui/badge";
import { Tombol } from "@/components/ui/button";
import { Kartu, JudulKartu } from "@/components/ui/card";
import { Label, Petunjuk } from "@/components/ui/label";
import { Tab, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daftarPrompt, statistikKoleksi } from "@/features/prompts/services/prompt-service";
import type { Prompt, Statistik } from "@/features/prompts/types/prompt.types";
import { AMBANG_BERKAS_BESAR, gunakanTransfer } from "@/features/transfer/hooks/use-transfer";
import { deteksiPlatform } from "@/features/widget/services/widget-service";
import {
  STRATEGI_IMPOR as STRATEGI,
  namaBerkasBaku,
  type CakupanEkspor,
  type StrategiKonflik,
} from "@/features/transfer/services/transfer-service";
import { useTerjemah } from "@/lib/i18n";
import { pesanGalat } from "@/lib/ipc";
import { ukuranBerkas } from "@/lib/format-waktu";
import { beriTahuBerhasil, beriTahuGalat } from "@/lib/notifikasi";

/** Daftar pilihan dibatasi supaya halaman tetap ringan pada koleksi besar (PRD Bagian 5).
    Nilai ini sama dengan `batas` bawaan command `daftar_prompt` di backend. */
const BATAS_DAFTAR_PILIHAN = 200;

/** Satu sumber penyaring berkas untuk dialog simpan dan dialog buka. */
const PENYARING_BERKAS = [{ name: "PromptSaver", extensions: ["promptsaver"] }];

/** Path folder tukar bisa panjang sekali; daftar tombol hanya menampilkan nama berkasnya. */
function namaBerkas(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Label dan catatan dibaca lewat kunci i18n saat render supaya bahasa bisa berganti tanpa
   mengubah pilihan yang ditawarkan. */
const CAKUPAN: { nilai: CakupanEkspor; kunciLabel: string; kunciCatatan: string }[] = [
  {
    nilai: "semua",
    kunciLabel: "transfer.cakupanSemua",
    kunciCatatan: "transfer.cakupanSemuaCatatan",
  },
  {
    nilai: "pilihan",
    kunciLabel: "transfer.cakupanPilihan",
    kunciCatatan: "transfer.cakupanPilihanCatatan",
  },
];

/** Kewajiban PRD Bagian 5: file ekspor tidak terenkripsi dan harus disampaikan ke pengguna. */
function PeringatanTeksPolos() {
  const { t } = useTerjemah();
  return (
    <div className="flex flex-wrap items-center gap-xs rounded-sm border-2 border-primary bg-surface-sunken p-sm">
      <TriangleAlertIcon className="size-5 shrink-0 text-warning" aria-hidden />
      <Lencana warna="netral">{t("transfer.tanpaEnkripsi")}</Lencana>
      <p className="min-w-52 flex-1 text-body-sm">{t("transfer.peringatanTeksPolos")}</p>
    </div>
  );
}

/** Satu angka ringkas pada blok pratinjau dan hasil. */
function Angka({ label, nilai }: { label: string; nilai: number | string }) {
  return (
    <div className="grid gap-xxs">
      <dt className="text-body-sm text-secondary">{label}</dt>
      <dd className="font-display text-headline-sm">{nilai}</dd>
    </div>
  );
}

export function HalamanTransfer({ berkas }: { berkas?: string }) {
  const {
    ringkasanEkspor,
    pratinjau,
    hasil,
    memuat,
    galat,
    eksporSemua,
    eksporPilihan,
    eksporKeFolder,
    berkasTukar,
    muatBerkasTukar,
    hitungPratinjau,
    jalankanImpor,
  } = gunakanTransfer();

  const { t } = useTerjemah();

  const [tab, setTab] = useState<"ekspor" | "impor">(berkas ? "impor" : "ekspor");
  // Mobile memakai folder tukar aplikasi karena dialog Android mengembalikan URI content
  // yang tidak dapat dibuka aplikasi (PRD D4).
  const mobile = deteksiPlatform() === "mobile";
  const [cakupan, setCakupan] = useState<CakupanEkspor>("semua");
  const [daftar, setDaftar] = useState<Prompt[]>([]);
  const [statusDaftar, setStatusDaftar] = useState<"diam" | "muat" | "siap">("diam");
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [namaAwal, setNamaAwal] = useState("");
  const [pathImpor, setPathImpor] = useState<string | null>(null);
  const [strategi, setStrategi] = useState<StrategiKonflik>("lewati-duplikat");
  /** Galat hook dipakai dua bagian; flag ini menentukan bagian mana yang menampilkannya. */
  const [bagianGalat, setBagianGalat] = useState<"ekspor" | "impor">("ekspor");

  const kotakSemua = useRef<HTMLInputElement>(null);

  // Berkas yang datang dari OS (PRD D2) langsung dihitung pratinjauannya dan tab Impor
  // dipilih, supaya pengguna melihat isinya sebelum memutuskan mengimpor.
  useEffect(() => {
    if (!berkas) return;
    setPathImpor(berkas);
    setBagianGalat("impor");
    setTab("impor");
    void hitungPratinjau(berkas);
  }, [berkas, hitungPratinjau]);

  // Nama berkas bawaan dan total koleksi diambil sekali saat halaman dibuka, sehingga
  // tombol "Ekspor" tidak perlu memanggil command apa pun saat dialog dibatalkan.
  useEffect(() => {
    namaBerkasBaku()
      .then(setNamaAwal)
      .catch(() => setNamaAwal(""));
    statistikKoleksi()
      .then(setStatistik)
      .catch((mentah: unknown) => setGalatMuat(pesanGalat(mentah)));
  }, []);

  // Daftar untuk mode "pilihan" baru dimuat saat pengguna membutuhkannya.
  useEffect(() => {
    if (cakupan !== "pilihan" || statusDaftar !== "diam") return;
    setStatusDaftar("muat");
    daftarPrompt({ batas: BATAS_DAFTAR_PILIHAN })
      .then(setDaftar)
      .catch((mentah: unknown) => setGalatMuat(pesanGalat(mentah)))
      .finally(() => setStatusDaftar("siap"));
  }, [cakupan, statusDaftar]);

  useEffect(() => {
    const elemen = kotakSemua.current;
    if (!elemen) return;
    elemen.indeterminate = terpilih.length > 0 && terpilih.length < daftar.length;
  }, [terpilih, daftar]);

  const ringkasan = useMemo(() => {
    if (cakupan === "semua") {
      if (!statistik) return null;
      return {
        prompt: statistik.jumlahPrompt,
        folder: statistik.jumlahFolder,
        tag: statistik.jumlahTag,
        catatan: t("transfer.perkiraanUkuran", {
          ukuran: ukuranBerkas(statistik.ukuranDatabaseKb * 1024),
        }),
      };
    }
    const isi = daftar.filter((prompt) => terpilih.includes(prompt.id));
    const daftarFolder = new Set(
      isi.map((prompt) => prompt.folderId).filter((id): id is string => id !== null),
    );
    const daftarTag = new Set(isi.flatMap((prompt) => prompt.tags.map((tag) => tag.id)));
    return {
      prompt: isi.length,
      folder: daftarFolder.size,
      tag: daftarTag.size,
      catatan: t("transfer.cakupanPilihanCatatan"),
    };
  }, [cakupan, statistik, daftar, terpilih, t]);

  const bolehEkspor = !memuat && Boolean(ringkasan && ringkasan.prompt > 0);

  const padaEkspor = async () => {
    setBagianGalat("ekspor");

    if (mobile) {
      const sukses = await eksporKeFolder(cakupan, cakupan === "pilihan" ? terpilih : []);
      if (sukses) {
        await muatBerkasTukar();
        beriTahuBerhasil(t("transfer.eksporSelesaiFolder"));
      }
      return;
    }

    let path: string | null = null;
    try {
      path = await save({
        title: t("transfer.dialogSimpan"),
        defaultPath: namaAwal || undefined,
        filters: PENYARING_BERKAS,
      });
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
      return;
    }
    // Pengguna membatalkan dialog simpan: tidak ada command yang dijalankan (PRD WF2).
    if (!path) return;

    const sukses =
      cakupan === "semua" ? await eksporSemua(path) : await eksporPilihan(path, terpilih);
    if (sukses) beriTahuBerhasil(t("transfer.eksporSelesai"));
  };

  /** Jalur mobile: berkas dipilih dari daftar isi folder tukar, bukan lewat dialog. */
  const padaPilihDariFolder = async (path: string) => {
    setBagianGalat("impor");
    setPathImpor(path);
    await hitungPratinjau(path);
  };

  useEffect(() => {
    if (mobile) void muatBerkasTukar();
  }, [mobile, muatBerkasTukar]);

  const padaPilihBerkas = async () => {
    setBagianGalat("impor");
    let path: string | null = null;
    try {
      path = await open({
        title: t("transfer.dialogPilih"),
        multiple: false,
        filters: PENYARING_BERKAS,
      });
    } catch (mentah) {
      beriTahuGalat(pesanGalat(mentah));
      return;
    }
    if (!path) return;

    setPathImpor(path);
    await hitungPratinjau(path);
  };

  const padaImpor = async () => {
    if (!pathImpor) return;
    setBagianGalat("impor");
    if (await jalankanImpor(pathImpor, strategi)) {
      beriTahuBerhasil(t("transfer.imporSelesai"));
      setPathImpor(null);
    }
  };

  const kunciCatatanStrategi = STRATEGI.find((opsi) => opsi.nilai === strategi)?.kunciCatatan ?? "";
  const kunciCatatanCakupan = CAKUPAN.find((opsi) => opsi.nilai === cakupan)?.kunciCatatan;
  const berkasBesar = Boolean(pratinjau && pratinjau.ukuranByte > AMBANG_BERKAS_BESAR);

  return (
    <section className="mx-auto grid w-full max-w-[1080px] gap-lg px-md">
      <header className="grid gap-xs">
        <h1 className="font-display text-headline-lg">{t("transfer.judul")}</h1>
        <p className="text-body-md text-secondary">{t("transfer.pengantar")}</p>
        <PeringatanTeksPolos />
      </header>

      <Tab value={tab} onValueChange={(nilai) => setTab(nilai as "ekspor" | "impor")}>
        <TabsList>
          <TabsTrigger value="ekspor">{t("transfer.tabEkspor")}</TabsTrigger>
          <TabsTrigger value="impor">{t("transfer.tabImpor")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ekspor" className="grid gap-md">
          <Kartu className="grid gap-md">
            <JudulKartu>{t("transfer.berkasEkspor")}</JudulKartu>

            <div role="group" aria-labelledby="label-cakupan" className="grid gap-xs">
              <Label id="label-cakupan">{t("transfer.labelCakupan")}</Label>
              <div className="flex flex-wrap gap-xs">
                {CAKUPAN.map((opsi) => (
                  <ChipPilih
                    key={opsi.nilai}
                    aktif={cakupan === opsi.nilai}
                    onUbah={() => setCakupan(opsi.nilai)}
                  >
                    {t(opsi.kunciLabel)}
                  </ChipPilih>
                ))}
              </div>
              <Petunjuk>{kunciCatatanCakupan ? t(kunciCatatanCakupan) : ""}</Petunjuk>
            </div>

            {cakupan === "pilihan" ? (
              <div className="grid gap-sm">
                <div className="flex items-center gap-sm">
                  <input
                    ref={kotakSemua}
                    id="pilih-semua"
                    type="checkbox"
                    className="size-5 shrink-0 cursor-pointer accent-primary"
                    checked={daftar.length > 0 && terpilih.length === daftar.length}
                    onChange={(event) =>
                      setTerpilih(event.target.checked ? daftar.map((prompt) => prompt.id) : [])
                    }
                    disabled={statusDaftar === "muat" || daftar.length === 0}
                  />
                  <Label htmlFor="pilih-semua">
                    <span className="font-body text-body-md">{t("transfer.pilihSemua")}</span>
                  </Label>
                </div>

                {statusDaftar === "muat" ? (
                  <p className="text-body-sm text-secondary">{t("transfer.memuatDaftar")}</p>
                ) : daftar.length === 0 ? (
                  <p className="text-body-sm text-secondary">{t("transfer.belumAdaPromptAktif")}</p>
                ) : (
                  <ul className="grid max-h-96 gap-xs overflow-y-auto">
                    {daftar.map((prompt) => {
                      const idKotak = `pilih-${prompt.id}`;
                      const potongan = prompt.potongan ?? prompt.isi.slice(0, 120);
                      return (
                        <li key={prompt.id} className="flex items-start gap-sm">
                          <input
                            id={idKotak}
                            type="checkbox"
                            className="mt-xxs size-5 shrink-0 cursor-pointer accent-primary"
                            checked={terpilih.includes(prompt.id)}
                            onChange={(event) =>
                              setTerpilih((sebelumnya) =>
                                event.target.checked
                                  ? [...sebelumnya, prompt.id]
                                  : sebelumnya.filter((id) => id !== prompt.id),
                              )
                            }
                          />
                          <Label
                            htmlFor={idKotak}
                            className="min-w-0 flex-1 font-body text-body-md"
                          >
                            <span className="block truncate">
                              {prompt.judul || t("transfer.tanpaJudul")}
                            </span>
                            <span className="block truncate text-body-sm text-secondary">
                              {potongan}
                              {prompt.namaFolder ? ` · ${prompt.namaFolder}` : ""}
                            </span>
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {daftar.length >= BATAS_DAFTAR_PILIHAN ? (
                  <Petunjuk>
                    {t("transfer.batasDaftar", {
                      batas: BATAS_DAFTAR_PILIHAN,
                      semua: t("transfer.cakupanSemua"),
                    })}
                  </Petunjuk>
                ) : null}
              </div>
            ) : null}

            {ringkasan ? (
              <dl className="grid grid-cols-3 gap-sm rounded-sm bg-surface-sunken p-sm">
                <Angka label={t("transfer.labelPrompt")} nilai={ringkasan.prompt} />
                <Angka label={t("transfer.labelFolder")} nilai={ringkasan.folder} />
                <Angka label={t("transfer.labelTag")} nilai={ringkasan.tag} />
              </dl>
            ) : (
              <p className="text-body-sm text-secondary">{t("transfer.menghitungIsi")}</p>
            )}

            {ringkasan ? <Petunjuk>{ringkasan.catatan}</Petunjuk> : null}

            {cakupan === "semua" && statistik && statistik.jumlahPrompt === 0 ? (
              <Petunjuk>{t("transfer.koleksiKosong")}</Petunjuk>
            ) : null}

            {bagianGalat === "ekspor" && galat ? (
              <div className="flex items-center gap-xs">
                <TriangleAlertIcon className="size-5 shrink-0 text-error" aria-hidden />
                <Petunjuk galat>{galat}</Petunjuk>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-sm">
              <Tombol onClick={padaEkspor} disabled={!bolehEkspor}>
                <DownloadIcon aria-hidden />
                {t("transfer.tombolEkspor")}
              </Tombol>
              {memuat ? (
                <span className="text-body-sm text-secondary">{t("transfer.memproses")}</span>
              ) : null}
            </div>
          </Kartu>

          {ringkasanEkspor ? (
            <Kartu className="grid gap-sm">
              <JudulKartu>{t("transfer.eksporBerhasil")}</JudulKartu>
              <div className="flex flex-wrap gap-xs">
                <Lencana warna="berhasil">
                  <FileTextIcon className="size-4" aria-hidden />
                  {t("transfer.hitungPrompt", { n: ringkasanEkspor.jumlahPrompt })}
                </Lencana>
                <Lencana warna="netral">
                  <FolderIcon className="size-4" aria-hidden />
                  {t("transfer.hitungFolder", { n: ringkasanEkspor.jumlahFolder })}
                </Lencana>
                <Lencana warna="netral">
                  <TagsIcon className="size-4" aria-hidden />
                  {t("transfer.hitungTag", { n: ringkasanEkspor.jumlahTag })}
                </Lencana>
                <Lencana warna="netral">
                  <HardDriveIcon className="size-4" aria-hidden />
                  {ukuranBerkas(ringkasanEkspor.ukuranByte)}
                </Lencana>
              </div>
              <p className="break-all text-body-sm text-secondary">
                {t("transfer.lokasiBerkas", { path: ringkasanEkspor.lokasi })}
              </p>
              <Petunjuk>{t("transfer.petunjukPindahkan")}</Petunjuk>
            </Kartu>
          ) : null}
        </TabsContent>

        <TabsContent value="impor" className="grid gap-md">
          <Kartu className="grid gap-md">
            <JudulKartu>{t("transfer.berkasImpor")}</JudulKartu>
            {mobile ? (
              <div className="grid gap-sm">
                <p className="text-body-sm text-secondary">
                  {t("transfer.salinBerkasDepan")}{" "}
                  <code className="font-code text-code-sm">.promptsaver</code>{" "}
                  {t("transfer.salinBerkasBelakang")}
                </p>
                <p className="break-all rounded-sm border-2 border-primary bg-surface-sunken p-xs font-code text-code-sm">
                  {berkasTukar?.folder ?? t("transfer.memuatFolder")}
                </p>
                <div className="flex flex-wrap items-center gap-xs">
                  <Tombol
                    varian="sekunder"
                    ukuran="kecil"
                    disabled={memuat}
                    onClick={() => void muatBerkasTukar()}
                  >
                    <RefreshCwIcon aria-hidden />
                    {t("transfer.muatUlang")}
                  </Tombol>
                  {(berkasTukar?.berkas ?? []).map((path) => (
                    <Tombol
                      key={path}
                      varian={pathImpor === path ? "utama" : "hantu"}
                      ukuran="kecil"
                      onClick={() => void padaPilihDariFolder(path)}
                    >
                      {namaBerkas(path)}
                    </Tombol>
                  ))}
                </div>
                {berkasTukar && berkasTukar.berkas.length === 0 ? (
                  <Petunjuk>{t("transfer.belumAdaBerkas")}</Petunjuk>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-sm">
                <Tombol varian="sekunder" onClick={padaPilihBerkas} disabled={memuat}>
                  <FileTextIcon aria-hidden />
                  {t("transfer.pilihBerkas")}
                </Tombol>
                {pathImpor ? (
                  <span className="min-w-0 break-all text-body-sm text-secondary">{pathImpor}</span>
                ) : (
                  <span className="text-body-sm text-secondary">
                    {t("transfer.belumAdaBerkasDipilih")}
                  </span>
                )}
              </div>
            )}

            {pratinjau ? (
              <>
                <dl className="grid grid-cols-2 gap-sm rounded-sm bg-surface-sunken p-sm md:grid-cols-3">
                  <Angka label={t("transfer.labelPrompt")} nilai={pratinjau.jumlahPrompt} />
                  <Angka label={t("transfer.labelFolder")} nilai={pratinjau.jumlahFolder} />
                  <Angka label={t("transfer.labelTag")} nilai={pratinjau.jumlahTag} />
                  <Angka label={t("transfer.labelBentrok")} nilai={pratinjau.bentrok} />
                  <Angka
                    label={t("transfer.labelUkuranBerkas")}
                    nilai={ukuranBerkas(pratinjau.ukuranByte)}
                  />
                  <Angka label={t("transfer.labelVersiSkema")} nilai={pratinjau.versiSkema} />
                </dl>
                {berkasBesar ? (
                  <div className="flex items-center gap-xs">
                    <TriangleAlertIcon className="size-5 shrink-0 text-warning" aria-hidden />
                    <Petunjuk>{t("transfer.berkasBesar")}</Petunjuk>
                  </div>
                ) : null}
                {pratinjau.bentrok > 0 ? (
                  <Petunjuk>{t("transfer.bentrokPetunjuk", { n: pratinjau.bentrok })}</Petunjuk>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-secondary">
                {t("transfer.pilihBerkasImporDepan")}{" "}
                <code className="font-code text-code-sm">.promptsaver</code>{" "}
                {t("transfer.pilihBerkasImporBelakang")}
              </p>
            )}
          </Kartu>

          {pratinjau ? (
            <Kartu className="grid gap-sm">
              <JudulKartu>{t("transfer.saatBentrok")}</JudulKartu>
              <div role="group" aria-labelledby="label-strategi" className="grid gap-xs">
                <Label id="label-strategi">{t("transfer.labelStrategiKonflik")}</Label>
                <div className="flex flex-wrap gap-xs">
                  {STRATEGI.map((opsi) => (
                    <ChipPilih
                      key={opsi.nilai}
                      aktif={strategi === opsi.nilai}
                      onUbah={() => setStrategi(opsi.nilai)}
                    >
                      {t(opsi.kunciLabel)}
                    </ChipPilih>
                  ))}
                </div>
                <Petunjuk>{kunciCatatanStrategi ? t(kunciCatatanStrategi) : ""}</Petunjuk>
              </div>

              {bagianGalat === "impor" && galat ? (
                <div className="flex items-center gap-xs">
                  <TriangleAlertIcon className="size-5 shrink-0 text-error" aria-hidden />
                  <Petunjuk galat>{galat}</Petunjuk>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-sm">
                <Tombol onClick={padaImpor} disabled={memuat}>
                  <UploadIcon aria-hidden />
                  {t("transfer.tombolImpor")}
                </Tombol>
                {memuat ? (
                  <span className="text-body-sm text-secondary">{t("transfer.mengimpor")}</span>
                ) : null}
              </div>
            </Kartu>
          ) : null}

          {hasil ? (
            <Kartu className="grid gap-sm">
              <JudulKartu>{t("transfer.hasilImpor")}</JudulKartu>
              <dl className="grid grid-cols-2 gap-sm md:grid-cols-4">
                <Angka label={t("transfer.labelDitambah")} nilai={hasil.ditambah} />
                <Angka label={t("transfer.labelDitimpa")} nilai={hasil.ditimpa} />
                <Angka label={t("transfer.labelDilewati")} nilai={hasil.dilewati} />
                <Angka label={t("transfer.labelGagal")} nilai={hasil.gagal} />
              </dl>
              {hasil.gagal > 0 ? <Petunjuk galat>{t("transfer.gagalPetunjuk")}</Petunjuk> : null}
              {hasil.pesan.length > 0 ? (
                <ul className="grid gap-xxs rounded-sm bg-surface-sunken p-sm">
                  {hasil.pesan.map((pesan) => (
                    <li key={pesan} className="text-body-sm">
                      {pesan}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Petunjuk>{t("transfer.transaksiPetunjuk")}</Petunjuk>
            </Kartu>
          ) : null}
        </TabsContent>
      </Tab>

      {galatMuat ? (
        <p role="alert" className="text-body-sm text-error">
          {galatMuat}
        </p>
      ) : null}
    </section>
  );
}
