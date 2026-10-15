import { createSheetsClient, getRsvpSheet, RSVP_RANGE } from "./sheets-test-utils.mjs";

const runId = process.argv[2];
if (!runId || !/^\d{14}-[a-f0-9]{8}$/.test(runId)) {
  console.error("Usage: npm run test:sheet:clean -- <run-id>");
  console.error("Use the Run ID printed by npm run test:sheet:seed.");
  process.exit(1);
}

try {
  const { sheets, spreadsheetId } = createSheetsClient();
  const valuesResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: RSVP_RANGE });
  const values = valuesResponse.data.values ?? [];
  const matchingRows = values
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row[7]?.startsWith(`qa-seed:${runId}:`) && row[9] === `qa-seed:${runId}`);

  if (matchingRows.length === 0) {
    console.log(`No seeded rows found for run ${runId}.`);
    process.exit(0);
  }

  console.log(`Found ${matchingRows.length} rows for run ${runId}.`);
  const sheetId = await getRsvpSheet(sheets, spreadsheetId);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: matchingRows
        .sort((a, b) => b.rowNumber - a.rowNumber)
        .map(({ rowNumber }) => ({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        })),
    },
  });
  console.log(`Removed ${matchingRows.length} seeded rows. Real RSVP rows were not selected.`);
} catch (error) {
  console.error("FAILED:", error.code ?? "", error.message);
  process.exit(1);
}
