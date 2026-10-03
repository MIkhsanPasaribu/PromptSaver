import { usePengaturan } from "@/app/store/pengaturan-store";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toaster brutalis. Tema diambil dari store pengaturan aplikasi, bukan pustaka pihak ketiga. */
function PengaturNotifikasi({ ...props }: ToasterProps) {
  const tema = usePengaturan((s) => s.pengaturan?.tema ?? "ikut-sistem");

  return (
    <Sonner
      theme={tema === "ikut-sistem" ? "system" : tema === "gelap" ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-sm !border-2 !border-primary !shadow-elev-2 !font-display !text-label-md " +
            "!text-on-primary !bg-primary",
          description: "!text-on-primary !opacity-90",
          success: "!bg-success !text-on-success",
          error: "!bg-error !text-on-error",
          warning: "!bg-warning !text-on-warning",
          info: "!bg-surface !text-on-surface",
          actionButton: "!bg-tertiary !text-on-tertiary !rounded-sm !font-semibold",
          cancelButton: "!bg-surface-sunken !text-on-surface !rounded-sm",
          closeButton: "!border-2 !border-primary !rounded-sm !bg-surface !text-on-surface",
        },
      }}
      {...props}
    />
  );
}

export { PengaturNotifikasi };
