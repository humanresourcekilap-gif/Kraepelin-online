<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS Guide for Kraepelin Online

Welcome! You are working on **kraepelin-online**, an online psychometric assessment platform for the **Kraepelin Test (Tes Koran)** used in recruitment and candidate selection.

## 1. Quick Reference & Context Documents

Before creating or refactoring code, always consult the specialized documentation:
- [System Architecture](file:///d:/kraepelin-online/docs/ARCHITECTURE.md) - App structure, data flow, sequence diagram, and security boundary.
- [Domain & Kraepelin Psychometrics](file:///d:/kraepelin-online/docs/DOMAIN_KRAEPELIN.md) - 50 columns, 27 pairs, mathematical formulas for PANKER, TIANKER, JANKER, HANKER, and education cohort norms.
- [Database Schema & State](file:///d:/kraepelin-online/docs/DATABASE_SCHEMA.md) - Supabase tables (`kandidat`, `sesi_assessment`, `jawaban_assessment`), RPC `submit_kraepelin_assessment`, and HMAC session cookies.
- [Testing & Diagnostics](file:///d:/kraepelin-online/docs/TESTING_AND_VERIFICATION.md) - Development test endpoints and build verification commands.

---

## 2. Technical Stack & Conventions

- **Next.js 16.4.1 (App Router)**:
  - React 19 + React Compiler enabled in `next.config.ts`.
  - Use Server Components by default. Add `"use client"` only for interactive UI components requiring hooks (`useState`, `useEffect`, `useRef`).
  - Do NOT use legacy Pages Router patterns (`pages/`, `getStaticProps`, `getServerSideProps`).
- **Server Security Boundary**:
  - All files in `src/lib/server/` must start with `import "server-only";`.
  - Never import `kunci-jawaban.ts`, `supabase-admin.ts`, or scoring logic into Client Components.
- **Styling**:
  - Tailwind CSS v4 using `@tailwindcss/turbopack`. Use standard utility classes, avoid outdated custom CSS hacks.
- **Icons**:
  - `lucide-react` for UI icons.

---

## 3. Strict Domain & Business Rules

1. **Test Parameters**:
   - Total columns: `50` (indexed 0–49 internally, displayed 1–50).
   - Numbers per column: `28` (giving 27 vertical summation pairs).
   - Duration per column: `15,000 ms` + `1,000 ms` transition.
   - Summation formula: candidate types `(A + B) % 10` (single digit string `"0"` - `"9"`).
2. **Scoring Logic**:
   - `lastAnsweredPair`: highest answered pair in a column ($1 \le p \le 27$).
   - `skipped`: empty slots strictly between pair 1 and `lastAnsweredPair`. Slots beyond `lastAnsweredPair` are NOT counted as skipped.
   - PANKER, TIANKER, JANKER, and HANKER must strictly follow the formulas in [`docs/DOMAIN_KRAEPELIN.md`](file:///d:/kraepelin-online/docs/DOMAIN_KRAEPELIN.md).
3. **Session Verification**:
   - Sessions are protected via an `assessment_session` HttpOnly cookie signed with HMAC-SHA256 (`ASSESSMENT_COOKIE_SECRET`).
   - Server validates deadline against `sesi_assessment.batas_waktu`. Do not rely solely on client-side timers.

---

## 4. Verification Workflow

Whenever making code changes:
1. Run `npm run lint` to confirm no ESLint errors.
2. Run `npm run build` to confirm TypeScript types compile and React Compiler passes.
3. Test backend changes using the diagnostic routes in development (`/api/test-kraepelin`, `/api/test-kraepelin-hasil`, `/api/test-scoring`).
