# WeddingApp: Design Doc (office-hours output)

Status: DRAFT, auto-decided defaults (user unavailable). Premises below were not confirmed.
Mode: Builder (personal project). No code written.

## Problem
A mobile-first wedding invitation site. Guests open a URL, see photos, and RSVP for themselves and their party. Submissions land in a Google Sheet, which stays the source of truth. A later table-assignment algorithm (tables of 10) reads from it.

## Premises (assumed)
1. Google Sheets is the DB. Scale is hundreds of rows with one write per party, and the couple can hand-edit rows.
2. One row per attendee, sharing a `party_id`.
3. Table-sorting readiness comes from clean, typed, flat data, not extra architecture.
4. Next.js on Vercel plus a Google service account via `googleapis`.
5. A public write endpoint needs validation, a honeypot and a rate limit.
6. Batch append, one API call per party, stays well under Sheets quota.

## Schema changes vs. your spec (recommended)
Your 7 columns are kept in this order. Append these at the end so nothing breaks:

| Column | Type | Why |
|---|---|---|
| `attending` | Yes/No | Decliners can be recorded, and the guest count is accurate. |
| `contact` | string | One per party (repeated per row). Lets you chase non-responders. |
| `table_number` | int, blank | Written back by the future algorithm. |
| `notes` | string, blank | For manual edits. |

Notes:
- `meal_preference` defaults to Chinese. `wedding_side` and `relationship_type` are enums validated server-side.
- The table algorithm should group by `party_id` first, then by `wedding_side` and `relationship_type`. Keep a party together and pack parties into tables of 10.
- Never let the app overwrite rows, so manual edits are safe. Use append-only.

## Alternatives

**A. Minimal: Next.js (App Router) + Tailwind + `googleapis`, Vercel** (Effort S, Risk Low) (recommended)
- One page, one `POST /api/rsvp` route handler. Credentials come from env vars.
- Pros: ships in a weekend. Free hosting. Single repo.
- Cons: Sheets latency (~1 s) on submit. Vercel's free tier has cold starts.

**B. Ideal: Next.js plus a thin repository layer** (Effort M, Risk Low)
- Same as A, but the Sheet sits behind a `GuestRepository` interface (`append`, `listAll`, `updateTable`). Swapping to Postgres later is trivial.
- Pros: the table algorithm and any future DB reuse the same interface.
- Cons: a bit more code than a one-night project needs.

**C. Lateral: static site + Google Apps Script web app as the backend** (Effort S, Risk Med)
- The Sheet's own Apps Script receives the POST. No service account is needed.
- Pros: zero server and zero secrets to manage.
- Cons: weak validation and rate limiting, and a clunky dev workflow.

**Recommendation: A, with a small `lib/sheets.ts` module and the interface idea from B.** You get A's speed and B's modularity without the ceremony.

## Tech stack and hosting
- Next.js 14+ (App Router), TypeScript, Tailwind CSS, `next/image` for photos.
- `googleapis` (Sheets v4, `spreadsheets.values.append`), `zod` for validation, `uuid` / `crypto.randomUUID()`.
- Hosting: Vercel (free). Env vars: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_ID`.
- Share the Sheet with the service-account email as Editor.

## File layout
```
WeddingApp/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                 # hero, photos, details, RSVP section
│  ├─ api/rsvp/route.ts        # POST handler: validate, then append
│  └─ globals.css
├─ components/
│  ├─ Hero.tsx
│  ├─ PhotoGallery.tsx
│  ├─ RsvpForm.tsx             # multi-pax state, add/remove attendee
│  └─ AttendeeFields.tsx
├─ lib/
│  ├─ sheets.ts                # auth + appendRows + listRows
│  ├─ schema.ts                # zod schemas + enums, shared by client and server
│  ├─ rows.ts                  # attendee[] to row arrays, column order
│  └─ rateLimit.ts
├─ public/images/
├─ scripts/                    # later: assignTables.ts reads the Sheet
├─ .env.local                  # never committed
└─ README.md
```

## Roadmap
1. **Static UI**: scaffold, mobile-first hero, photo gallery, event details. Deploy to Vercel.
2. **RSVP form (no backend)**: dynamic multi-attendee form, zod validation, a `party_id` generated on submit, success and error states.
3. **Sheets integration**: service account, `lib/sheets.ts`, `POST /api/rsvp`. Test against a dev Sheet.
4. **Hardening**: honeypot, rate limit, server-side enum checks, double-submit guard, error logging.
5. **Launch**: real Sheet, custom domain, test on iOS Safari and Android, then send the URL.
6. **Later**: `scripts/assignTables.ts` reads rows, groups by `party_id`, packs into tables of 10, writes `table_number` back.

## Risks and open questions
- Private-key newlines in env vars: replace `\\n` with real newlines.
- Guests who lose their link and resubmit: decide whether to dedupe by name and contact, or leave it for manual cleanup.
- Is an invite-code or per-family link wanted? It would pre-fill the party name and reduce spam.
- Do you want RSVP-by deadline and edit-after-submit? That would need a lookup, which the append-only design does not support.

## The Assignment
Create the Google Sheet with the 11 columns above and the service account, and confirm a hand-run `append` works from a local script. This is the riskiest integration, so do it before any UI polish.
