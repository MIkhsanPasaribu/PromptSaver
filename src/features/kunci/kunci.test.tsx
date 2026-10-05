import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LayarKunci } from "@/features/kunci/components/lock-screen";
import { KartuKunci } from "@/features/kunci/components/lock-card";
import type { StatusKunci } from "@/features/kunci/services/kunci-service";
import { galatPin } from "@/features/kunci/types/kunci-skema";
import { useKunci } from "@/app/store/kunci-store";

const { panggil } = vi.hoisted(() => ({ panggil: vi.fn() }));

vi.mock("@/lib/ipc", () => ({
  panggil: (command: string, argumen?: Record<string, unknown>) => panggil(command, argumen),
  pesanGalat: (mentah: unknown) => String(mentah),
  kodeGalat: () => "validasi",
  GalatAplikasi: class extends Error {},
}));
vi.mock("@/lib/notifikasi", () => ({
  beriTahuBerhasil: vi.fn(),
  beriTahuGalat: vi.fn(),
  beriTahuTersalin: vi.fn(),
  beriTahuPeringatan: vi.fn(),
}));

const PIN_BENAR = "4321";

/** Semua fixture berbahasa Indonesia karena `src/test/setup.ts` mengunci bahasa uji ke "id".
   Status yang dikembalikan tiruan juga harus "id": store menerapkan bahasa dari status, dan satu
   fixture berbahasa Inggris akan membuat test berikutnya mencari teks yang salah. */
function status(bagian: Partial<StatusKunci> = {}): StatusKunci {
  return {
    aktif: true,
    terkunci: true,
    blokirSisa: 0,
    jedaDetik: 60,
    biometrikTersedia: false,
    bahasa: "id",
    tema: "ikut-sistem",
    kurangiAnimasi: false,
    ...bagian,
  };
}

let statusAwal = status();

/** Command di luar daftar ini dibuat gagal supaya test menangkap kebocoran: layar kunci tidak
   boleh memanggil apa pun yang menyentuh isi koleksi. */
function jalankan(command: string, argumen?: Record<string, unknown>): StatusKunci {
  switch (command) {
    case "status_kunci":
      return statusAwal;
    case "buka_kunci":
      return status({ terkunci: argumen?.pin !== PIN_BENAR });
    case "setel_kunci":
      return status({ aktif: true, terkunci: false });
    case "buka_kunci_biometrik":
      return status({ terkunci: false, biometrikTersedia: true });
    default:
      throw new Error(`command tak terduga saat terkunci: ${command}`);
  }
}

describe("LayarKunci", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusAwal = status();
    useKunci.setState({ status: statusAwal, sedangMuat: false });
    panggil.mockImplementation((command: string, argumen?: Record<string, unknown>) =>
      Promise.resolve(jalankan(command, argumen)),
    );
  });

  it("menolak PIN salah tanpa memanggil command data", async () => {
    render(<LayarKunci />);

    fireEvent.change(screen.getByLabelText("Kode PIN"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Buka kunci" }));

    expect(await screen.findByText(/tidak cocok/)).toBeTruthy();
    expect(panggil).toHaveBeenCalledWith("buka_kunci", { pin: "0000" });
    expect(panggil.mock.calls.map(([command]) => command)).toEqual(["buka_kunci"]);
  });

  it("mengosongkan kolom PIN setelah mencoba", async () => {
    render(<LayarKunci />);

    fireEvent.change(screen.getByLabelText("Kode PIN"), { target: { value: "0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Buka kunci" }));

    await waitFor(() => expect(screen.getByLabelText("Kode PIN")).toHaveValue(""));
  });

  it("membuka gerbang saat PIN benar", async () => {
    render(<LayarKunci />);

    fireEvent.change(screen.getByLabelText("Kode PIN"), { target: { value: PIN_BENAR } });
    fireEvent.click(screen.getByRole("button", { name: "Buka kunci" }));

    await waitFor(() => expect(useKunci.getState().status?.terkunci).toBe(false));
  });

  it("menyembunyikan tombol sidik jari bila perangkat tidak menyediakannya", async () => {
    render(<LayarKunci />);

    expect(screen.queryByRole("button", { name: "Gunakan sidik jari" })).toBeNull();
  });

  it("membuka kunci lewat sidik jari tanpa menyentuh kolom PIN", async () => {
    statusAwal = status({ biometrikTersedia: true });
    useKunci.setState({ status: statusAwal });

    render(<LayarKunci />);
    fireEvent.click(await screen.findByRole("button", { name: "Gunakan sidik jari" }));

    await waitFor(() => expect(panggil).toHaveBeenCalledWith("buka_kunci_biometrik", undefined));
    await waitFor(() => expect(useKunci.getState().status?.terkunci).toBe(false));
  });

  it("mengunci percobaan selama masa tunggu masih berjalan", async () => {
    statusAwal = status({ blokirSisa: 30 });
    useKunci.setState({ status: statusAwal });

    render(<LayarKunci />);

    expect(await screen.findByText(/Coba lagi dalam 30 detik/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buka kunci" })).toBeDisabled();
    expect(panggil).not.toHaveBeenCalled();
  });
});

describe("KartuKunci", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusAwal = status({ aktif: false, terkunci: false });
    useKunci.setState({ status: statusAwal, sedangMuat: false });
    panggil.mockImplementation((command: string, argumen?: Record<string, unknown>) =>
      Promise.resolve(jalankan(command, argumen)),
    );
  });

  it("menahan pasang PIN ketika ulangan tidak sama", async () => {
    render(<KartuKunci />);

    fireEvent.change(screen.getByLabelText("PIN baru"), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText("Ulangi PIN"), { target: { value: "4321" } });

    expect(await screen.findByText(/tidak sama/)).toBeTruthy();
    expect(panggil).not.toHaveBeenCalledWith("setel_kunci", expect.anything());
  });

  it("memasang kunci dengan PIN dan jeda yang dipilih", async () => {
    render(<KartuKunci />);

    fireEvent.change(screen.getByLabelText("PIN baru"), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText("Ulangi PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Pasang kunci" }));

    await waitFor(() =>
      expect(panggil).toHaveBeenCalledWith("setel_kunci", { pin: "1234", jedaDetik: 60 }),
    );
    await waitFor(() => expect(useKunci.getState().status?.aktif).toBe(true));
  });
});

/** Aturan PIN dicabut dari komponen ke `kunci-skema.ts` supaya hanya ada satu sumber di sisi
   client. Angka 4 dan 12 adalah PANJANG_PIN_MIN dan PANJANG_PIN_MAKS di `kunci::service` Rust.
   Assertion sengaja tidak mencocokkan kata kunci pesan karena pesan sudah diterjemahkan. */
describe("galatPin", () => {
  it("membiarkan PIN kosong supaya kolom yang belum disentuh tidak ditandai salah", () => {
    expect(galatPin("")).toBeNull();
  });

  it("menolak PIN yang lebih pendek atau lebih panjang dari rentang backend", () => {
    expect(galatPin("123")).toContain("4");
    expect(galatPin("1".repeat(13))).toContain("12");
    expect(galatPin("1234")).toBeNull();
    expect(galatPin("1".repeat(12))).toBeNull();
  });

  it("menolak karakter selain angka", () => {
    expect(galatPin("12a4")).toBeTruthy();
    expect(galatPin("12 4")).toBeTruthy();
  });
});
