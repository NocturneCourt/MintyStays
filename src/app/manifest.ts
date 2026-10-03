import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MintyStays",
    short_name: "MintyStays",
    description:
      "Map-first discovery for hotels and rentals with genuinely effective cooling.",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "en",
    display: "standalone",
    background_color: "#eef3f6",
    theme_color: "#0e7c6b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
