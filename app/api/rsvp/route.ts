import { NextResponse } from "next/server";
import { rsvpSchema } from "@/lib/schema";
import { toRows } from "@/lib/rows";
import { appendRows } from "@/lib/sheets";
import { getDuplicate, rateLimit, rememberSubmission } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const RATE_LIMIT = 5; // submissions per IP
const RATE_WINDOW_MS = 10 * 60 * 1000;

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  // Honeypot filled: pretend success so bots learn nothing, but write nothing.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, count: parsed.data.attendees.length });
  }

  const subId = parsed.data.submission_id;
  if (subId) {
    const prior = getDuplicate(subId);
    if (prior !== null) return NextResponse.json({ ok: true, count: prior });
  }

  // party_id and timestamp are generated here, never trusted from the client.
  const partyId = crypto.randomUUID();
  const rows = toRows(parsed.data, partyId, new Date().toISOString());

  try {
    await appendRows(rows);
  } catch (err) {
    console.error("Sheets append failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { error: "We could not save your RSVP. Please try again in a moment." },
      { status: 502 },
    );
  }

  if (subId) rememberSubmission(subId, rows.length);
  return NextResponse.json({ ok: true, count: rows.length });
}
