import { useEffect, useState } from "react";

/** Nilai baru dipakai setelah pengguna berhenti mengetik (debounce kolom cari widget). */
export function gunakanJeda<T>(nilai: T, milidetik: number): T {
  const [terpilih, setTerpilih] = useState(nilai);
  useEffect(() => {
    const waktu = setTimeout(() => setTerpilih(nilai), milidetik);
    return () => clearTimeout(waktu);
  }, [nilai, milidetik]);
  return terpilih;
}
