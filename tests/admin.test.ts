import { afterEach, describe, expect, it } from "vitest";
import { isAdminAuthorized } from "@/lib/admin";

const original = process.env.ADMIN_DASHBOARD_TOKEN;

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_DASHBOARD_TOKEN;
  else process.env.ADMIN_DASHBOARD_TOKEN = original;
});

describe("isAdminAuthorized", () => {
  it("fails closed when no dashboard token is configured", () => {
    delete process.env.ADMIN_DASHBOARD_TOKEN;
    expect(isAdminAuthorized(new Request("http://localhost"))).toBe(false);
  });

  it("requires an exact token header", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = "secret";
    expect(isAdminAuthorized(new Request("http://localhost"))).toBe(false);
    expect(
      isAdminAuthorized(
        new Request("http://localhost", { headers: { "x-admin-token": "secret" } }),
      ),
    ).toBe(true);
    expect(
      isAdminAuthorized(new Request("http://localhost", { headers: { "x-admin-token": "wrong" } })),
    ).toBe(false);
  });
});
