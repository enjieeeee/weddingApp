import { beforeEach, describe, expect, it, vi } from "vitest";

const append = vi.fn();
const clear = vi.fn();
const update = vi.fn();
const getValues = vi.fn();
const getSpreadsheet = vi.fn();
const batchUpdate = vi.fn();
const JWT = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: function (opts: unknown) {
        JWT(opts);
      },
    },
    sheets: () => ({
      spreadsheets: {
        get: getSpreadsheet,
        batchUpdate,
        values: { append, clear, get: getValues, update },
      },
    }),
  },
}));

import { appendRows, listSeatingAssignments, replaceSeatingAssignments } from "@/lib/sheets";

const ENV = ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "SHEET_ID"] as const;

beforeEach(() => {
  append.mockReset();
  append.mockResolvedValue({});
  clear.mockReset();
  clear.mockResolvedValue({});
  update.mockReset();
  update.mockResolvedValue({});
  getValues.mockReset();
  getValues.mockResolvedValue({ data: { values: [["row_number", "table_number"]] } });
  getSpreadsheet.mockReset();
  getSpreadsheet.mockResolvedValue({
    data: { sheets: [{ properties: { title: "SeatingConfig" } }] },
  });
  batchUpdate.mockReset();
  batchUpdate.mockResolvedValue({});
  JWT.mockReset();
  process.env.GOOGLE_CLIENT_EMAIL = "bot@example.iam.gserviceaccount.com";
  process.env.GOOGLE_PRIVATE_KEY = "line1\\nline2";
  process.env.SHEET_ID = "sheet-123";
});

describe("appendRows", () => {
  it("appends all rows in one call to the RSVPs tab", async () => {
    const rows = [["a"], ["b"]];
    await appendRows(rows);

    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0]).toMatchObject({
      spreadsheetId: "sheet-123",
      range: "RSVPs!A:J",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
  });

  it("converts escaped \\n in the private key to real newlines", async () => {
    await appendRows([["a"]]);
    expect(JWT.mock.calls[0][0].key).toBe("line1\nline2");
  });

  it.each(ENV)("throws when %s is missing", async (name) => {
    delete process.env[name];
    await expect(appendRows([["a"]])).rejects.toThrow(
      "Missing Google Sheets environment variables",
    );
    expect(append).not.toHaveBeenCalled();
  });

  it("propagates Sheets API errors so the route can return 502", async () => {
    append.mockRejectedValueOnce(new Error("quota"));
    await expect(appendRows([["a"]])).rejects.toThrow("quota");
  });
});

describe("seating configuration", () => {
  it("reads saved assignments from the dedicated tab", async () => {
    getValues.mockResolvedValueOnce({
      data: {
        values: [
          ["row_number", "table_number"],
          ["4", "2"],
          ["5", ""],
          ["invalid", "3"],
        ],
      },
    });

    await expect(listSeatingAssignments()).resolves.toEqual([
      { rowNumber: 4, tableNumber: 2 },
      { rowNumber: 5, tableNumber: null },
    ]);
    expect(getValues).toHaveBeenCalledWith({
      spreadsheetId: "sheet-123",
      range: "SeatingConfig!A:B",
    });
  });

  it("replaces saved assignments in sorted row order", async () => {
    await replaceSeatingAssignments([
      { rowNumber: 8, tableNumber: null },
      { rowNumber: 3, tableNumber: 1 },
    ]);

    expect(clear).toHaveBeenCalledWith({
      spreadsheetId: "sheet-123",
      range: "SeatingConfig!A:B",
    });
    expect(update).toHaveBeenCalledWith({
      spreadsheetId: "sheet-123",
      range: "SeatingConfig!A:B",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["row_number", "table_number"],
          [3, 1],
          [8, ""],
        ],
      },
    });
  });

  it("creates the dedicated tab when it does not exist", async () => {
    getSpreadsheet.mockResolvedValueOnce({ data: { sheets: [] } });

    await listSeatingAssignments();

    expect(batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: "sheet-123",
      requestBody: {
        requests: [{ addSheet: { properties: { title: "SeatingConfig" } } }],
      },
    });
  });
});
