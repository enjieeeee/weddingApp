import { type Attendee, MEAL_PREFERENCES, RELATIONSHIP_TYPES, WEDDING_SIDES } from "@/lib/schema";

export type AttendeeDraft = Omit<Attendee, "wedding_side" | "relationship_type"> & {
  wedding_side: Attendee["wedding_side"] | "";
  relationship_type: Attendee["relationship_type"] | "";
};

const field =
  "w-full border-0 border-b border-stone/50 bg-transparent px-0 py-2 text-base outline-none transition focus:border-ink";
const label = "mb-1 block text-xs uppercase tracking-[0.25em] text-stone";

type Props = {
  index: number;
  value: AttendeeDraft;
  errors: Partial<Record<keyof AttendeeDraft, string>>;
  canRemove: boolean;
  onChange: (patch: Partial<AttendeeDraft>) => void;
  onRemove: () => void;
};

export default function AttendeeFields({
  index,
  value,
  errors,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const id = (n: string) => `a${index}-${n}`;
  return (
    <fieldset className="space-y-5 border-t border-stone/30 pt-6 text-left">
      <legend className="flex w-full items-center justify-between">
        <span className="font-serif text-2xl italic">Guest {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs uppercase tracking-widest text-stone hover:text-ink"
          >
            Remove
          </button>
        )}
      </legend>

      <div>
        <label htmlFor={id("name")} className={label}>
          Full name
        </label>
        <input
          id={id("name")}
          className={field}
          autoComplete="name"
          value={value.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
        />
        {errors.full_name && <p className="mt-1 text-sm text-clay">{errors.full_name}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={id("side")} className={label}>
            Guest of
          </label>
          <select
            id={id("side")}
            className={field}
            value={value.wedding_side}
            onChange={(e) =>
              onChange({ wedding_side: e.target.value as AttendeeDraft["wedding_side"] })
            }
          >
            <option value="">Select</option>
            {WEDDING_SIDES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.wedding_side && <p className="mt-1 text-sm text-clay">{errors.wedding_side}</p>}
        </div>
        <div>
          <label htmlFor={id("rel")} className={label}>
            Relationship
          </label>
          <select
            id={id("rel")}
            className={field}
            value={value.relationship_type}
            onChange={(e) =>
              onChange({ relationship_type: e.target.value as AttendeeDraft["relationship_type"] })
            }
          >
            <option value="">Select</option>
            {RELATIONSHIP_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.relationship_type && (
            <p className="mt-1 text-sm text-clay">{errors.relationship_type}</p>
          )}
        </div>
      </div>

      <div>
        <span className={label}>Meal</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_PREFERENCES.map((m) => (
            <label
              key={m}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                value.meal_preference === m
                  ? "border-ink bg-ink text-paper"
                  : "border-stone/50 hover:border-ink"
              }`}
            >
              <input
                type="radio"
                name={id("meal")}
                className="sr-only"
                checked={value.meal_preference === m}
                onChange={() => onChange({ meal_preference: m })}
              />
              {m}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={id("diet")} className={label}>
          Allergies or dietary notes (optional)
        </label>
        <input
          id={id("diet")}
          className={field}
          value={value.dietary_restrictions}
          onChange={(e) => onChange({ dietary_restrictions: e.target.value })}
        />
      </div>
    </fieldset>
  );
}
