import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { applySeatingAssignments, buildSeatingPlan, buildStoredSeatingPlan } from "@/lib/seating";
import {
  listRsvpRows,
  listSeatingAssignments,
  replaceSeatingAssignments,
  type SeatingAssignment,
} from "@/lib/sheets";

export const runtime = "nodejs";

function dashboardPlan(
  rows: Awaited<ReturnType<typeof listRsvpRows>>,
  assignments: SeatingAssignment[],
) {
  return assignments.length
    ? buildStoredSeatingPlan(applySeatingAssignments(rows, assignments))
    : buildSeatingPlan(rows);
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await listRsvpRows();
    const assignments = await listSeatingAssignments();
    return NextResponse.json(dashboardPlan(rows, assignments));
  } catch (error) {
    console.error(
      "Seating dashboard read failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not load seating data." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { assignments?: SeatingAssignment[] };
    if (
      !Array.isArray(body.assignments) ||
      body.assignments.length === 0 ||
      body.assignments.some(
        (assignment) =>
          !Number.isInteger(assignment.rowNumber) ||
          assignment.rowNumber < 2 ||
          (assignment.tableNumber !== null &&
            (!Number.isInteger(assignment.tableNumber) || assignment.tableNumber < 1)),
      ) ||
      new Set(body.assignments.map((assignment) => assignment.rowNumber)).size !==
        body.assignments.length
    ) {
      return NextResponse.json({ error: "Invalid seating assignments." }, { status: 400 });
    }
    await replaceSeatingAssignments(body.assignments);
    const rows = await listRsvpRows();
    return NextResponse.json(dashboardPlan(rows, body.assignments));
  } catch (error) {
    console.error(
      "Seating configuration save failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not save seating configuration." }, { status: 502 });
  }
}
