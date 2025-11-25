# Agent Guidelines

## Commands
- **Build:** `pnpm build` (tsup) | **Dev:** `pnpm dev`
- **Lint/Format:** `pnpm lint` / `pnpm format` (Biome)
- **Test:** `pnpm test` (Jest) | **Single:** `pnpm test -t "name"`

## Code Style
- **Format:** 2 spaces, double quotes, semicolons (Biome).
- **Imports:** Use `node:` prefix. Use `@/` alias for `src/`.
- **Naming:** `camelCase` (vars/funcs), `PascalCase` (classes), `kebab-case` (files).
- **Types:** Avoid `any`. Prefer strict types despite `strict: false` in tsconfig.
- **Tests:** Co-locate (`file.test.ts`). Mock external deps.

## Rules
- Prefer `node:fs/promises`.
- Run `pnpm format` and `pnpm test` before committing.
- Keep files small and single-purpose.
