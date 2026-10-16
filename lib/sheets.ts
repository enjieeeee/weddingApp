import "server-only";
import { google } from "googleapis";

const TAB = "RSVPs";
const RANGE = `${TAB}!A:J`;
const SEATING_CONFIG_TAB = "SeatingConfig";
const SEATING_CONFIG_RANGE = `${SEATING_CONFIG_TAB}!A:B`;
const SEATING_CONFIG_HEADERS = ["row_number", "table_number"];

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

export type SeatingAssignment = {
  rowNumber: number;
  tableNumber: number | null;
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

async function ensureSeatingConfigTab(sheets: ReturnType<typeof google.sheets>, sheetId: string) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties",
  });
  const hasTab = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === SEATING_CONFIG_TAB,
  );
  if (!hasTab) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SEATING_CONFIG_TAB } } }],
      },
    });
  }
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

export async function listSeatingAssignments(): Promise<SeatingAssignment[]> {
  const { sheets, sheetId } = client();
  await ensureSeatingConfigTab(sheets, sheetId);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: SEATING_CONFIG_RANGE,
  });
  return (response.data.values ?? []).slice(1).flatMap((row) => {
    const rowNumber = Number.parseInt(row[0] ?? "", 10);
    const tableNumber = Number.parseInt(row[1] ?? "", 10);
    if (!Number.isInteger(rowNumber) || rowNumber < 2) return [];
    return [{ rowNumber, tableNumber: Number.isInteger(tableNumber) ? tableNumber : null }];
  });
}

export async function replaceSeatingAssignments(assignments: SeatingAssignment[]) {
  const { sheets, sheetId } = client();
  await ensureSeatingConfigTab(sheets, sheetId);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: SEATING_CONFIG_RANGE,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: SEATING_CONFIG_RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        SEATING_CONFIG_HEADERS,
        ...assignments
          .slice()
          .sort((a, b) => a.rowNumber - b.rowNumber)
          .map(({ rowNumber, tableNumber }) => [rowNumber, tableNumber ?? ""]),
      ],
    },
  });
}
