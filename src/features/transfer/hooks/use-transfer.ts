import { useCallback, useState } from "react";

import {
  eksporKoleksi,
  eksporKeFolder as eksporKeFolderService,
  daftarBerkasEkspor,
  imporKoleksi,
  pratinjauImpor,
  type CakupanEkspor,
  type DaftarBerkasEkspor,
  type PratinjauImpor,
  type RingkasanEkspor,
  type RingkasanImpor,
  type StrategiKonflik,
} from "@/features/transfer/services/transfer-service";
import { pesanGalat } from "@/lib/ipc";

/**
 * State alur ekspor dan impor (PRD Modul D, Workflow Kritikal 2).
 * Semua command dipanggil di sini; komponen hanya mengurus tampilan.
 */
export type KeadaanTransfer = {
  /** Ringkasan file yang baru saja ditulis, atau null bila belum ada ekspor. */
  ringkasanEkspor: RingkasanEkspor | null;
  /** Isi berkas yang siap diimpor, atau null bila belum ada berkas dipilih. */
  pratinjau: PratinjauImpor | null;
  /** Ringkasan hasil impor terakhir. */
  hasil: RingkasanImpor | null;
  /** true selama satu command berjalan. */
  memuat: boolean;
  /** Pesan galat Bahasa Indonesia, tampil inline di bawah aksi terkait. */
  galat: string | null;
  eksporSemua: (path: string) => Promise<boolean>;
  eksporPilihan: (path: string, ids: string[]) => Promise<boolean>;
  /** Ekspor ke folder tukar aplikasi, jalur mobile. */
  eksporKeFolder: (cakupan: CakupanEkspor, ids: string[]) => Promise<boolean>;
  berkasTukar: DaftarBerkasEkspor | null;
  muatBerkasTukar: () => Promise<void>;
  hitungPratinjau: (path: string) => Promise<boolean>;
  jalankanImpor: (path: string, strategi: StrategiKonflik) => Promise<boolean>;
};

/**
 * Impor dianggap "berkas terlalu besar" di atas ambang ini supaya pengguna mendapat
 * peringatan sebelum diproses (PRD Workflow Kritikal 2 langkah gagal). Batas keras
 * tetap dijaga backend lewat `UKURAN_BERKAS_MAKS`.
 */
export const AMBANG_BERKAS_BESAR = 20 * 1024 * 1024;

export function gunakanTransfer(): KeadaanTransfer {
  const [ringkasanEkspor, setRingkasanEkspor] = useState<RingkasanEkspor | null>(null);
  const [pratinjau, setPratinjau] = useState<PratinjauImpor | null>(null);
  const [hasil, setHasil] = useState<RingkasanImpor | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  /** Satu jalur untuk semua command: atur state muat, tangkap galat, petakan ke pesan
     ramah lewat `pesanGalat`. Mengembalikan true agar pemanggil bisa memberi umpan balik
     sukses tanpa membaca state secara async. */
  const jalankan = useCallback(
    async <T>(aksi: () => Promise<T>, simpan: (data: T) => void): Promise<boolean> => {
      setMemuat(true);
      setGalat(null);
      try {
        simpan(await aksi());
        return true;
      } catch (mentah) {
        setGalat(pesanGalat(mentah));
        return false;
      } finally {
        setMemuat(false);
      }
    },
    [],
  );

  const [berkasTukar, setBerkasTukar] = useState<DaftarBerkasEkspor | null>(null);

  const eksporSemua = useCallback(
    (path: string) =>
      jalankan(
        () => eksporKoleksi(path, "semua", []),
        (data) => setRingkasanEkspor(data),
      ),
    [jalankan],
  );

  const eksporPilihan = useCallback(
    (path: string, ids: string[]) => {
      // Menjaga kontrak command: backend menolak cakupan "pilihan" tanpa id.
      if (ids.length === 0) {
        setGalat("Pilih minimal satu prompt sebelum mengekspor.");
        return Promise.resolve(false);
      }
      return jalankan(
        () => eksporKoleksi(path, "pilihan", ids),
        (data) => setRingkasanEkspor(data),
      );
    },
    [jalankan],
  );

  const eksporKeFolder = useCallback(
    (cakupan: CakupanEkspor, ids: string[]) =>
      jalankan(
        () => eksporKeFolderService(cakupan, ids),
        (data) => setRingkasanEkspor(data),
      ),
    [jalankan],
  );

  const muatBerkasTukar = useCallback(async () => {
    try {
      setBerkasTukar(await daftarBerkasEkspor());
    } catch (mentah) {
      setGalat(pesanGalat(mentah));
    }
  }, []);

  const hitungPratinjau = useCallback(
    (path: string) =>
      jalankan(
        () => pratinjauImpor(path),
        (data) => {
          // Berkas baru membatalkan hasil impor sebelumnya.
          setHasil(null);
          setPratinjau(data);
        },
      ),
    [jalankan],
  );

  const jalankanImpor = useCallback(
    (path: string, strategi: StrategiKonflik) =>
      jalankan(
        () => imporKoleksi(path, strategi),
        (data) => {
          setHasil(data);
          // Pratinjau dibuang supaya berkas yang sama tidak diimpor dua kali; pengguna
          // harus memilih berkas lagi.
          setPratinjau(null);
        },
      ),
    [jalankan],
  );

  return {
    ringkasanEkspor,
    pratinjau,
    hasil,
    memuat,
    galat,
    berkasTukar,
    eksporSemua,
    eksporPilihan,
    eksporKeFolder,
    muatBerkasTukar,
    hitungPratinjau,
    jalankanImpor,
  };
}
