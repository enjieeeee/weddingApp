import "server-only";
import { google } from "googleapis";

const TAB = "RSVPs";
const RANGE = `${TAB}!A:J`;
const TABLE_COLUMN = "I";

export type SheetRsvpRow = {
  rowNumber: number;
  partyId: string;
  submittedAt: string;
  fullName: string;
  weddingSide: "Bride" | "Groom" | string;
  relationshipType: "Family/Relatives" | "Friend" | string;
  mealPreference: string;
  dietaryRestrictions: string;
  contact: string;
  tableNumber: number | null;
  notes: string;
};

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

export async function listRsvpRows(): Promise<SheetRsvpRow[]> {
  const { sheets, sheetId } = client();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: RANGE,
  });
  const values = response.data.values ?? [];
  return values.slice(1).flatMap((row, index) => {
    if (!row[0] || !row[2]) return [];
    const table = Number.parseInt(row[8] ?? "", 10);
    return [
      {
        rowNumber: index + 2,
        partyId: row[0],
        submittedAt: row[1] ?? "",
        fullName: row[2],
        weddingSide: row[3] ?? "",
        relationshipType: row[4] ?? "",
        mealPreference: row[5] ?? "",
        dietaryRestrictions: row[6] ?? "",
        contact: row[7] ?? "",
        tableNumber: Number.isFinite(table) ? table : null,
        notes: row[9] ?? "",
      },
    ];
  });
}

export async function writeTableNumbers(assignments: Map<number, number | null>) {
  const { sheets, sheetId } = client();
  await Promise.all(
    [...assignments].map(([rowNumber, tableNumber]) =>
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${TAB}!${TABLE_COLUMN}${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[tableNumber ?? ""]] },
      }),
    ),
  );
}
