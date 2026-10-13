import { google } from "googleapis";
import { randomUUID } from "node:crypto";

const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, SHEET_ID } = process.env;
for (const [k, v] of Object.entries({ GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, SHEET_ID })) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const auth = new google.auth.JWT({
  email: GOOGLE_CLIENT_EMAIL,
  key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Column order must match the header row: A..J
const row = [
  randomUUID(),
  new Date().toISOString(),
  "TEST - delete me",
  "Bride",
  "Friend",
  "Chinese",
  "",
  "test@example.com",
  "",
  "connectivity test",
];

try {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "RSVPs!A:J",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
  console.log("OK. Appended to:", res.data.updates?.updatedRange);
} catch (e) {
  console.error("FAILED:", e.code, e.message);
  process.exit(1);
}
