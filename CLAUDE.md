# Claude Code Assistant Guide: Kraepelin Online

This file guides Claude (Claude Code, Anthropic API, or Desktop) when navigating and contributing to `kraepelin-online`.

---

## 1. Project Overview & Quick Start

* **Project:** Kraepelin Online (Online Psychometric "Tes Koran" Assessment)
* **Stack:** Next.js 16.4.1 (App Router), React 19, Tailwind CSS v4, TypeScript 5, Supabase
* **Development Server:** `npm run dev` (starts on `http://localhost:3000`)
* **Linting:** `npm run lint`
* **Production Build:** `npm run build`

---

## 2. Architecture & Domain Pointers

Detailed specifications are maintained in `docs/`:
- **Architecture & Lifecycle:** [`docs/ARCHITECTURE.md`](file:///d:/kraepelin-online/docs/ARCHITECTURE.md)
- **Psychometrics (PANKER, TIANKER, JANKER, HANKER, Norms):** [`docs/DOMAIN_KRAEPELIN.md`](file:///d:/kraepelin-online/docs/DOMAIN_KRAEPELIN.md)
- **Supabase Schema, Tables & RPCs:** [`docs/DATABASE_SCHEMA.md`](file:///d:/kraepelin-online/docs/DATABASE_SCHEMA.md)
- **Testing & Diagnostics:** [`docs/TESTING_AND_VERIFICATION.md`](file:///d:/kraepelin-online/docs/TESTING_AND_VERIFICATION.md)

---

## 3. Critical Guidelines for Claude

1. **Server Isolation:**
   - Any file in `src/lib/server/` must have `import "server-only";` at line 1.
   - Never import `kunci-jawaban.ts` or `supabase-admin.ts` into client-side components.
2. **Deterministic Kraepelin Logic:**
   - Total columns: `50`. Numbers per column: `28`. Pairs: `27`.
   - Column cycle: `15,000 ms` answering + `1,000 ms` transition.
   - Answer format: single-digit string `"0"` to `"9"`.
   - Never modify `src/lib/server/kraepelin.ts` without ensuring mathematical compliance with `docs/DOMAIN_KRAEPELIN.md`.
3. **Session Verification:**
   - All assessment actions (`/api/assessment/*`) require HMAC-SHA256 signed session cookie verification via `verifySessionCookie()`.
4. **Agent Rules Preservation:**
   - Never remove or alter the `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md`.

