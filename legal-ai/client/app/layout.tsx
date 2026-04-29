import type { Metadata } from "next";
import "./../styles/globals.css";

export const metadata: Metadata = {
  title: "Legal AI - Document Intelligence",
  description: "AI-powered legal document analysis and risk detection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
