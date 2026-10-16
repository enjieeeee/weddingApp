# weddingApp

## Admin seating dashboard

Set `ADMIN_DASHBOARD_TOKEN` in the deployment environment, then open
`/admin/seating` and enter that token. The dashboard reads the `RSVPs` sheet,
groups attendees by `party_id`, keeps each party together, targets tables of 10,
and balances Bride/Groom sides where possible. Relationship type is used as a
secondary packing signal.

Use **Edit layout** to drag guests between tables or into the unassigned area.
Selecting **Done editing** exits edit mode. Layout changes are local to the
current dashboard session and are not written back to Google Sheets. Automated
tests mock Google Sheets; validate against a dedicated test Sheet with
`npm run test:sheet` before production use.
