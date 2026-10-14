"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;

// Each slide holds 3 photos side by side and moves left to right: the next image enters from the left while the current one exits right.
export default function HeroSlideshow({ slides }: { slides: string[][] }) {
  const [state, setState] = useState({ current: 0, prev: -1 });

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setState((s) => ({ current: (s.current + 1) % slides.length, prev: s.current }));
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {slides.map((photos, i) => {
        const active = i === state.current;
        const leaving = i === state.prev;
        const x = active ? "0%" : leaving ? "100%" : "-100%";
        return (
          <div
            key={photos.join("|")}
            className={`absolute inset-0 grid grid-cols-3 gap-1 ${active || leaving ? "transition-transform duration-1000 ease-in-out" : ""}`}
            style={{ transform: `translateX(${x})` }}
          >
            {photos.map((src, j) => (
              <div key={`${src}-${j}`} className="relative">
                <Image
                  src={src}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="34vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        );
      })}
      <div className="absolute inset-0 bg-paper/60" />
    </div>
  );
}
