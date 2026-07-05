import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-plex-mono",
});

// Runs before paint so the stored (or system) theme applies without a flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem("ms-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://mintystays.com",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "MintyStays",
    template: "%s / MintyStays",
  },
  description:
    "Find hotels and short-term rentals with genuinely effective air conditioning.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MintyStays",
    description:
      "Map-first discovery for hotels and rentals with genuinely effective cooling.",
    url: "/",
    siteName: "MintyStays",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MintyStays cold-stay map preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MintyStays",
    description:
      "Find hotels and rentals with genuinely effective air conditioning.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
