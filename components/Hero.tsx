import HeroSlideshow from "@/components/HeroSlideshow";
import { siteConfig } from "@/lib/site";

export default function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <HeroSlideshow slides={siteConfig.slideshow} />
      <p className="mb-6 text-xs uppercase tracking-[0.35em] text-stone">We are getting married</p>
      <h1 className="font-serif text-6xl font-light leading-tight sm:text-8xl">
        EnJie
        <span className="block font-serif text-3xl italic text-clay sm:text-5xl">&amp;</span>
        Jeslin
      </h1>
      <div className="my-8 h-px w-16 bg-sage" />
      <p className="font-serif text-2xl sm:text-3xl">{siteConfig.dateLabel}</p>
      <p className="mt-2 text-sm tracking-widest text-stone">{siteConfig.timeLabel}</p>
      <a
        href="#rsvp"
        className="mt-12 rounded-full border border-ink/40 px-8 py-3 text-xs uppercase tracking-[0.3em] transition hover:bg-ink hover:text-paper"
      >
        RSVP
      </a>
    </section>
  );
}
