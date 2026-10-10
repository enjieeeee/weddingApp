import Image from "next/image";
import { siteConfig } from "@/lib/site";

// Slightly uneven aspect ratios and offsets keep it organic (wabi-sabi) rather than a rigid grid.
const layout = [
  "aspect-[3/4]",
  "aspect-square sm:mt-12",
  "aspect-[4/5]",
  "aspect-[3/4] sm:mt-8",
];

export default function PhotoGallery() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {siteConfig.gallery.map((src, i) => (
          <div key={src} className={`relative overflow-hidden rounded-sm bg-blush/40 ${layout[i % layout.length]}`}>
            <Image
              src={src}
              alt={`EnJie and Jeslin, photo ${i + 1}`}
              fill
              sizes="(min-width: 640px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
