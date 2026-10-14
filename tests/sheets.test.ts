import { beforeEach, describe, expect, it, vi } from "vitest";

const append = vi.fn();
const JWT = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: function (opts: unknown) {
        JWT(opts);
      },
    },
    sheets: () => ({ spreadsheets: { values: { append } } }),
  },
}));

import { appendRows } from "@/lib/sheets";

const ENV = ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "SHEET_ID"] as const;

beforeEach(() => {
  append.mockReset();
  append.mockResolvedValue({});
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
