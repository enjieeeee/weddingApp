import { describe, expect, it } from "vitest";
import { MAX_ATTENDEES, rsvpSchema } from "@/lib/schema";

const attendee = {
  full_name: "  Ann Lee ",
  wedding_side: "Bride",
  relationship_type: "Friend",
  meal_preference: "Halal",
};

describe("rsvpSchema", () => {
  it("accepts a valid RSVP, trims names and defaults dietary restrictions", () => {
    const r = rsvpSchema.parse({ contact: "ann@example.com", attendees: [attendee] });
    expect(r.attendees[0].full_name).toBe("Ann Lee");
    expect(r.attendees[0].dietary_restrictions).toBe("");
  });

  it("rejects blank names, bad enums, short contact and empty attendees", () => {
    const bad = [
      { contact: "ann@example.com", attendees: [{ ...attendee, full_name: "   " }] },
      { contact: "ann@example.com", attendees: [{ ...attendee, wedding_side: "Other" }] },
      { contact: "ab", attendees: [attendee] },
      { contact: "ann@example.com", attendees: [] },
    ];
    for (const b of bad) expect(rsvpSchema.safeParse(b).success).toBe(false);
  });

  it("caps attendees at MAX_ATTENDEES", () => {
    const make = (n: number) => ({
      contact: "abc",
      attendees: Array.from({ length: n }, () => attendee),
    });
    expect(rsvpSchema.safeParse(make(MAX_ATTENDEES)).success).toBe(true);
    expect(rsvpSchema.safeParse(make(MAX_ATTENDEES + 1)).success).toBe(false);
  });

  it("rejects a non-uuid submission_id", () => {
    const r = rsvpSchema.safeParse({
      contact: "abc",
      attendees: [attendee],
      submission_id: "nope",
    });
    expect(r.success).toBe(false);
  });
});
