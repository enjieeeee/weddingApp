"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  rowNumber: number;
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

export default function SeatingDashboard() {
  const [token, setToken] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (write = false) => {
      setError("");
      setSaving(write);
      const response = await fetch("/api/admin/seating", {
        method: write ? "POST" : "GET",
        headers: { "x-admin-token": token },
      });
      const data = await response.json();
      setSaving(false);
      if (!response.ok) return setError(data.error ?? "Request failed.");
      setPlan(data);
    },
    [token],
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-token") ?? "";
    if (saved) {
      setToken(saved);
      fetch("/api/admin/seating", { headers: { "x-admin-token": saved } })
        .then(async (response) => (response.ok ? setPlan(await response.json()) : undefined))
        .catch(() => undefined);
    }
  }, []);

  function signIn(event: React.FormEvent) {
    event.preventDefault();
    sessionStorage.setItem("admin-token", token);
    void load();
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
            className="w-full border border-stone bg-transparent p-3"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <button className="w-full bg-ink p-3 text-paper" type="submit">
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
              className="border border-stone bg-transparent p-3"
              placeholder="Search participants"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="bg-clay px-4 py-3 text-paper"
              onClick={() => void load(true)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Assign tables"}
            </button>
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
        <section className="mt-8 overflow-x-auto border border-stone/30 bg-white/10 p-2 sm:p-4">
          <div className="mx-auto min-w-[900px]">
            <div className="mx-auto mb-4 flex w-32 flex-col items-center">
              <div className="w-full rounded-t-full border border-clay bg-blush px-3 py-2 text-center text-xs uppercase tracking-[0.25em] text-ink">
                Front
              </div>
              <div className="w-20 rounded-b-lg border-x border-b border-clay bg-clay/20 px-2 py-1 text-center text-[10px] text-stone">
                Podium
              </div>
            </div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-6">
              {plan.tables.map((table, index) => (
                <div className={index < 2 ? "col-span-2" : "col-span-1"} key={table.tableNumber}>
                  <TableMap table={table} matches={matches} />
                </div>
              ))}
            </div>
          </div>
        </section>
        {plan.unassigned.length > 0 && (
          <section className="mt-8 border border-clay p-5">
            <h2 className="font-serif text-3xl italic">Unassigned parties</h2>
            {plan.unassigned
              .flatMap((party) => party.members)
              .filter(matches)
              .map((member) => (
                <MemberRow key={member.rowNumber} member={member} />
              ))}
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-stone/40 p-4">
      <p className="text-xs uppercase tracking-widest text-stone">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
function TableMap({ table, matches }: { table: Table; matches: (member: Member) => boolean }) {
  const seats = Array.from({ length: 10 }, (_, index) => table.members[index] ?? null);
  return (
    <section className="relative mx-auto h-[13rem] w-[12rem]">
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
            } ${active ? "opacity-100" : "opacity-20"}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            title={
              member
                ? `${member.fullName} · ${member.weddingSide} · ${member.relationshipType} · ${member.mealPreference}`
                : "Open seat"
            }
          >
            {member ? (
              <span className="block max-w-[2.5rem] truncate text-center">{member.fullName}</span>
            ) : (
              <span className="text-center">Open</span>
            )}
          </div>
        );
      })}
    </section>
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
