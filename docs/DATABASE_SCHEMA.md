# Database & Storage Schema: Supabase & Session State

This project connects to PostgreSQL via Supabase. Server-side queries use `supabaseAdmin` ([`src/lib/server/supabase-admin.ts`](file:///d:/kraepelin-online/src/lib/server/supabase-admin.ts)) which bypasses Row Level Security (RLS) using `SUPABASE_SECRET_KEY`.

---

## 1. Tables

### A. `kandidat`
Stores applicant biodata entered on `/data-diri`.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, default `gen_random_uuid()` | Candidate identifier |
| `nama` | `text` | NOT NULL | Full name |
| `tempat_lahir` | `text` | NOT NULL | Place of birth |
| `tanggal_lahir` | `date` / `text` | NOT NULL | Date of birth |
| `email` | `text` | NOT NULL | Lowercase email address |
| `nomor_hp` | `text` | NOT NULL | Phone / WhatsApp number |
| `posisi_dilamar` | `text` | NOT NULL | Target job position |
| `jenjang_pendidikan` | `text` | NOT NULL (`'SMA'` \| `'S1'`) | Highest completed education |
| `jurusan` | `text` | NOT NULL | Field of study / major |
| `kelompok_pendidikan`| `text` | NOT NULL (`'SAINTEK'` \| `'SOSHUM'`) | Academic track for norm mapping |
| `dibuat_pada` | `timestamptz` | DEFAULT `now()` | Registration timestamp |

---

### B. `sesi_assessment`
Tracks candidate test progress and server-side timing.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, default `gen_random_uuid()` | Sesi assessment ID |
| `id_kandidat` | `UUID` | Foreign Key $\rightarrow$ `kandidat.id` | Associated candidate |
| `status` | `text` | NOT NULL (`'SEDANG_BERLANGSUNG'`, `'SELESAI'`) | Sesi lifecycle state |
| `dimulai_pada` | `timestamptz` | NOT NULL | Official test start timestamp |
| `batas_waktu` | `timestamptz` | NOT NULL | Strict server-side deadline |
| `diselesaikan_pada` | `timestamptz` | Nullable | Completion timestamp |
| `durasi_kolom_detik` | `integer` | DEFAULT `15` | Snapshot durasi kolom saat sesi dibuat |
| `durasi_transisi_detik` | `integer` | DEFAULT `1` | Snapshot jeda transisi saat sesi dibuat |
| `dibuat_pada` | `timestamptz` | DEFAULT `now()` | Sesi creation timestamp |
| `diperbarui_pada` | `timestamptz` | DEFAULT `now()` | Last update timestamp |

---

### C. `hasil_assessment`
Stores final psychometric scores and norm ratings generated upon submission.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, default `gen_random_uuid()` | Result ID |
| `id_sesi_assessment`| `UUID` | Foreign Key $\rightarrow$ `sesi_assessment.id` | Assessment session ID |
| `panker` | `numeric` | NOT NULL | Speed score ($\bar{Y}$) |
| `tianker` | `numeric` | NOT NULL | Total errors + skipped |
| `janker` | `numeric` | NOT NULL | Mean absolute deviation |
| `hanker` | `numeric` | NOT NULL | Regression slope curve ($X_{50} - X_0$) |
| `hasil_norma` | `jsonb` | NOT NULL | Detailed norm category per indicator |
| `versi_scoring` | `text` | NOT NULL | Algorithm version (e.g. `'kraepelin-v1'`) |
| `dibuat_pada` | `timestamptz` | DEFAULT `now()` | Completion timestamp |

---

### D. `jawaban_assessment`
Stores individual answers recorded during the test.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Answer record ID |
| `id_sesi_assessment`| `UUID` | Foreign Key $\rightarrow$ `sesi_assessment.id` | Parent assessment session |
| `nomor_kolom` | `integer` | NOT NULL, `1` to `50` | Column number (1-indexed) |
| `nomor_pasangan` | `integer` | NOT NULL, `1` to `27` | Pair number in column (1-indexed) |
| `nilai_jawaban` | `text` | NOT NULL, single digit `'0'` - `'9'` | Candidate's answer |
| `created_at` | `timestamptz` | DEFAULT `now()` | Auto-save timestamp |

---

### E. `pengaturan_tes`
Stores test timer configuration and preset rules managed from the Admin Dashboard.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, default `gen_random_uuid()` | Configuration record ID |
| `nama_pengaturan` | `text` | NOT NULL DEFAULT `'Standar Kraepelin'` | Preset label |
| `durasi_kolom_detik` | `integer` | NOT NULL DEFAULT `15` | Answering duration per column (3 - 120s) |
| `durasi_transisi_detik`| `integer` | NOT NULL DEFAULT `1` | Transition locked duration (0 - 10s) |
| `total_kolom` | `integer` | NOT NULL DEFAULT `50` | Number of columns in test (5 - 50) |
| `is_active` | `boolean` | NOT NULL DEFAULT `true` | Whether this is the active configuration |
| `created_at` | `timestamptz` | DEFAULT `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update timestamp |

---

## 2. Stored Procedures / RPCs

### `submit_kraepelin_assessment`
Executed when finishing an assessment ([`src/app/api/assessment/submit/route.ts`](file:///d:/kraepelin-online/src/app/api/assessment/submit/route.ts)).

```sql
submit_kraepelin_assessment(
  p_assessment_id UUID,
  p_reason TEXT,
  p_panker NUMERIC,
  p_tianker NUMERIC,
  p_janker NUMERIC,
  p_hanker NUMERIC,
  p_hasil_norma JSONB,
  p_versi_scoring TEXT
) -> TABLE (status TEXT, completed_at TIMESTAMPTZ)
```

---

## 3. Session Cookies Specification

### Candidate Session: `assessment_session`
- **Security Flags:** `HttpOnly`, `SameSite=Strict`, `Secure` (in production), `Path=/`.
- **Payload Format:** `<assessmentId>.<hmacSignature>`
- **Signing Algorithm:** HMAC-SHA256 with secret `process.env.ASSESSMENT_COOKIE_SECRET`.

### Admin Session: `admin_session`
- **Security Flags:** `HttpOnly`, `SameSite=Lax`, `Secure` (in production), `Path=/`.
- **Payload Format:** `<base64urlPayload>.<hmacSignature>`
- **Signing Algorithm:** HMAC-SHA256 with secret `process.env.ADMIN_COOKIE_SECRET` or fallback.
