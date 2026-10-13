import Hero from "@/components/Hero";
import Details from "@/components/Details";
import PhotoGallery from "@/components/PhotoGallery";
import RsvpSection from "@/components/RsvpSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <Details />
      <PhotoGallery />
      <RsvpSection />
      <footer className="px-6 py-12 text-center text-sm tracking-widest text-stone">
        EnJie &amp; Jeslin
      </footer>
    </main>
  );
}
