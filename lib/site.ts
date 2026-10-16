const photo = (name: string) => `/images/${name}`;

// Swap these paths for real photos in public/images/ (same filenames, or edit here).
export const siteConfig = {
  dateLabel: "14 October 2027",
  timeLabel: "12:00 PM",
  venue: "Jade The Fullerton Hotel",
  // Used for the Google Map search query.
  venueAddress: "Jade, The Fullerton Hotel Singapore, 1 Fullerton Square, Singapore 049178",
  // Full-screen hero slideshow: 3 slides, 3 photos each. Replace with real photos in public/images/.
  slideshow: [
    [photo("hero.svg"), photo("photo-1.svg"), photo("photo-2.svg")],
    [photo("photo-3.svg"), photo("photo-4.svg"), photo("hero.svg")],
    [photo("photo-1.svg"), photo("photo-2.svg"), photo("photo-3.svg")],
  ],
  gallery: [photo("photo-1.svg"), photo("photo-2.svg"), photo("photo-3.svg"), photo("photo-4.svg")],
};
