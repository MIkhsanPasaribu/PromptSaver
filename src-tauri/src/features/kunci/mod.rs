//! F4 kunci aplikasi (PRD): PIN ditegakkan di lapisan Rust, bukan hanya di tampilan.
//!
//! Hash PIN memakai PBKDF2-HMAC-SHA256 yang ditulis di modul ini. Sengaja tidak memakai crate
//! KDF: AGENTS.md Bagian 4 membatasi dependency, dan proyek ini harus tetap bisa dibangun offline.
//! Yang dilindungi adalah akses orang lain ke perangkat yang sedang terbuka, bukan serangan
//! offline terhadap berkas database: berkas itu tetap plaintext (lihat halaman Privasi), dan
//! entropi PIN empat digit memang kecil. Karena itu ada batas percobaan gagal dan jeda tunggu.

pub mod command;
pub mod service;
