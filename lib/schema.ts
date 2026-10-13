import { z } from "zod";

export const WEDDING_SIDES = ["Bride", "Groom"] as const;
export const RELATIONSHIP_TYPES = ["Family/Relatives", "Friend"] as const;
export const MEAL_PREFERENCES = ["Chinese", "Vegetarian", "Halal"] as const;

export const MAX_ATTENDEES = 10;

export const attendeeSchema = z.object({
  full_name: z.string().trim().min(1, "Please enter a name").max(100),
  wedding_side: z.enum(WEDDING_SIDES, { message: "Please choose a side" }),
  relationship_type: z.enum(RELATIONSHIP_TYPES, { message: "Please choose one" }),
  meal_preference: z.enum(MEAL_PREFERENCES),
  dietary_restrictions: z.string().trim().max(300).default(""),
});

export const rsvpSchema = z.object({
  contact: z.string().trim().min(3, "Please share a phone or email").max(100),
  attendees: z.array(attendeeSchema).min(1).max(MAX_ATTENDEES),
  website: z.string().max(200).optional(), // honeypot, the API drops submissions where this is filled
  submission_id: z.string().uuid().optional(), // client-generated, makes retries idempotent
});

export type Attendee = z.infer<typeof attendeeSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
