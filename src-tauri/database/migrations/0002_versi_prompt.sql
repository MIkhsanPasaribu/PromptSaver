-- 0002: riwayat versi prompt (PRD C3).
-- Setiap perubahan menyimpan keadaan prompt sebelum diubah, dipangkas ke 10 versi terakhir
-- per prompt oleh lapisan repository. Baris ikut terhapus saat prompt dihapus permanen.

CREATE TABLE versi_prompt (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL REFERENCES prompt(id) ON DELETE CASCADE,
  judul TEXT NOT NULL DEFAULT '',
  isi TEXT NOT NULL,
  disimpan_pada INTEGER NOT NULL
);

CREATE INDEX idx_versi_prompt_waktu ON versi_prompt(prompt_id, disimpan_pada DESC);
