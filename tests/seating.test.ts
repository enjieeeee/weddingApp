import { describe, expect, it } from "vitest";
import { buildSeatingPlan } from "@/lib/seating";
import type { SheetRsvpRow } from "@/lib/sheets";

function row(
  rowNumber: number,
  partyId: string,
  fullName: string,
  weddingSide = "Bride",
): SheetRsvpRow {
  return {
    rowNumber,
    partyId,
    submittedAt: "",
    fullName,
    weddingSide,
    relationshipType: "Friend",
    mealPreference: "Chinese",
    dietaryRestrictions: "",
    contact: "",
    tableNumber: null,
    notes: "",
  };
}

describe("buildSeatingPlan", () => {
  it("keeps a party together and fills tables deterministically", () => {
    const plan = buildSeatingPlan([
      row(2, "party-b", "B"),
      row(3, "party-a", "A"),
      row(4, "party-a", "A2"),
      row(5, "party-c", "C", "Groom"),
    ]);
    expect(plan.tables).toHaveLength(1);
    expect(plan.tables[0].members.map((member) => member.fullName)).toEqual(["A", "A2", "B", "C"]);
    expect(plan.tables[0].brideCount).toBe(3);
    expect(plan.tables[0].groomCount).toBe(1);
  });

  it("does not split parties that exceed capacity", () => {
    const members = Array.from({ length: 11 }, (_, index) =>
      row(index + 2, "large", `Guest ${index}`),
    );
    const plan = buildSeatingPlan(members);
    expect(plan.tables).toHaveLength(0);
    expect(plan.unassigned[0].partyId).toBe("large");
    expect(plan.unassigned[0].members).toHaveLength(11);
  });

  it("starts another table instead of splitting a party", () => {
    const members = [
      ...Array.from({ length: 7 }, (_, index) => row(index + 2, "party-a", `A${index}`)),
      ...Array.from({ length: 4 }, (_, index) => row(index + 20, "party-b", `B${index}`, "Groom")),
    ];
    const plan = buildSeatingPlan(members);
    expect(plan.tables.map((table) => table.seatsUsed)).toEqual([7, 4]);
  });
});
