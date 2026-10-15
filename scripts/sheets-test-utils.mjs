import { google } from "googleapis";

export const RSVP_RANGE = "RSVPs!A:J";

export function createSheetsClient() {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, SHEET_ID } = process.env;
  for (const [name, value] of Object.entries({
    GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    SHEET_ID,
  })) {
    if (!value) throw new Error(`Missing ${name} in .env.local`);
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId: SHEET_ID };
}

export async function getRsvpSheet(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const sheet = response.data.sheets?.find(({ properties }) => properties?.title === "RSVPs");
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error('Could not find a sheet tab named "RSVPs"');
  }
  return sheet.properties.sheetId;
}
