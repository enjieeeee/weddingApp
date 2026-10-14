import { beforeEach, describe, expect, it, vi } from "vitest";

const appendRows = vi.fn();
vi.mock("@/lib/sheets", () => ({ appendRows: (rows: string[][]) => appendRows(rows) }));

import { POST } from "@/app/api/rsvp/route";

const attendee = {
  full_name: "Ann",
  wedding_side: "Bride",
  relationship_type: "Friend",
  meal_preference: "Halal",
};
let ipCounter = 0;

function post(body: unknown, headers: Record<string, string> = {}) {
  ipCounter++;
  return POST(
    new Request("http://localhost/api/rsvp", {
      method: "POST",
      headers: { "x-forwarded-for": `10.0.0.${ipCounter}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  appendRows.mockReset();
  appendRows.mockResolvedValue(undefined);
});

describe("POST /api/rsvp", () => {
  it("saves a valid RSVP with server-generated party_id", async () => {
    const res = await post({ contact: "ann@example.com", attendees: [attendee, attendee] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    const rows: string[][] = appendRows.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe(rows[1][0]);
  });

  it("returns 400 for malformed JSON and invalid payloads without writing", async () => {
    expect((await post("{x")).status).toBe(400);
    expect((await post({ contact: "abc", attendees: [] })).status).toBe(400);
    expect((await post("null")).status).toBe(400);
    expect(appendRows).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized bodies", async () => {
    const res = await post(JSON.stringify({ contact: "a".repeat(21_000) }));
    expect(res.status).toBe(413);
  });

  it("fakes success for honeypot submissions but writes nothing", async () => {
    const res = await post({ contact: "abc", website: "spam", attendees: [attendee] });
    expect(res.status).toBe(200);
    expect(appendRows).not.toHaveBeenCalled();
  });

  it("is idempotent for a repeated submission_id", async () => {
    const body = {
      contact: "abc",
      attendees: [attendee],
      submission_id: crypto.randomUUID(),
    };
    expect((await post(body)).status).toBe(200);
    const second = await post(body);
    expect(await second.json()).toEqual({ ok: true, count: 1 });
    expect(appendRows).toHaveBeenCalledTimes(1);
  });

  it("returns 502 and does not remember the id when Sheets fails", async () => {
    const body = { contact: "abc", attendees: [attendee], submission_id: crypto.randomUUID() };
    appendRows.mockRejectedValueOnce(new Error("boom"));
    expect((await post(body)).status).toBe(502);
    expect((await post(body)).status).toBe(200);
    expect(appendRows).toHaveBeenCalledTimes(2);
  });

  it("rate limits after 5 requests from one IP", async () => {
    const h = { "x-forwarded-for": "192.0.2.1" };
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await post("{x", h)).status);
    expect(codes).toEqual([400, 400, 400, 400, 400, 429]);
  });
});
