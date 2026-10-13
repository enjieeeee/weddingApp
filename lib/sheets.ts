import "server-only";
import { google } from "googleapis";

const TAB = "RSVPs";
const RANGE = `${TAB}!A:J`;

function client() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.SHEET_ID;
  if (!email || !key || !sheetId) throw new Error("Missing Google Sheets environment variables");

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

// Single append call per party keeps all of a party's rows together and uses one API request.
export async function appendRows(rows: string[][]) {
  const { sheets, sheetId } = client();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}
