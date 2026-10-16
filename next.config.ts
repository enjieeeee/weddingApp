import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Placeholder art is SVG; real photos (jpg/webp) are optimised as usual.
  images: { dangerouslyAllowSVG: true, contentDispositionType: "inline" },
};

export default nextConfig;
