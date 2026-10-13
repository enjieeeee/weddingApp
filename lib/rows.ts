import type { RsvpInput } from "./schema";

// Column order must match the Sheet header row (A..J).
export const SHEET_COLUMNS = [
  "party_id",
  "submission_timestamp",
  "full_name",
  "wedding_side",
  "relationship_type",
  "meal_preference",
  "dietary_restrictions",
  "contact",
  "table_number",
  "notes",
] as const;

// One row per attendee, all sharing the same party_id.
export function toRows(input: RsvpInput, partyId: string, timestamp: string): string[][] {
  return input.attendees.map((a) => [
    partyId,
    timestamp,
    a.full_name,
    a.wedding_side,
    a.relationship_type,
    a.meal_preference,
    a.dietary_restrictions,
    input.contact,
    "",
    "",
  ]);
}
