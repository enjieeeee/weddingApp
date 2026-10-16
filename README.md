# weddingApp

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
