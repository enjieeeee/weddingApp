import { siteConfig } from "@/lib/site";

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function Details() {
  const items = [
    { label: "Date", value: siteConfig.dateLabel },
    { label: "Time", value: siteConfig.timeLabel },
    { label: "Venue", value: siteConfig.venue },
  ];
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h2 className="font-serif text-4xl font-light italic sm:text-5xl">Join us</h2>
      <p className="mx-auto mt-6 max-w-md text-stone">
        A quiet celebration with the people we love most. We would be honoured to have you with us.
      </p>
      <dl className="mt-14 grid gap-10 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-xs uppercase tracking-[0.3em] text-sage">{i.label}</dt>
            <dd className="mt-3 font-serif text-2xl">{i.value}</dd>
          </div>
        ))}
      </dl>
      {mapsKey && (
        <div className="mt-14 overflow-hidden rounded-lg">
          <iframe
            title={`Map of ${siteConfig.venue}`}
            src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(siteConfig.venueAddress)}`}
            className="h-100 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </section>
  );
}
