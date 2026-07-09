import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One of Us",
  description: "Single-phone social deduction games for quick groups.",
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
