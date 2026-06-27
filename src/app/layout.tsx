import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MintyStays",
  description: "Find hotels and rentals with genuinely effective cooling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
