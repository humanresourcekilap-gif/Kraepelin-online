# Kraepelin Online

Platform asesmen psikotes online untuk **Tes Kraepelin (Tes Koran)** berbasis web modern menggunakan **Next.js 16** (App Router, Turbopack, React Compiler), **React 19**, **Tailwind CSS v4**, dan **Supabase**.

---

## 🚀 Fitur Utama

- **50 Kolom Soal Terstandarisasi:** 50 kolom dengan masing-masing 28 angka (27 pasangan penjumlahan per kolom).
- **Penegakan Waktu Ketat:** 15 detik per kolom + 1 detik transisi otomatis secara deterministic.
- **Auto-Save Real-time:** Setiap jawaban disimpan langsung secara asinkron ke server Supabase untuk mencegah kehilangan data akibat kendala jaringan.
- **Keamanan Sesi Anti-Tamper:** Cookie sesi HttpOnly bertanda tangan kriptografis HMAC-SHA256 (`assessment_session`).
- **Scoring & Norma Otomatis:** Perhitungan otomatis indikator psikometri terstandarisasi:
  - **PANKER** (Kecepatan Kerja)
  - **TIANKER** (Ketelitian Kerja)
  - **JANKER** (Kestabilan Kerja)
  - **HANKER** (Ketahanan Kerja / Kurva Regresi)
  - Penyesuaian norma berdasarkan jenjang & kelompok pendidikan (`SMA_IPA`, `SMA_IPS`, `S1_IPA`, `S1_IPS`).

---

## 📚 Dokumentasi Proyek

Dokumentasi teknis lengkap tersedia pada direktori `docs/`:
- [Arsitektur Sistem](docs/ARCHITECTURE.md) — Alur data, sekuens interaksi, dan struktur folder.
- [Spesifikasi Domain Kraepelin](docs/DOMAIN_KRAEPELIN.md) — Rumus matematika PANKER, TIANKER, JANKER, HANKER, dan norma pendidikan.
- [Skema Database & State](docs/DATABASE_SCHEMA.md) — Tabel Supabase, RPC `submit_kraepelin_assessment`, dan cookie sesi.
- [Panduan Pengujian & Diagnostik](docs/TESTING_AND_VERIFICATION.md) — Endpoint diagnostik dan perintah verifikasi.

---

## 🤖 Dukungan AI Coding Assistant

Codebase ini telah dioptimalkan agar mudah dipahami oleh berbagai model dan alat AI:
- **Universal / Antigravity / Gemini:** [`AGENTS.md`](AGENTS.md)
- **Anthropic / Claude Code:** [`CLAUDE.md`](CLAUDE.md)
- **Cursor IDE:** [`.cursorrules`](.cursorrules) dan modul aturan [`.cursor/rules/`](.cursor/rules/)
- **GitHub Copilot:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **LLM Index:** [`llms.txt`](llms.txt)

---

## 🛠️ Memulai Pengembangan

### Prasyarat
- Node.js versi 20+
- Akun dan project Supabase aktif

### Konfigurasi Lingkungan (`.env.local`)
Pastikan variabel lingkungan berikut telah diisi di `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
SUPABASE_SECRET_KEY=<your-secret-service-role-key>
ASSESSMENT_COOKIE_SECRET=<your-hmac-sha256-secret-key>
```

### Menjalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

### Linting & Build
```bash
npm run lint
npm run build
```
