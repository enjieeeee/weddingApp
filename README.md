# weddingApp

## Deployment (Render, Docker)

1. Push to GitHub. In Render: **New → Blueprint**, pick this repo (`render.yaml`).
2. Set the secrets: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (keep `\n`
   escapes or paste real newlines), `SHEET_ID`, `ADMIN_DASHBOARD_TOKEN`,
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The Maps key is inlined at build time, so
   changing it requires a rebuild.
3. Service → **Settings → Custom Domains**: add your domain and create the DNS
   record Render shows. HTTPS is automatic.
4. Add the domain to the Maps key's HTTP referrer restrictions.

The free plan sleeps when idle; switch `plan` to `starter` for the event.
The same Dockerfile runs anywhere: `docker build --build-arg
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... -t wedding . && docker run --env-file
.env.local -p 3000:3000 wedding`.

## Admin seating dashboard

Set `ADMIN_DASHBOARD_TOKEN` in the deployment environment, then open
`/admin/seating` and enter that token. The dashboard reads the `RSVPs` sheet,
groups attendees by `party_id`, keeps each party together, targets tables of 10,
and balances Bride/Groom sides where possible. Relationship type is used as a
secondary packing signal.

Use **Edit layout** to drag guests between tables or into the unassigned area.
Selecting **Done editing** saves the complete layout to the dedicated
`SeatingConfig` tab and reloads the saved arrangement. The tab uses
`row_number` and `table_number` columns; blank table numbers represent
unassigned guests. The dashboard leaves RSVP guests added after a save
unassigned until they are manually placed. The tab is created automatically
when the dashboard is opened. Automated tests mock Google Sheets; validate
against a dedicated test Sheet with `npm run test:sheet` before production use.
