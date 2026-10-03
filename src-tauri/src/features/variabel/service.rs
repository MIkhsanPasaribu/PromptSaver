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

/// Daftar variabel unik sesuai urutan kemunculan pertama.
pub fn deteksi_variabel(teks: &str) -> Vec<String> {
    let mut hasil: Vec<String> = Vec::new();
    let bait: Vec<char> = teks.chars().collect();
    let mut indeks = 0;

    while indeks + 1 < bait.len() {
        if bait[indeks] == '{' && bait[indeks + 1] == '{' {
            if let Some(batas) = cari_penutup(&bait, indeks + 2) {
                let isi: String = bait[indeks + 2..batas].iter().collect();
                let nama = isi.trim();
                if nama_sahih(nama) && !isi.contains('{') && !isi.contains('}') {
                    let nama = nama.to_string();
                    if !hasil.contains(&nama) {
                        hasil.push(nama);
                    }
                    indeks = batas + 2;
                    continue;
                }
            }
        }
        indeks += 1;
    }

    hasil
}

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

/// Nama variabel yang belum diisi, dipakai frontend untuk meminta konfirmasi
/// "Ada variabel kosong, lanjutkan?" (PRD Workflow Kritikal 1 langkah 6).
pub fn variabel_kosong(teks: &str, nilai: &HashMap<String, String>) -> Vec<String> {
    deteksi_variabel(teks)
        .into_iter()
        .filter(|nama| nilai.get(nama).map(|v| v.trim().is_empty()).unwrap_or(true))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn peta(data: &[(&str, &str)]) -> HashMap<String, String> {
        data.iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn mendeteksi_variabel_dalam_urutan_muncul() {
        let teks = "Terjemahkan ke {{bahasa}} dengan gaya {{tone}}, lalu ringkas ke {{bahasa}}";
        assert_eq!(
            deteksi_variabel(teks),
            vec!["bahasa".to_string(), "tone".to_string()]
        );
    }

    #[test]
    fn sintaks_rusak_diperlakukan_sebagai_teks_biasa() {
        assert!(deteksi_variabel("{{bahasa tanpa penutup").is_empty());
        assert!(deteksi_variabel("bahasa}}").is_empty());
        assert!(deteksi_variabel("{{ }}").is_empty());
        // Buka ganda dianggap teks, tetapi variabel sah di dalamnya tetap dikenali.
        assert_eq!(
            deteksi_variabel("{{satu {{dua}} }}"),
            vec!["dua".to_string()]
        );
    }

    #[test]
    fn nama_variabel_mendukung_garis_bawah_dan_titik() {
        assert_eq!(
            deteksi_variabel("isi {{nama_kurator}} dan {{bahasa.daerah}}"),
            vec!["nama_kurator".to_string(), "bahasa.daerah".to_string()]
        );
    }

    #[test]
    fn nama_terlalu_panjang_ditolak() {
        let panjang = "a".repeat(NAMA_VARIABEL_MAKS + 1);
        assert!(deteksi_variabel(&format!("{{{{{panjang}}}}}")).is_empty());
        assert_eq!(deteksi_variabel("{{ab}}"), vec!["ab".to_string()]);
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
    fn melaporkan_variabel_yang_kosong() {
        kosong_sama(
            &variabel_kosong("{{a}} {{b}}", &peta(&[("a", "isi"), ("b", "   ")])),
            &["b"],
        );
        kosong_sama(
            &variabel_kosong("{{a}} {{b}}", &peta(&[("a", "isi")])),
            &["b"],
        );
    }

    #[test]
    fn teks_tanpa_variabel_tidak_berubah() {
        let teks = "Prompt biasa tanpa variabel";
        hasil_sama(&isi_variabel(teks, &peta(&[])), teks);
        assert!(deteksi_variabel(teks).is_empty());
    }

    fn hasil_sama(aktual: &str, harapan: &str) {
        assert_eq!(aktual, harapan);
    }

    fn kosong_sama(aktual: &[String], harapan: &[&str]) {
        let harapan: Vec<String> = harapan.iter().map(|s| s.to_string()).collect();
        assert_eq!(aktual, &harapan);
    }
}
