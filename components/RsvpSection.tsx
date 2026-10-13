import RsvpForm from "./RsvpForm";

export default function RsvpSection() {
  return (
    <section id="rsvp" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h2 className="font-serif text-4xl font-light italic sm:text-5xl">RSVP</h2>
      <p className="mx-auto mt-6 mb-12 max-w-sm text-stone">
        Add everyone in your party, one guest at a time.
      </p>
      <RsvpForm />
    </section>
  );
}
