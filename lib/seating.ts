import type { SeatingAssignment, SheetRsvpRow } from "./sheets";

export const TABLE_CAPACITY = 10;

export type SeatingParty = {
  partyId: string;
  members: SheetRsvpRow[];
  weddingSides: string[];
  relationshipTypes: string[];
};

export type SeatingTable = {
  tableNumber: number;
  members: SheetRsvpRow[];
  seatsUsed: number;
  brideCount: number;
  groomCount: number;
};

export type SeatingPlan = {
  tables: SeatingTable[];
  unassigned: SeatingParty[];
  totalGuests: number;
};

export function buildStoredSeatingPlan(rows: SheetRsvpRow[]): SeatingPlan {
  const tables = new Map<number, SheetRsvpRow[]>();
  const unassignedGroups = new Map<string, SheetRsvpRow[]>();
  for (const row of rows) {
    if (row.tableNumber === null) {
      unassignedGroups.set(row.partyId, [...(unassignedGroups.get(row.partyId) ?? []), row]);
    } else {
      tables.set(row.tableNumber, [...(tables.get(row.tableNumber) ?? []), row]);
    }
  }
  const tableNumbers = [...tables.keys()].sort((a, b) => a - b);
  return {
    tables: tableNumbers.map((tableNumber) => {
      const members = tables.get(tableNumber) ?? [];
      return {
        tableNumber,
        members,
        seatsUsed: members.length,
        brideCount: members.filter((member) => member.weddingSide === "Bride").length,
        groomCount: members.filter((member) => member.weddingSide === "Groom").length,
      };
    }),
    unassigned: [...unassignedGroups].map(([partyId, members]) => ({
      partyId,
      members,
      weddingSides: [...new Set(members.map((member) => member.weddingSide))],
      relationshipTypes: [...new Set(members.map((member) => member.relationshipType))],
    })),
    totalGuests: rows.length,
  };
}

export function applySeatingAssignments(
  rows: SheetRsvpRow[],
  assignments: SeatingAssignment[],
): SheetRsvpRow[] {
  const saved = new Map(assignments.map(({ rowNumber, tableNumber }) => [rowNumber, tableNumber]));
  return rows.map((row) => ({
    ...row,
    tableNumber: saved.has(row.rowNumber) ? (saved.get(row.rowNumber) ?? null) : null,
  }));
}

function partyScore(table: SeatingTable, party: SeatingParty) {
  const size = party.members.length;
  const side = party.weddingSides[0];
  const sideCount = side === "Bride" ? table.brideCount : side === "Groom" ? table.groomCount : 0;
  const opposingCount =
    side === "Bride" ? table.groomCount : side === "Groom" ? table.brideCount : 0;
  const relationshipMatch = party.relationshipTypes.some((type) =>
    table.members.some((member) => member.relationshipType === type),
  )
    ? 1
    : 0;
  return [
    table.seatsUsed + size,
    Math.abs(opposingCount - sideCount),
    -relationshipMatch,
    table.tableNumber,
  ];
}

function compareScores(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function buildSeatingPlan(rows: SheetRsvpRow[], capacity = TABLE_CAPACITY): SeatingPlan {
  const groups = new Map<string, SheetRsvpRow[]>();
  for (const row of rows) groups.set(row.partyId, [...(groups.get(row.partyId) ?? []), row]);
  const parties = [...groups].map(([partyId, members]) => ({
    partyId,
    members: [...members].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    weddingSides: [...new Set(members.map((member) => member.weddingSide))],
    relationshipTypes: [...new Set(members.map((member) => member.relationshipType))],
  }));
  parties.sort((a, b) => b.members.length - a.members.length || a.partyId.localeCompare(b.partyId));

  const tables: SeatingTable[] = [];
  const unassigned: SeatingParty[] = [];
  for (const party of parties) {
    if (party.members.length > capacity) {
      unassigned.push(party);
      continue;
    }
    const candidates = tables.filter((table) => table.seatsUsed + party.members.length <= capacity);
    if (candidates.length === 0) {
      tables.push({
        tableNumber: tables.length + 1,
        members: [],
        seatsUsed: 0,
        brideCount: 0,
        groomCount: 0,
      });
    }
    const target = (candidates.length ? candidates : tables.slice(-1)).sort((a, b) =>
      compareScores(partyScore(a, party), partyScore(b, party)),
    )[0];
    target.members.push(...party.members);
    target.seatsUsed += party.members.length;
    target.brideCount += party.members.filter((member) => member.weddingSide === "Bride").length;
    target.groomCount += party.members.filter((member) => member.weddingSide === "Groom").length;
  }
  return { tables, unassigned, totalGuests: rows.length };
}
