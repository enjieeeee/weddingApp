import Details from "@/components/Details";
import Hero from "@/components/Hero";
import PhotoGallery from "@/components/PhotoGallery";
import RsvpSection from "@/components/RsvpSection";
import Schedule from "@/components/Schedule";

export default function Home() {
  return (
    <main>
      <Hero />
      <Details />
      <PhotoGallery />
      <Schedule />
      <RsvpSection />
      <footer className="px-6 py-12 text-center text-sm tracking-widest text-stone">
        EnJie &amp; Jeslin
      </footer>
    </main>
  );
}
