import { randomInt, randomUUID } from "node:crypto";
import { createSheetsClient, RSVP_RANGE } from "./sheets-test-utils.mjs";

const countArg = process.argv.find((arg) => arg.startsWith("--count="));
const count = Number.parseInt(countArg?.split("=")[1] ?? "100", 10);
if (!Number.isInteger(count) || count < 1 || count > 500) {
  console.error("Count must be an integer from 1 to 500.");
  process.exit(1);
}

const firstNames = ["Ari", "Bea", "Chen", "Dara", "Eli", "Faye", "Gus", "Hana", "Ivan", "Jia"];
const lastNames = ["Tan", "Lim", "Wong", "Lee", "Ng", "Koh", "Goh", "Yap", "Ong", "Teo"];
const sides = ["Bride", "Groom"];
const relationships = ["Family/Relatives", "Friend"];
const meals = ["Chinese", "Vegetarian", "Halal"];
const runId = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const rows = [];
let remaining = count;
let partyNumber = 1;

while (remaining > 0) {
  const partySize = Math.min(remaining, randomInt(1, 6));
  const partyId = `qa-seed-${runId}-party-${String(partyNumber).padStart(3, "0")}`;
  const contact = `qa-seed:${runId}:party-${partyNumber}@example.test`;
  const timestamp = new Date().toISOString();
  for (let member = 0; member < partySize; member++) {
    const fullName = `${firstNames[randomInt(0, firstNames.length)]} ${lastNames[randomInt(0, lastNames.length)]}`;
    rows.push([
      partyId,
      timestamp,
      fullName,
      sides[randomInt(0, sides.length)],
      relationships[randomInt(0, relationships.length)],
      meals[randomInt(0, meals.length)],
      randomInt(0, 4) === 0 ? "No peanuts" : "",
      contact,
      "",
      `qa-seed:${runId}`,
    ]);
  }
  remaining -= partySize;
  partyNumber++;
}

try {
  const { sheets, spreadsheetId } = createSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: RSVP_RANGE,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
  console.log(`Seeded ${rows.length} guests in ${partyNumber - 1} parties.`);
  console.log(`Run ID: ${runId}`);
  console.log(`Updated range: ${response.data.updates?.updatedRange ?? "unknown"}`);
  console.log(`Remove with: npm run test:sheet:clean -- ${runId}`);
} catch (error) {
  console.error("FAILED:", error.code ?? "", error.message);
  process.exit(1);
}
