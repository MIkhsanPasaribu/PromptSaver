//! Model pencarian.

use serde::{Deserialize, Serialize};

use crate::features::prompts::model::UrutanPrompt;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct FilterCari {
    pub kueri: String,
    pub folder_id: Option<String>,
    pub tag_ids: Vec<String>,
    pub hanya_favorit: bool,
    pub urutan: UrutanPrompt,
    pub batas: Option<i64>,
    pub kursor: Option<i64>,
}
