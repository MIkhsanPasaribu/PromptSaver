//! Logika bisnis variabel template. Sintaks yang dikenali adalah `{{nama_variabel}}`.
//! Sintaks rusak seperti `{{bahasa` tanpa penutup diperlakukan sebagai teks biasa
//! dan tidak memicu dialog isian (PRD Workflow Kritikal 1, alur gagal).

use std::collections::HashMap;

/// Nama variabel dibatasi supaya mudah dibaca di dialog: huruf, angka, garis bawah,
/// tanda hubung, dan titik. Panjang maksimum 40 karakter.
pub const NAMA_VARIABEL_MAKS: usize = 40;

fn nama_sahih(nama: &str) -> bool {
    !nama.is_empty()
        && nama.chars().count() <= NAMA_VARIABEL_MAKS
        && nama
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.')
}

/// Cari penutup `}}` berikutnya mulai dari `mulai`.
fn cari_penutup(bait: &[char], mulai: usize) -> Option<usize> {
    let mut jalan = mulai;
    while jalan + 1 < bait.len() {
        if bait[jalan] == '}' && bait[jalan + 1] == '}' {
            return Some(jalan);
        }
        jalan += 1;
    }
    None
}

/// Ganti setiap kemunculan variabel dengan nilainya. Nama yang tidak dikirim nilainya
/// dibiarkan apa adanya, supaya pengguna tidak kehilangan teks saat menyalin sebagian.
pub fn isi_variabel(teks: &str, nilai: &HashMap<String, String>) -> String {
    let mut keluaran = String::with_capacity(teks.len());
    let bait: Vec<char> = teks.chars().collect();
    let mut indeks = 0;

    while indeks < bait.len() {
        if indeks + 1 < bait.len() && bait[indeks] == '{' && bait[indeks + 1] == '{' {
            if let Some(batas) = cari_penutup(&bait, indeks + 2) {
                let isi: String = bait[indeks + 2..batas].iter().collect();
                let nama = isi.trim();
                if nama_sahih(nama) && !isi.contains('{') && !isi.contains('}') {
                    match nilai.get(nama) {
                        Some(nilai_variabel) => {
                            keluaran.push_str(nilai_variabel);
                            indeks = batas + 2;
                            continue;
                        }
                        None => {
                            keluaran.push_str("{{");
                            keluaran.push_str(&isi);
                            keluaran.push_str("}}");
                            indeks = batas + 2;
                            continue;
                        }
                    }
                }
            }
        }
        keluaran.push(bait[indeks]);
        indeks += 1;
    }

    keluaran
}

#[cfg(test)]
mod tests {
    use super::*;

    fn peta(data: &[(&str, &str)]) -> HashMap<String, String> {
        data.iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    /// Aturan sintaks `{{nama}}` diuji lewat `isi_variabel`, satu-satunya jalur produksi yang
    /// memakai parser ini. Token yang tidak sah harus tetap tertinggal utuh di keluaran, yang
    /// berarti parser menolak membacanya sebagai variabel.
    #[test]
    fn sintaks_rusak_dibiarkan_sebagai_teks_biasa() {
        let nilai = peta(&[("bahasa", "Jawa"), ("dua", "isi"), (" ", "x")]);
        hasil_sama(
            &isi_variabel("{{bahasa tanpa penutup", &nilai),
            "{{bahasa tanpa penutup",
        );
        hasil_sama(&isi_variabel("bahasa}}", &nilai), "bahasa}}");
        hasil_sama(&isi_variabel("{{ }}", &nilai), "{{ }}");
        // Buka ganda dianggap teks, tetapi variabel sah di dalamnya tetap dikenali.
        hasil_sama(&isi_variabel("{{satu {{dua}} }}", &nilai), "{{satu isi }}");
    }

    #[test]
    fn nama_variabel_mendukung_garis_bawah_dan_titik() {
        hasil_sama(
            &isi_variabel(
                "isi {{nama_kurator}} dan {{bahasa.daerah}}",
                &peta(&[("nama_kurator", "A"), ("bahasa.daerah", "B")]),
            ),
            "isi A dan B",
        );
    }

    #[test]
    fn nama_terlalu_panjang_ditolak() {
        let panjang = "a".repeat(NAMA_VARIABEL_MAKS + 1);
        let nilai = peta(&[(panjang.as_str(), "X"), ("ab", "Y")]);
        let teks = format!("{{{{{panjang}}}}}");
        hasil_sama(&isi_variabel(&teks, &nilai), &teks);
        hasil_sama(&isi_variabel("{{ab}}", &nilai), "Y");
    }

    #[test]
    fn mengisi_variabel_mengganti_semua_kemunculan() {
        let teks = "Bahasa {{bahasa}}, tone {{tone}}, bahasa lagi {{bahasa}}";
        hasil_sama(
            &isi_variabel(teks, &peta(&[("bahasa", "Indonesia"), ("tone", "santai")])),
            "Bahasa Indonesia, tone santai, bahasa lagi Indonesia",
        );
    }

    #[test]
    fn nilai_yang_tidak_dikirim_dibiarkan_apa_adanya() {
        hasil_sama(
            &isi_variabel("Hai {{nama}} dan {{tone}}", &peta(&[("nama", "Rani")])),
            "Hai Rani dan {{tone}}",
        );
    }

    #[test]
    fn spasi_di_sekitar_nama_variabel_dibersihkan() {
        hasil_sama(
            &isi_variabel("{{ bahasa }}", &peta(&[("bahasa", "Jawa")])),
            "Jawa",
        );
    }

    #[test]
    fn teks_tanpa_variabel_tidak_berubah() {
        let teks = "Prompt biasa tanpa variabel";
        hasil_sama(&isi_variabel(teks, &peta(&[])), teks);
    }

    fn hasil_sama(aktual: &str, harapan: &str) {
        assert_eq!(aktual, harapan);
    }
}
