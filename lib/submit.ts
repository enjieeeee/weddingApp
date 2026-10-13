import { rsvpSchema, type RsvpInput } from "./schema";

export type SubmitResult = { ok: true; count: number } | { ok: false; error: string };

export async function submitRsvp(input: RsvpInput): Promise<SubmitResult> {
  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };

  try {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, count: data.count ?? parsed.data.attendees.length };
    return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "Network problem. Please check your connection and try again." };
  }
}
