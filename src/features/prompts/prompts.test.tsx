import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KartuPrompt } from "@/features/prompts/components/prompt-card";
import { DialogVariabel } from "@/features/prompts/components/variable-dialog";
import { PanelSalinManual } from "@/features/prompts/components/manual-copy-panel";
import { gunakanSalin } from "@/features/prompts/hooks/use-salin";
import { skemaPrompt } from "@/features/prompts/types/prompt-skema";
import type { Prompt } from "@/features/prompts/types/prompt.types";
import { variabelDariTeks } from "@/features/prompts/services/variabel-service";
import * as variabel from "@/features/prompts/services/variabel-service";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ambilPrompt, tandaiPromptDipakai } from "@/features/prompts/services/prompt-service";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(async () => undefined),
}));
vi.mock("@/features/prompts/services/prompt-service", () => ({
  tandaiPromptDipakai: vi.fn(async () => undefined),
  ambilPrompt: vi.fn(async (id: string) => ({ ...contoh, id })),
}));
vi.mock("@/lib/notifikasi", () => ({
  beriTahuTersalin: vi.fn(),
  beriTahuGalat: vi.fn(),
  beriTahuBerhasil: vi.fn(),
}));

// variabelDariTeks diuji apa adanya; hanya jalur IPC yang dipalsukan.
vi.mock("@/features/prompts/services/variabel-service", async (imana) => {
  const asli = await imana<typeof variabel>();
  return {
    ...asli,
    susunVariabel: vi.fn(async (isi: string, nilai: Record<string, string>) =>
      isi.replace(/\{\{([^{}]+)\}\}/g, (sisa, nama: string) => nilai[nama.trim()] ?? sisa),
    ),
    ambilNilaiVariabelTerakhir: vi.fn(async () => ({}) as Record<string, string>),
    simpanNilaiVariabelTerakhir: vi.fn(async () => undefined),
  };
});

const contoh: Prompt = {
  id: "p-1",
  judul: "Ringkas jurnal",
  isi: "Ringkas jurnal penelitian ini menjadi dua paragraf.",
  folderId: "f-1",
  namaFolder: "Riset",
  tags: [{ id: "t-1", nama: "akademik", warna: "hijau", jumlahPrompt: 3, dibuatPada: 0 }],
  favorit: false,
  disemat: false,
  dibuatPada: 1,
  diubahPada: 2,
  dipakaiTerakhir: null,
  sampahPada: null,
  potongan: "Ringkas jurnal penelitian ini menjadi dua paragraf.",
};

const template: Prompt = {
  ...contoh,
  id: "p-2",
  judul: "Terjemahan",
  isi: "Terjemahkan teks berikut ke {{bahasa}}.",
  potongan: undefined,
};

describe("KartuPrompt", () => {
  it("menampilkan judul, potongan, tag, dan folder", () => {
    render(
      <KartuPrompt
        prompt={contoh}
        tersalin={false}
        onBuka={vi.fn()}
        onSalin={vi.fn()}
        onFavorit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Ringkas jurnal" })).toBeTruthy();
    expect(screen.getByText("akademik")).toBeTruthy();
    expect(screen.getByText("Riset")).toBeTruthy();
  });

  it("satu ketuk salin memanggil aksi tanpa membuka detail", () => {
    const onSalin = vi.fn();
    const onBuka = vi.fn();
    render(
      <KartuPrompt
        prompt={contoh}
        tersalin={false}
        onBuka={onBuka}
        onSalin={onSalin}
        onFavorit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Salin prompt Ringkas jurnal/i }));
    expect(onSalin).toHaveBeenCalledTimes(1);
    expect(onBuka).not.toHaveBeenCalled();
  });

  it("menandai favorit tanpa merubah layar", () => {
    const onFavorit = vi.fn();
    render(
      <KartuPrompt
        prompt={contoh}
        tersalin={false}
        onBuka={vi.fn()}
        onSalin={vi.fn()}
        onFavorit={onFavorit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tandai favorit" }));
    expect(onFavorit).toHaveBeenCalledWith(true);
  });

  it("menyorot kata yang cocok ketika kueri dikirim", () => {
    const { container } = render(
      <KartuPrompt
        prompt={contoh}
        tersalin={false}
        kueri="jurnal"
        onBuka={vi.fn()}
        onSalin={vi.fn()}
        onFavorit={vi.fn()}
      />,
    );
    expect(container.querySelectorAll("mark").length).toBeGreaterThan(1);
  });
});

describe("gunakanSalin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menulis clipboard lalu menandai pemakaian untuk prompt tanpa variabel", async () => {
    const { result } = renderHook(() => gunakanSalin());

    const ok = await result.current.salin(contoh);

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith(contoh.isi);
    expect(result.current.menungguVariabel).toBeNull();
    await waitFor(() => expect(tandaiPromptDipakai).toHaveBeenCalledWith("p-1"));
  });

  /** Regresi: `rakit` dengan `sertakan_isi = false` mengirim `isi` kosong untuk baris daftar,
     Sampah, dan Mode Widget. Dulu salinan dari daftar menulis string kosong ke clipboard dan
     tetap menampilkan notifikasi "tersalin". */
  it("mengambil isi penuh lebih dulu saat sumbernya baris daftar tanpa isi", async () => {
    const barisDaftar: Prompt = { ...contoh, isi: "", potongan: contoh.isi.slice(0, 20) };
    const { result } = renderHook(() => gunakanSalin());

    const ok = await result.current.salin(barisDaftar);

    expect(ok).toBe(true);
    expect(ambilPrompt).toHaveBeenCalledWith("p-1");
    expect(writeText).toHaveBeenCalledWith(contoh.isi);
    expect(writeText).not.toHaveBeenCalledWith("");
  });

  /** Regresi kedua yang tersembunyi di balik yang pertama: `variabelDariTeks` membaca teks yang
     sama, jadi prompt bervariabel dari daftar tidak pernah memunculkan dialog isian dan langsung
     menyalin. Dialog juga harus menerima teks penuh, bukan potongan. */
  it("tetap membuka dialog variabel untuk prompt bervariabel dari daftar", async () => {
    vi.mocked(ambilPrompt).mockResolvedValueOnce({ ...template, potongan: undefined });
    const barisDaftar: Prompt = { ...template, isi: "", potongan: "Terjemahkan teks…" };
    const { result } = renderHook(() => gunakanSalin());

    let ok = true;
    await act(async () => {
      ok = await result.current.salin(barisDaftar);
    });

    expect(ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(result.current.menungguVariabel?.isi).toBe(template.isi);
  });

  it("membuka dialog variabel dan tidak menulis clipboard untuk prompt bervariabel", async () => {
    const { result } = renderHook(() => gunakanSalin());

    let ok = true;
    await act(async () => {
      ok = await result.current.salin(template);
    });

    expect(ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(result.current.menungguVariabel?.id).toBe("p-2");
  });

  it("menyediakan teks untuk salin manual ketika clipboard ditolak", async () => {
    vi.mocked(writeText).mockRejectedValueOnce(new Error("ditolak sistem"));
    const { result } = renderHook(() => gunakanSalin());

    let ok = true;
    await act(async () => {
      ok = await result.current.salin(contoh);
    });

    expect(ok).toBe(false);
    expect(tandaiPromptDipakai).not.toHaveBeenCalled();
    expect(result.current.salinManual?.teks).toBe(contoh.isi);

    act(() => result.current.tutupSalinManual());
    expect(result.current.salinManual).toBeNull();
  });

  it("salinTeks menandai massal tanpa memanggil hitungan pemakaian", async () => {
    const { result } = renderHook(() => gunakanSalin());

    let ok = false;
    await act(async () => {
      ok = await result.current.salinTeks("gabungan tiga prompt", undefined, 3);
    });

    expect(ok).toBe(true);
    expect(result.current.idTersalin).toBe("massal");
    expect(tandaiPromptDipakai).not.toHaveBeenCalled();
  });
});

describe("variabelDariTeks", () => {
  it("mengurutkan sesuai kemunculan pertama dan membuang duplikat", () => {
    expect(variabelDariTeks("{{b}} lalu {{a}} lalu {{b}} lagi")).toEqual(["b", "a"]);
  });

  it("memperlakukan sintaks rusak sebagai teks biasa", () => {
    expect(variabelDariTeks("Bahasa {{bahasa tanpa penutup")).toEqual([]);
  });
});

describe("DialogVariabel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengisi variabel lalu menyalin hasil tanpa menyimpan saran", async () => {
    const onSalin = vi.fn(async () => true);
    render(
      <DialogVariabel prompt={template} ingatNilai={false} onSalin={onSalin} onTutup={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("bahasa"), { target: { value: "Inggris" } });
    await waitFor(() =>
      expect(screen.getByText("Terjemahkan teks berikut ke Inggris.")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Salin" }));
    await waitFor(() =>
      expect(onSalin).toHaveBeenCalledWith("Terjemahkan teks berikut ke Inggris.", "p-2"),
    );
    expect(vi.mocked(variabel.simpanNilaiVariabelTerakhir)).not.toHaveBeenCalled();
  });

  it("meminta konfirmasi sebelum menyalin saat ada variabel kosong", async () => {
    const onSalin = vi.fn(async () => true);
    render(
      <DialogVariabel prompt={template} ingatNilai={true} onSalin={onSalin} onTutup={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Salin" }));
    expect(onSalin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/variabel kosong/i);

    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan menyalin" }));
    await waitFor(() => expect(onSalin).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(vi.mocked(variabel.simpanNilaiVariabelTerakhir)).toHaveBeenCalledTimes(1),
    );
  });

  it("memakai nilai tersimpan sebagai saran saat dialog dibuka", async () => {
    vi.mocked(variabel.ambilNilaiVariabelTerakhir).mockResolvedValueOnce({ bahasa: "Jepang" });
    render(
      <DialogVariabel
        prompt={template}
        ingatNilai={false}
        onSalin={vi.fn(async () => true)}
        onTutup={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect((screen.getByLabelText("bahasa") as HTMLInputElement).value).toBe("Jepang"),
    );
  });

  it("tidak menimpa ketikan ketika saran datang terlambat", async () => {
    let tunda: (nilai: Record<string, string>) => void = () => undefined;
    vi.mocked(variabel.ambilNilaiVariabelTerakhir).mockReturnValueOnce(
      new Promise<Record<string, string>>((selesai) => {
        tunda = selesai;
      }),
    );

    render(
      <DialogVariabel
        prompt={template}
        ingatNilai={false}
        onSalin={vi.fn(async () => true)}
        onTutup={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("bahasa"), { target: { value: "Spanyol" } });
    act(() => tunda({ bahasa: "Jepang" }));
    await waitFor(() =>
      expect(screen.getByText("Terjemahkan teks berikut ke Spanyol.")).toBeTruthy(),
    );
  });
});

describe("PanelSalinManual", () => {
  it("menawarkan seluruh teks dan tombol pilih semua saat clipboard ditolak", () => {
    const onTutup = vi.fn();
    const { rerender } = render(<PanelSalinManual antrean={null} onTutup={onTutup} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    const teks = "isi yang harus terpilih";
    rerender(<PanelSalinManual antrean={{ teks, id: "p-1" }} onTutup={onTutup} />);

    const area = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(area.value).toBe(teks);

    fireEvent.click(screen.getByRole("button", { name: "Pilih semua" }));
    expect(area.selectionStart).toBe(0);
    expect(area.selectionEnd).toBe(teks.length);

    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    expect(onTutup).toHaveBeenCalledTimes(1);
  });
});

describe("skemaPrompt", () => {
  it("menolak isi kosong dan hanya spasi", () => {
    expect(skemaPrompt.safeParse({ isi: "" }).success).toBe(false);
    const galatSpasi = skemaPrompt.safeParse({ isi: "   \n  " });
    expect(galatSpasi.success).toBe(false);
    if (!galatSpasi.success) {
      expect(galatSpasi.error.issues[0]?.message).toMatch(/tidak boleh/i);
    }
  });

  it("menerima isi 50.000 karakter", () => {
    expect(skemaPrompt.safeParse({ isi: "a".repeat(50_000) }).success).toBe(true);
  });

  it("menolak judul terlalu panjang", () => {
    const hasil = skemaPrompt.safeParse({ judul: "b".repeat(301), isi: "isi valid" });
    expect(hasil.success).toBe(false);
  });
});
