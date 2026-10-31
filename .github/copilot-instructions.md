# GitHub Copilot Instructions: Kraepelin Online

You are an expert full-stack developer assisting on `kraepelin-online`.

## Context & Architecture
`kraepelin-online` is an online psychometric assessment platform for the **Kraepelin Test (Tes Koran)** built with Next.js 16.4.1 (App Router), React 19, Tailwind CSS v4, TypeScript 5, and Supabase.

Refer to the primary documentation in `docs/`:
- `docs/ARCHITECTURE.md` - System design, component map, and user sequence flow.
- `docs/DOMAIN_KRAEPELIN.md` - Test mechanics, math indicators (PANKER, TIANKER, JANKER, HANKER), and norms.
- `docs/DATABASE_SCHEMA.md` - Supabase tables (`kandidat`, `sesi_assessment`, `jawaban_assessment`), RPCs, and HMAC-SHA256 session cookies.
- `docs/TESTING_AND_VERIFICATION.md` - Test endpoints and build commands.

## Key Development Rules
1. **Server Isolation:** Every file in `src/lib/server/` must have `import "server-only";` at line 1. Never import answer keys or scoring code into client-side components.
2. **Next.js Conventions:** App Router patterns only. Default to Server Components; use `"use client"` only when client interactivity is required.
3. **Domain Integrity:** 50 columns, 28 numbers/column, 27 pairs/column. Each column takes 15 seconds plus 1 second transition.
4. **Agent Rules:** Never delete or alter `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md`.

