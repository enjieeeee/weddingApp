import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { buildSeatingPlan } from "@/lib/seating";
import { listRsvpRows, writeTableNumbers } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await listRsvpRows();
    return NextResponse.json(buildSeatingPlan(rows));
  } catch (error) {
    console.error(
      "Seating dashboard read failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not load seating data." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await listRsvpRows();
    const plan = buildSeatingPlan(rows);
    const assignments = new Map<number, number | null>();
    for (const table of plan.tables) {
      for (const member of table.members) assignments.set(member.rowNumber, table.tableNumber);
    }
    for (const party of plan.unassigned) {
      for (const member of party.members) assignments.set(member.rowNumber, null);
    }
    await writeTableNumbers(assignments);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Seating assignment failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not save seating assignments." }, { status: 502 });
  }
}
