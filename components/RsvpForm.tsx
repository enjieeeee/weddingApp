"use client";

import { useRef, useState } from "react";
import { MAX_ATTENDEES, rsvpSchema } from "@/lib/schema";
import { submitRsvp } from "@/lib/submit";
import AttendeeFields, { type AttendeeDraft } from "./AttendeeFields";

type AttendeeErrors = Partial<Record<keyof AttendeeDraft, string>>;

const blank = (prev?: AttendeeDraft): AttendeeDraft => ({
  full_name: "",
  // Parties usually share a side and relationship, so copy from the previous guest.
  wedding_side: prev?.wedding_side ?? "",
  relationship_type: prev?.relationship_type ?? "",
  meal_preference: "Chinese",
  dietary_restrictions: "",
});

export default function RsvpForm() {
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([blank()]);
  const [contactError, setContactError] = useState("");
  const [errors, setErrors] = useState<AttendeeErrors[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Ref blocks a second click in the same tick, before state has re-rendered.
  const inFlight = useRef(false);
  // Stable per form visit, so a retry after a failure cannot create duplicate rows.
  const submissionId = useRef(crypto.randomUUID());
  const [done, setDone] = useState<{ count: number } | null>(null);

  const update = (i: number, patch: Partial<AttendeeDraft>) =>
    setAttendees((list) => list.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || inFlight.current) return;
    setFormError("");

    const parsed = rsvpSchema.safeParse({ contact, attendees, website, submission_id: submissionId.current });
    if (!parsed.success) {
      const next: AttendeeErrors[] = attendees.map(() => ({}));
      let c = "";
      for (const issue of parsed.error.issues) {
        const [root, idx, key] = issue.path;
        if (root === "contact") c = issue.message;
        if (root === "attendees" && typeof idx === "number" && typeof key === "string") {
          next[idx][key as keyof AttendeeDraft] ??= issue.message;
        }
      }
      setContactError(c);
      setErrors(next);
      return;
    }

    setContactError("");
    setErrors([]);
    inFlight.current = true;
    setSubmitting(true);
    const result = await submitRsvp(parsed.data);
    inFlight.current = false;
    setSubmitting(false);
    if (result.ok) setDone({ count: result.count });
    else setFormError(result.error);
  }

  if (done) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif text-3xl italic">Thank you, see you there.</p>
        <p className="mt-4 text-stone">
          {`We have your RSVP for ${done.count} ${done.count === 1 ? "guest" : "guests"}.`}
        </p>
      </div>
    );
  }

  const input =
    "w-full border-0 border-b border-stone/50 bg-transparent px-0 py-2 text-base outline-none transition focus:border-ink";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <div className="text-left">
        <label htmlFor="contact" className="mb-1 block text-xs uppercase tracking-[0.25em] text-stone">
          Phone or email
        </label>
        <input id="contact" className={input} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
        {contactError && <p className="mt-1 text-sm text-clay">{contactError}</p>}
      </div>

      <div className="space-y-8">
        {attendees.map((a, i) => (
          <AttendeeFields
            key={i}
            index={i}
            value={a}
            errors={errors[i] ?? {}}
            canRemove={attendees.length > 1}
            onChange={(patch) => update(i, patch)}
            onRemove={() => setAttendees((l) => l.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>

      {attendees.length < MAX_ATTENDEES && (
        <button
          type="button"
          onClick={() => setAttendees((l) => [...l, blank(l[l.length - 1])])}
          className="text-sm uppercase tracking-[0.25em] text-sage hover:text-ink"
        >
          + Add another guest
        </button>
      )}

      {/* Honeypot: hidden from people, bots tend to fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {formError && <p className="text-clay">{formError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full border border-ink bg-ink px-8 py-4 text-xs uppercase tracking-[0.3em] text-paper transition hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send RSVP"}
      </button>
    </form>
  );
}
