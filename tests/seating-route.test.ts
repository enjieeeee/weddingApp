import { beforeEach, describe, expect, it, vi } from "vitest";

const { listRsvpRows, listSeatingAssignments, replaceSeatingAssignments } = vi.hoisted(() => ({
  listRsvpRows: vi.fn(),
  listSeatingAssignments: vi.fn(),
  replaceSeatingAssignments: vi.fn(),
}));

vi.mock("@/lib/sheets", () => ({
  listRsvpRows,
  listSeatingAssignments,
  replaceSeatingAssignments,
}));

import { GET, PATCH } from "@/app/api/admin/seating/route";

const rows = [
  {
    rowNumber: 2,
    partyId: "party-a",
    submittedAt: "",
    fullName: "A",
    weddingSide: "Bride",
    relationshipType: "Friend",
    mealPreference: "Chinese",
    dietaryRestrictions: "",
    contact: "",
    tableNumber: null,
    notes: "",
  },
  {
    rowNumber: 3,
    partyId: "party-b",
    submittedAt: "",
    fullName: "B",
    weddingSide: "Groom",
    relationshipType: "Friend",
    mealPreference: "Chinese",
    dietaryRestrictions: "",
    contact: "",
    tableNumber: null,
    notes: "",
  },
];

function request(method: string, body?: unknown) {
  return new Request("http://localhost/api/admin/seating", {
    method,
    headers: {
      "x-admin-token": "secret",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  process.env.ADMIN_DASHBOARD_TOKEN = "secret";
  listRsvpRows.mockReset();
  listRsvpRows.mockResolvedValue(rows);
  listSeatingAssignments.mockReset();
  listSeatingAssignments.mockResolvedValue([]);
  replaceSeatingAssignments.mockReset();
  replaceSeatingAssignments.mockResolvedValue(undefined);
});

describe("seating configuration API", () => {
  it("rejects unauthorized requests", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/seating", {
        headers: { "x-admin-token": "wrong" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects duplicate row assignments without writing", async () => {
    const response = await PATCH(
      request("PATCH", {
        assignments: [
          { rowNumber: 2, tableNumber: 1 },
          { rowNumber: 2, tableNumber: 2 },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(replaceSeatingAssignments).not.toHaveBeenCalled();
  });

  it("saves a complete arrangement and returns the stored plan", async () => {
    const response = await PATCH(
      request("PATCH", {
        assignments: [
          { rowNumber: 2, tableNumber: 1 },
          { rowNumber: 3, tableNumber: null },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(replaceSeatingAssignments).toHaveBeenCalledWith([
      { rowNumber: 2, tableNumber: 1 },
      { rowNumber: 3, tableNumber: null },
    ]);
    expect((await response.json()).tables[0].tableNumber).toBe(1);
  });

  it("merges saved assignments while leaving new guests unassigned", async () => {
    listSeatingAssignments.mockResolvedValueOnce([{ rowNumber: 2, tableNumber: 4 }]);

    const response = await GET(request("GET"));
    const plan = await response.json();

    expect(plan.tables[0].tableNumber).toBe(4);
    expect(
      plan.unassigned[0].members.map((member: { fullName: string }) => member.fullName),
    ).toEqual(["B"]);
  });
});
