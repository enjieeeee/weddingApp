# Testing and Code Quality

This guide covers how to run the automated tests (Vitest), the linters and formatters (Biome for JS/TS, Ruff for Python) and the pre-commit hook that runs them for you.

## Quick start

```bash
npm install            # installs dependencies and sets up the git hook
python3 -m pip install --user ruff   # one-time, needed for Python linting

npm test               # run the unit/API tests
npm run check          # lint + typecheck + tests (what the hook runs, plus lint)
```

Run `npm run check` before pushing. If it passes locally, it should pass for everyone.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs all Vitest tests once. |
| `npm run test:watch` | Re-runs tests as you edit files. |
| `npm run lint` | Biome check on JS/TS/JSON/CSS, then Ruff check on Python. Read-only. |
| `npm run format` | Auto-fixes and formats with Biome and Ruff. |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`). |
| `npm run check` | `lint` + `typecheck` + `test`, stops at the first failure. |
| `npm run test:sheet` | Manual script that appends a row to the real Google Sheet. Needs `.env.local`. Not part of `check`. |
| `npm run test:sheet:seed` | Appends 100 randomized test guests in grouped parties. Needs `.env.local`; not part of `check`. |
| `npm run test:sheet:clean -- <run-id>` | Deletes only rows created by one seed run. Use the Run ID printed by the seed command. |

## Vitest

Config: `vitest.config.mts`. Tests live in `tests/*.test.ts`.

- `@/` maps to the project root, same as in the app.
- `server-only` is stubbed (`tests/server-only-stub.ts`) so server modules can be imported outside Next.js.

| File | Covers |
| --- | --- |
| `schema.test.ts` | Zod validation: required fields, enums, trimming, attendee limit, UUID check. |
| `rows.test.ts` | Mapping an RSVP to Google Sheet rows (column order, shared `party_id`). |
| `rateLimit.test.ts` | Per-IP rate limit and duplicate submission memory, including expiry. |
| `rsvp-route.test.ts` | `POST /api/rsvp`: 200, 400, 413, 429, 502, honeypot and idempotent retries. |
| `sheets.test.ts` | `lib/sheets.ts` with `googleapis` mocked: one append call, `RSVPs!A:J` range, `RAW`/`INSERT_ROWS`, private key `\n` handling, missing env vars, error propagation. |
| `seating.test.ts` | Deterministic party grouping, table capacity, side counts, and oversized-party handling. |

The route tests mock `@/lib/sheets`, and `sheets.test.ts` mocks `googleapis`, so **no automated test calls the real Google Sheets API or writes to the real sheet**, and none need credentials.

### Testing the real Google Sheets API

The automated tests (and the pre-commit hook) deliberately skip the live API: it needs credentials and network, is slow, and writes real rows to the guest list. To check the real connection manually, fill in `.env.local` (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_ID`) and run:

```bash
npm run test:sheet
```

This appends a test row to the sheet. Delete it afterwards. Run it after changing credentials, the sheet layout or `lib/sheets.ts`.

### Seed and remove about 100 test guests

Use this to exercise the dashboard with realistic party sizes and randomized
names, sides, relationships and meal preferences:

```bash
npm run test:sheet:seed
```

The default is 100 guests. To choose another safe test size:

```bash
npm run test:sheet:seed -- --count=120
```

The command prints a **Run ID**. Save it, then clean up only that run with:

```bash
npm run test:sheet:clean -- 20261016013000-a1b2c3d4
```

Cleanup requires the exact Run ID, matches both the test contact marker and
the notes marker, and removes rows from the bottom upward. It does not delete
normal RSVP rows. Do not edit the generated marker columns before cleanup.

### Adding a test

1. Create `tests/<name>.test.ts`.
2. Import with the `@/` alias, for example `import { toRows } from "@/lib/rows";`.
3. Use `describe`/`it`/`expect` from `vitest`. Use `vi.useFakeTimers()` for time-based logic and `vi.mock()` to replace external services.
4. Run `npm test`.

Tip: the rate limiter and duplicate store are in-memory and shared within a test file. Give each route test its own `x-forwarded-for` IP (see `post()` in `rsvp-route.test.ts`) so tests don't affect each other.

## Biome (JavaScript / TypeScript)

Config: `biome.json`. Biome lints and formats `.ts`, `.tsx`, `.js`, `.mjs`, `.json` and `.css`.

```bash
npx biome check .            # report problems
npx biome check --write .    # fix what can be fixed safely
```

Style: 2-space indent, 100-character lines. If a rule is wrong for a specific line, suppress it with a comment that explains why:

```ts
// biome-ignore lint/suspicious/noArrayIndexKey: <reason>
```

## Ruff (Python)

Config: `ruff.toml` (line length 100, rules E, F, I, B, UP). The project has no Python files today, so Ruff only does work when you add some.

```bash
python3 -m ruff check .      # lint
python3 -m ruff format .     # format
```

If you see `No module named ruff`, run `python3 -m pip install --user ruff`.

## Pre-commit hook

On every `git commit`, `.husky/pre-commit` runs:

1. **lint-staged**: Biome (`--write`) on staged JS/TS/JSON/CSS files, and Ruff check (`--fix`) plus format on staged `.py` files. Fixes are re-staged automatically.
2. `npm run typecheck`
3. `npm test`

If any step fails, the commit is blocked. Fix the problem and commit again.

- Husky installs the hook when you run `npm install` (the `prepare` script). If it is missing, run `npm run prepare`.
- To skip the hook in an emergency: `git commit --no-verify`. Please don't make a habit of it.

## Troubleshooting

- **Hook doesn't run:** check `git config core.hooksPath` prints `.husky/_`; if not, run `npm run prepare`.
- **Biome complains about formatting:** run `npm run format`.
- **Tests fail only with many runs:** the in-memory rate limiter is shared inside a file; use unique IPs per request.
- **`next dev` was running during checks:** this is fine, tests don't use the dev server.
