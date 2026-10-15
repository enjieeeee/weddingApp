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
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plan.tables.map((table) => (
            <TableCard key={table.tableNumber} table={table} matches={matches} />
          ))}
        </div>
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
function TableCard({ table, matches }: { table: Table; matches: (member: Member) => boolean }) {
  return (
    <section className="border border-stone/40 bg-white/20 p-5">
      <div className="flex justify-between">
        <h2 className="font-serif text-3xl italic">Table {table.tableNumber}</h2>
        <span className="text-stone">{table.seatsUsed}/10</span>
      </div>
      <p className="mt-1 text-xs text-stone">
        Bride {table.brideCount} · Groom {table.groomCount}
      </p>
      <div className="mt-4">
        {table.members.filter(matches).map((member) => (
          <MemberRow key={member.rowNumber} member={member} />
        ))}
      </div>
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
