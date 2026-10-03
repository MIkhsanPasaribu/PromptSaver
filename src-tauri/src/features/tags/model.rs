//! Model tag. Warna dibatasi pada enam hue chip yang didefinisikan DESIGN.md,
//! supaya tidak ada warna liar yang belum diverifikasi kontrasnya.

use serde::{Deserialize, Serialize};

pub const WARNA_TAG_VALID: [&str; 6] = ["kuning", "hijau", "cyan", "pink", "lavender", "oranye"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub nama: String,
    pub warna: String,
    pub jumlah_prompt: i64,
    pub dibuat_pada: i64,
}
