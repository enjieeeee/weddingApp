import { siteConfig } from "@/lib/site";

export default function Schedule() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <h2 className="text-center font-serif text-4xl font-light italic sm:text-5xl">Schedule</h2>
      <p className="mt-12 text-xs uppercase tracking-[0.3em] text-stone">
        {siteConfig.scheduleDateLabel}
      </p>
      <ol className="mt-8 border-l border-stone/40">
        {siteConfig.schedule.map((e) => (
          <li key={e.title} className="relative pb-12 pl-8 last:pb-0">
            <span className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full border border-stone bg-white" />
            <h3 className="font-serif text-2xl sm:text-3xl">{e.title}</h3>
            {e.attire && <p className="mt-3 text-sm text-stone">{e.attire}</p>}
            <p className="mt-3 text-stone">{e.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
