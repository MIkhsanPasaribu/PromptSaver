import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import KerangkaAplikasi from "@/app/app-shell";
import { PengaturNotifikasi } from "@/components/ui/sonner";
import "@/lib/i18n";

import "./styles/index.css";

const akar = document.getElementById("root");
if (!akar) {
  // Tanpa elemen root aplikasi memang tidak bisa tampil. Ditulis ke konsol, bukan isi prompt.
  throw new Error("Elemen root tidak ditemukan");
}

createRoot(akar).render(
  <StrictMode>
    <KerangkaAplikasi />
    <PengaturNotifikasi />
  </StrictMode>,
);
