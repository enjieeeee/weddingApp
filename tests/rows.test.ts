import { describe, expect, it } from "vitest";
import { SHEET_COLUMNS, toRows } from "@/lib/rows";
import { rsvpSchema } from "@/lib/schema";

describe("toRows", () => {
  it("emits one row per attendee sharing party_id, matching the sheet columns", () => {
    const a = {
      full_name: "A",
      wedding_side: "Bride",
      relationship_type: "Friend",
      meal_preference: "Chinese",
      dietary_restrictions: "nuts",
    };
    const input = rsvpSchema.parse({
      contact: "123456",
      attendees: [a, { ...a, full_name: "B" }],
    });
    const rows = toRows(input, "party-1", "2026-01-01T00:00:00.000Z");

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toHaveLength(SHEET_COLUMNS.length);
      expect(row[0]).toBe("party-1");
      expect(row[7]).toBe("123456");
    }
    expect(rows.map((r) => r[2])).toEqual(["A", "B"]);
  });
});
