import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { buildSeatingPlan, buildStoredSeatingPlan } from "@/lib/seating";
import { listRsvpRows } from "@/lib/sheets";

export const runtime = "nodejs";

function dashboardPlan(rows: Awaited<ReturnType<typeof listRsvpRows>>) {
  return rows.some((row) => row.tableNumber !== null)
    ? buildStoredSeatingPlan(rows)
    : buildSeatingPlan(rows);
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await listRsvpRows();
    return NextResponse.json(dashboardPlan(rows));
  } catch (error) {
    console.error(
      "Seating dashboard read failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not load seating data." }, { status: 502 });
  }
}
