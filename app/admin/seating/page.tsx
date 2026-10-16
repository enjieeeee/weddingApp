"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Member = {
  rowNumber: number;
  partyId: string;
  fullName: string;
  weddingSide: string;
  relationshipType: string;
  mealPreference: string;
  tableNumber: number | null;
  notes: string;
};
type Table = {
  tableNumber: number;
  members: Member[];
  seatsUsed: number;
  brideCount: number;
  groomCount: number;
};
type Plan = {
  tables: Table[];
  unassigned: { partyId: string; members: Member[] }[];
  totalGuests: number;
};

type Seat = Member | null;
type SeatLayout = Record<number, Seat[]>;

function createSeatLayout(plan: Plan): SeatLayout {
  return Object.fromEntries(
    plan.tables.map((table) => [
      table.tableNumber,
      [...table.members, ...Array<null>(10 - table.members.length).fill(null)],
    ]),
  );
}

function tableWithSeats(table: Table, seats: Seat[]): Table {
  const members = seats.filter((member): member is Member => member !== null);
  return {
    ...table,
    members,
    seatsUsed: members.length,
    brideCount: members.filter((member) => member.weddingSide === "Bride").length,
    groomCount: members.filter((member) => member.weddingSide === "Groom").length,
  };
}

function groupUnassigned(members: Member[]) {
  const grouped = new Map<string, Member[]>();
  for (const member of members) {
    grouped.set(member.partyId, [...(grouped.get(member.partyId) ?? []), member]);
  }
  return [...grouped].map(([partyId, partyMembers]) => ({ partyId, members: partyMembers }));
}

function moveMember(
  plan: Plan,
  seatLayout: SeatLayout,
  rowNumber: number,
  targetTable: number | null,
  targetSeat: number | null,
) {
  const nextSeats: SeatLayout = Object.fromEntries(
    Object.entries(seatLayout).map(([tableNumber, seats]) => [tableNumber, [...seats]]),
  );
  const allMembers = [
    ...Object.values(nextSeats).flatMap((seats) =>
      seats.filter((member): member is Member => member !== null),
    ),
    ...plan.unassigned.flatMap((party) => party.members),
  ];
  const member = allMembers.find((candidate) => candidate.rowNumber === rowNumber);
  if (!member) return { plan, seatLayout };
  let sourceTable: number | null = null;
  let sourceSeat: number | null = null;
  for (const [tableNumber, seats] of Object.entries(nextSeats)) {
    const index = seats.findIndex((candidate) => candidate?.rowNumber === rowNumber);
    if (index !== -1) {
      sourceTable = Number(tableNumber);
      sourceSeat = index;
      break;
    }
  }
  let unassignedMembers = plan.unassigned
    .flatMap((party) => party.members)
    .filter((candidate) => candidate.rowNumber !== rowNumber);

  if (sourceTable !== null && sourceSeat !== null && targetTable === null) {
    nextSeats[sourceTable][sourceSeat] = null;
    unassignedMembers = [...unassignedMembers, member];
  } else if (targetTable !== null && targetSeat !== null) {
    const targetMember = nextSeats[targetTable][targetSeat];
    if (targetMember && sourceTable !== null && sourceSeat !== null) {
      nextSeats[sourceTable][sourceSeat] = targetMember;
      nextSeats[targetTable][targetSeat] = member;
    } else {
      if (sourceTable !== null && sourceSeat !== null) nextSeats[sourceTable][sourceSeat] = null;
      if (targetMember) unassignedMembers = [...unassignedMembers, targetMember];
      nextSeats[targetTable][targetSeat] = member;
    }
  }

  return {
    plan: {
      ...plan,
      tables: plan.tables.map((table) => tableWithSeats(table, nextSeats[table.tableNumber])),
      unassigned: groupUnassigned(unassignedMembers),
    },
    seatLayout: nextSeats,
  };
}

export default function SeatingDashboard() {
  const [token, setToken] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [seatLayout, setSeatLayout] = useState<SeatLayout>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const dropHandled = useRef(false);

  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/seating", {
      headers: { "x-admin-token": token },
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Request failed.");
    setPlan(data);
    setSeatLayout(createSeatLayout(data));
  }, [token]);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-token") ?? "";
    if (saved) {
      setToken(saved);
      fetch("/api/admin/seating", { headers: { "x-admin-token": saved } })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            setPlan(data);
            setSeatLayout(createSeatLayout(data));
          }
        })
        .catch(() => undefined);
    }
  }, []);

  function signIn(event: React.FormEvent) {
    event.preventDefault();
    sessionStorage.setItem("admin-token", token);
    void load();
  }

  function handleDrop(
    event: React.DragEvent,
    targetTable: number | null,
    targetSeat: number | null,
  ) {
    event.preventDefault();
    const rowNumber = Number(event.dataTransfer.getData("text/row-number"));
    if (!Number.isInteger(rowNumber)) return;
    dropHandled.current = true;
    setSaveMessage("");
    setError("");
    setPlan((current) => {
      if (!current) return current;
      const moved = moveMember(current, seatLayout, rowNumber, targetTable, targetSeat);
      setSeatLayout(moved.seatLayout);
      return moved.plan;
    });
    setDirty(true);
    setDraggingRow(null);
  }

  function handleDragEnd() {
    if (draggingRow !== null && !dropHandled.current) {
      setPlan((current) => {
        if (!current) return current;
        const moved = moveMember(current, seatLayout, draggingRow, null, null);
        setSeatLayout(moved.seatLayout);
        return moved.plan;
      });
      setDirty(true);
    }
    setDraggingRow(null);
  }

  async function saveManualLayout() {
    if (!plan) return;
    setSaving(true);
    setSaveMessage("");
    setError("");
    const assignments = [
      ...plan.tables.flatMap((table) =>
        table.members.map((member) => ({
          rowNumber: member.rowNumber,
          tableNumber: table.tableNumber,
        })),
      ),
      ...plan.unassigned.flatMap((party) =>
        party.members.map((member) => ({ rowNumber: member.rowNumber, tableNumber: null })),
      ),
    ];
    try {
      const response = await fetch("/api/admin/seating", {
        method: "PATCH",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save seating configuration.");
      setPlan(data);
      setSeatLayout(createSeatLayout(data));
      setDirty(false);
      setEditMode(false);
      setSaveMessage("Seating configuration saved.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Could not save seating configuration.";
      console.error("Seating configuration save failed:", message);
      setError(message);
      setEditMode(true);
    } finally {
      setSaving(false);
    }
  }

  function toggleEditMode() {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    if (dirty) {
      void saveManualLayout();
    } else {
      setEditMode(false);
    }
  }

  const matches = (member: Member) =>
    `${member.fullName} ${member.weddingSide} ${member.relationshipType} ${member.mealPreference}`
      .toLowerCase()
      .includes(query.toLowerCase());

  if (!plan) {
    return (
      <main className="mx-auto max-w-md px-6 py-24">
        <h1 className="font-serif text-5xl italic">Seating dashboard</h1>
        <p className="mt-4 text-stone">Enter the admin token to view RSVP seating.</p>
        <form onSubmit={signIn} className="mt-8 space-y-4">
          <input
            className="w-full rounded-lg border border-stone bg-transparent p-3"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <button className="w-full rounded-lg bg-ink p-3 text-paper" type="submit">
            Open dashboard
          </button>
        </form>
        {error && <p className="mt-4 text-clay">{error}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone">Private admin</p>
            <h1 className="font-serif text-5xl italic">Seating dashboard</h1>
          </div>
          <div className="flex gap-3">
            <input
              className="rounded-lg border border-stone bg-transparent p-3"
              placeholder="Search participants"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="my-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Guests" value={plan.totalGuests} />
          <Stat label="Tables" value={plan.tables.length} />
          <Stat label="Assigned" value={plan.tables.reduce((n, table) => n + table.seatsUsed, 0)} />
          <Stat
            label="Unassigned"
            value={plan.unassigned.reduce((n, party) => n + party.members.length, 0)}
          />
        </div>
        {error && <p className="mb-4 text-clay">{error}</p>}
        {saveMessage && <p className="mb-4 text-sage">{saveMessage}</p>}
        <div className="mt-8 grid items-start gap-4 xl:min-w-[1440px] xl:grid-cols-[1152px_15rem]">
          <section className="overflow-x-auto rounded-2xl border border-stone/30 bg-white/10 p-2 sm:p-4">
            <div className="mx-auto min-w-[900px]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-serif text-3xl italic">Floor plan</h2>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-clay px-3 py-2 text-xs uppercase tracking-wider"
                    onClick={toggleEditMode}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editMode ? "Done editing" : "Edit layout"}
                  </button>
                </div>
              </div>
              <div>
                <div className="mx-auto mb-4 flex w-72 flex-col items-center">
                  <div className="w-full rounded-t-full border border-clay bg-blush px-4 py-3 text-center text-xs uppercase tracking-[0.25em] text-ink">
                    Front
                  </div>
                  <div className="w-60 rounded-b-lg border-x border-b border-clay bg-clay/20 px-4 py-3 text-center text-[10px] text-stone">
                    Podium
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-x-3 gap-y-6">
                  {plan.tables.map((table, index) => (
                    <div
                      className={index < 2 ? "col-span-2" : "col-span-1"}
                      key={table.tableNumber}
                    >
                      <TableMap
                        table={table}
                        seats={seatLayout[table.tableNumber] ?? Array<null>(10).fill(null)}
                        matches={matches}
                        editMode={editMode}
                        onDrop={(event, tableNumber, seatNumber) =>
                          handleDrop(event, tableNumber, seatNumber)
                        }
                        onDragStart={(rowNumber, event) => {
                          dropHandled.current = false;
                          event.dataTransfer.setData("text/row-number", String(rowNumber));
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingRow(rowNumber);
                        }}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-clay/60 bg-white/10 p-3">
            <UnassignedPanel
              members={plan.unassigned.flatMap((party) => party.members).filter(matches)}
              editMode={editMode}
              onDrop={(event) => handleDrop(event, null, null)}
              onDragStart={(rowNumber, event) => {
                dropHandled.current = false;
                event.dataTransfer.setData("text/row-number", String(rowNumber));
                event.dataTransfer.effectAllowed = "move";
                setDraggingRow(rowNumber);
              }}
              onDragEnd={handleDragEnd}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone/40 p-4">
      <p className="text-xs uppercase tracking-widest text-stone">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
function TableMap({
  table,
  seats,
  matches,
  editMode,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  table: Table;
  seats: Seat[];
  matches: (member: Member) => boolean;
  editMode: boolean;
  onDrop: (event: React.DragEvent, tableNumber: number, seatNumber: number) => void;
  onDragStart: (rowNumber: number, event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const hoveredMember = editMode || hoveredSeat === null ? null : seats[hoveredSeat];

  return (
    <section
      className={`relative mx-auto h-[13rem] w-[12rem] ${editMode ? "rounded-xl outline-dashed outline-1 outline-clay/50" : ""}`}
    >
      <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-sage bg-paper text-center shadow-[0_6px_14px_rgba(58,54,49,0.12)]">
        <h2 className="font-serif text-lg italic">Table {table.tableNumber}</h2>
        <span className="text-[10px] text-stone">{table.seatsUsed}/10 seats</span>
        <span className="mt-1 text-[8px] uppercase tracking-wider text-stone">
          B {table.brideCount} · G {table.groomCount}
        </span>
      </div>
      {seats.map((member, index) => {
        const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
        const left = 50 + Math.cos(angle) * 32;
        const top = 50 + Math.sin(angle) * 32;
        const active = member ? matches(member) : true;
        return (
          <div
            key={member?.rowNumber ?? `empty-${index}`}
            className={`absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-center text-[8px] leading-tight shadow-sm transition-opacity ${
              member
                ? "border-clay bg-blush text-ink"
                : "border-dashed border-stone/50 bg-transparent text-stone"
            } ${active ? "opacity-100" : "opacity-20"} ${
              editMode ? "cursor-grab ring-1 ring-clay/30 active:cursor-grabbing" : ""
            } group group-hover:z-[9999] group-focus-within:z-[9999]`}
            style={{ left: `${left}%`, top: `${top}%` }}
            tabIndex={member ? 0 : -1}
            aria-label={member ? `${member.fullName} seat details` : "Open seat"}
            onMouseEnter={() => !editMode && member && setHoveredSeat(index)}
            onMouseLeave={() => !editMode && setHoveredSeat(null)}
            onFocus={() => !editMode && member && setHoveredSeat(index)}
            onBlur={() => setHoveredSeat(null)}
            onDragOver={(event) => editMode && event.preventDefault()}
            onDrop={(event) => {
              if (editMode) {
                event.stopPropagation();
                onDrop(event, table.tableNumber, index);
              }
            }}
            draggable={editMode && Boolean(member)}
            onDragStart={(event) => member && onDragStart(member.rowNumber, event)}
            onDragEnd={onDragEnd}
          >
            {member ? (
              <span className="block max-w-[2.5rem] break-words text-center">
                {member.fullName}
              </span>
            ) : (
              <span className="text-center">Open</span>
            )}
          </div>
        );
      })}
      {hoveredMember && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[10000] w-48 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-stone/30 bg-ink p-3 text-left text-[10px] leading-relaxed text-paper shadow-xl">
          <p className="font-semibold text-blush">{hoveredMember.fullName}</p>
          <p>
            {hoveredMember.weddingSide} · {hoveredMember.relationshipType}
          </p>
          <p>Meal: {hoveredMember.mealPreference}</p>
          {hoveredMember.notes && <p>Note: {hoveredMember.notes}</p>}
          {hoveredMember.tableNumber && <p>Table: {hoveredMember.tableNumber}</p>}
        </div>
      )}
    </section>
  );
}

function UnassignedPanel({
  members,
  editMode,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  members: Member[];
  editMode: boolean;
  onDrop: (event: React.DragEvent, tableNumber: null) => void;
  onDragStart: (rowNumber: number, event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <aside
      className={`min-h-[8rem] rounded-xl border border-clay p-3 ${editMode ? "bg-blush/20 outline-dashed outline-1 outline-clay" : ""}`}
      onDragOver={(event) => editMode && event.preventDefault()}
      onDrop={(event) => editMode && onDrop(event, null)}
    >
      <h3 className="font-serif text-2xl italic">Unassigned</h3>
      <p className="mt-1 text-[10px] text-stone">
        {editMode ? "Drop seats here or drag outside a zone." : "Guests without a table"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {members.map((member) => (
          <div
            key={member.rowNumber}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-clay bg-blush text-center text-[8px] leading-tight text-ink shadow-sm ${
              editMode ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            draggable={editMode}
            onDragStart={(event) => onDragStart(member.rowNumber, event)}
            onDragEnd={onDragEnd}
            title={member.fullName}
          >
            <span className="block max-w-[2.5rem] break-words text-center">{member.fullName}</span>
          </div>
        ))}
        {members.length === 0 && <p className="py-4 text-xs text-stone">No unassigned guests.</p>}
      </div>
    </aside>
  );
}
function MemberRow({ member }: { member: Member }) {
  return (
    <div className="border-t border-stone/20 py-3">
      <p>{member.fullName}</p>
      <p className="text-xs text-stone">
        {member.weddingSide} · {member.relationshipType} · {member.mealPreference}
      </p>
    </div>
  );
}
