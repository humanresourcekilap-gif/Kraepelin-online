# Testing, Quality Verification & Diagnostic Endpoints

This document describes how AI models and engineers can verify code changes, inspect scoring results, and test components within `kraepelin-online`.

---

## 1. Development & Diagnostic API Routes

The project includes built-in test routes in `src/app/api/` that run in development (`NODE_ENV === "development"`). These endpoints allow testing the backend without executing a full 13-minute exam:

| Route | Description |
| :--- | :--- |
| `GET /api/test-supabase` | Validates active Supabase connectivity and credentials. |
| `GET /api/test-kraepelin` | Runs indicator calculations (PANKER, TIANKER, JANKER, HANKER) with mock datasets (stable, rising, falling). |
| `GET /api/test-kraepelin-hasil` | Tests the combined pipeline: scoring, indicators, and norm categorization (`SMA_IPA`). |
| `GET /api/test-kraeplin-norma` | Verifies edge cases in norm threshold matching. |
| `GET /api/test-norma-batas` | Tests boundary cases (min/max thresholds) across all education groups. |
| `GET /api/test-scoring` | Validates answer scoring against `kunci-jawaban.ts`. |
| `GET /api/test-skip` | Checks accurate handling of skipped / omitted pairs. |

---

## 2. Standard Commands

### Local Development
```bash
npm run dev
# Starts Turbopack development server on http://localhost:3000
```

### Type Checking & Linting
```bash
npm run lint
# Runs ESLint 9 checks based on eslint.config.mjs and eslint-config-next
```

### Production Build
```bash
npm run build
# Compiles Next.js with React Compiler and Turbopack
```

---

## 3. Critical Verification Checklist for AI Models

When modifying codebase logic, verify the following:

- [ ] **No Client Leaks**: Ensure files under `src/lib/server/` retain `import "server-only";` and are never imported into `"use client"` components.
- [ ] **Data Math Consistency**: Ensure `KraepelinColumnInput` validates:
  - $\text{correct} + \text{error} + \text{skipped} = \text{lastAnsweredPair}$
  - Values do not exceed 27 per column.
- [ ] **Cookie Secret**: In `.env.local`, ensure `ASSESSMENT_COOKIE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SECRET_KEY` are defined.
- [ ] **Preserve Agent Rules**: In `AGENTS.md`, never remove the `<!-- BEGIN:nextjs-agent-rules -->` block.

