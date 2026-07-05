import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MintyStays",
    short_name: "MintyStays",
    description:
      "Map-first discovery for hotels and rentals with genuinely effective cooling.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef7f4",
    theme_color: "#087866",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
