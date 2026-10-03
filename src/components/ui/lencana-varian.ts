import { cva } from "class-variance-authority";

/** Kelas dasar chip tag dan lencana status. Enam hue ini satu-satunya warna isi yang diizinkan. */
export const lencanaVariants = cva(
  "inline-flex h-7 max-w-full shrink-0 items-center gap-1 truncate rounded-sm border-2 border-primary " +
    "px-2.5 font-display text-label-sm uppercase tracking-[0.08em] text-on-surface " +
    "shadow-elev-1 transition-[transform,box-shadow,background-color] duration-[120ms] ease-standard",
  {
    variants: {
      warna: {
        kuning: "bg-chip-kuning",
        hijau: "bg-chip-hijau",
        cyan: "bg-chip-cyan",
        pink: "bg-chip-pink",
        lavender: "bg-chip-lavender",
        oranye: "bg-chip-oranye",
        netral: "bg-surface-sunken",
        bahaya: "bg-error text-on-error",
        berhasil: "bg-success text-on-success",
      },
      // State terpilih ditandai bentuk (garis 3px dan bayangan kuning), bukan dengan
      // menukar isi ke warna primary. Dua kelas latar dan teks yang bersaing membuat
      // Tailwind yang menang ditentukan urutan stylesheet, dan di mode gelap hasilnya
      // teks kertas di atas latar kertas.
      terpilih: { true: "border-[3px] shadow-elev-terpilih", false: "" },
      dapatDitekan: {
        true: "cursor-pointer hover:shadow-elev-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        false: "",
      },
    },
    defaultVariants: { warna: "kuning", terpilih: false, dapatDitekan: false },
  },
);
