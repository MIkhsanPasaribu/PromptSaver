-- Migrasi 0001: skema awal PromptSaver.
-- Aturan AGENTS.md: file migrasi yang sudah dirilis bersifat immutable, perubahan skema memakai migrasi baru.
-- Waktu disimpan sebagai epoch milidetik (INTEGER). ID memakai UUID v7 sebagai TEXT.

CREATE TABLE folder (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE COLLATE NOCASE,
  dibuat_pada INTEGER NOT NULL,
  diubah_pada INTEGER NOT NULL
);

CREATE TABLE tag (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE COLLATE NOCASE,
  warna TEXT NOT NULL DEFAULT 'kuning',
  dibuat_pada INTEGER NOT NULL
);

CREATE TABLE prompt (
  id TEXT PRIMARY KEY,
  judul TEXT NOT NULL DEFAULT '',
  isi TEXT NOT NULL,
  folder_id TEXT REFERENCES folder(id) ON DELETE SET NULL,
  favorit INTEGER NOT NULL DEFAULT 0 CHECK (favorit IN (0, 1)),
  disemat INTEGER NOT NULL DEFAULT 0 CHECK (disemat IN (0, 1)),
  dibuat_pada INTEGER NOT NULL,
  diubah_pada INTEGER NOT NULL,
  dipakai_terakhir INTEGER,
  sampah_pada INTEGER
);

CREATE INDEX idx_prompt_folder ON prompt(folder_id);
CREATE INDEX idx_prompt_sampah ON prompt(sampah_pada);
CREATE INDEX idx_prompt_diubah ON prompt(diubah_pada DESC);
CREATE INDEX idx_prompt_dipakai ON prompt(dipakai_terakhir DESC);

CREATE TABLE prompt_tag (
  prompt_id TEXT NOT NULL REFERENCES prompt(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX idx_prompt_tag_tag ON prompt_tag(tag_id);

-- Indeks pencarian teks (FTS5). Tabel ini berisi salinan teks, bukan external content,
-- supaya pemicu tetap sederhana dan hasil pencarian mudah dibersihkan saat hapus permanen.
CREATE VIRTUAL TABLE prompt_carik USING fts5(
  prompt_id UNINDEXED,
  judul,
  isi,
  tag_nama,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Draf belum tersimpan dipulihkan setelah aplikasi ditutup tidak wajar (PRD A1).
CREATE TABLE draf (
  id TEXT PRIMARY KEY,
  judul TEXT NOT NULL DEFAULT '',
  isi TEXT NOT NULL DEFAULT '',
  folder_id TEXT,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  diubah_pada INTEGER NOT NULL
);

-- Pengaturan aplikasi dan geometri jendela. Geometri mode penuh dan mode widget disimpan
-- dengan kunci terpisah sesuai AGENTS.md Bagian 5.
CREATE TABLE pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL,
  diubah_pada INTEGER NOT NULL
);

-- Pemicu sinkronisasi indeks pencarian.
CREATE TRIGGER prompt_carik_masuk
AFTER INSERT ON prompt BEGIN
  INSERT INTO prompt_carik(prompt_id, judul, isi, tag_nama)
  VALUES (
    new.id,
    new.judul,
    new.isi,
    ''
  );
END;

CREATE TRIGGER prompt_carik_ubah
AFTER UPDATE OF judul, isi ON prompt BEGIN
  UPDATE prompt_carik
  SET judul = new.judul,
      isi = new.isi
  WHERE prompt_id = new.id;
END;

CREATE TRIGGER prompt_carik_hapus
AFTER DELETE ON prompt BEGIN
  DELETE FROM prompt_carik WHERE prompt_id = old.id;
END;

CREATE TRIGGER prompt_tag_carik_masuk
AFTER INSERT ON prompt_tag BEGIN
  UPDATE prompt_carik
  SET tag_nama = (
    SELECT coalesce(group_concat(t.nama, ' '), '')
    FROM tag t
      JOIN prompt_tag pt ON pt.tag_id = t.id
    WHERE pt.prompt_id = new.prompt_id
  )
  WHERE prompt_id = new.prompt_id;
END;

CREATE TRIGGER prompt_tag_carik_hapus
AFTER DELETE ON prompt_tag BEGIN
  UPDATE prompt_carik
  SET tag_nama = (
    SELECT coalesce(group_concat(t.nama, ' '), '')
    FROM tag t
      JOIN prompt_tag pt ON pt.tag_id = t.id
    WHERE pt.prompt_id = old.prompt_id
  )
  WHERE prompt_id = old.prompt_id;
END;

CREATE TRIGGER tag_carik_ubah
AFTER UPDATE OF nama ON tag BEGIN
  UPDATE prompt_carik
  SET tag_nama = (
    SELECT coalesce(group_concat(t.nama, ' '), '')
    FROM tag t
      JOIN prompt_tag pt ON pt.tag_id = t.id
    WHERE pt.prompt_id = prompt_carik.prompt_id
  );
END;
