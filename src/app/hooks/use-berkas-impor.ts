import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { useNavigasi } from "@/app/store/navigasi-store";
import { ambilBerkasTerbuka } from "@/features/transfer/services/transfer-service";

/** PRD D2: berkas .promptsaver yang dibuka dari OS harus ditawarkan sebagai impor.
   Tiga jalur masuk ditangani di sini, semuanya berakhir di layar Ekspor dan Impor:
   argumen saat aplikasi desktop pertama kali start (dibaca sekali lewat command), event dari
   instance kedua ketika aplikasi sudah berjalan, dan event DOM dari Activity Android yang
   sudah menyalin URI content ke folder aplikasi. */
export function gunakanBerkasImpor(siap: boolean) {
  const ke = useNavigasi((s) => s.ke);

  useEffect(() => {
    // Saat aplikasi terkunci, token berkas tunggu di backend: membacanya sekarang akan
    // menghapusnya sementara layarnya pun tidak bisa dibuka.
    if (!siap) return;
    let dibatalkan = false;
    const tawarkan = (path: string) => {
      if (!dibatalkan) ke({ nama: "transfer", berkas: path });
    };

    // Tidak ada berkas saat start adalah keadaan normal, jadi galat jalur ini diabaikan.
    void ambilBerkasTerbuka()
      .then((path) => path && tawarkan(path))
      .catch(() => undefined);

    const mendengar = listen<string>("berkas-impor", (event) => tawarkan(event.payload));

    const dariAndroid = (event: Event) => {
      const jalur = (event as CustomEvent<string>).detail;
      if (typeof jalur === "string") tawarkan(jalur);
    };
    window.addEventListener("promptsaver:berkas-masuk", dariAndroid);
    // Activity Android menyimpan jalur di properti global bila intent datang sebelum
    // halaman sempat memasang pemantau.
    const tertunda = (window as Window & { promptsaverBerkasMasuk?: string })
      .promptsaverBerkasMasuk;
    if (typeof tertunda === "string") tawarkan(tertunda);

    return () => {
      dibatalkan = true;
      window.removeEventListener("promptsaver:berkas-masuk", dariAndroid);
      void mendengar.then((lepas) => lepas());
    };
  }, [siap, ke]);
}
