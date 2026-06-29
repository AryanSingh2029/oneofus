import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One of Us",
  description: "Social deduction games for one phone or every phone in the room.",
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
