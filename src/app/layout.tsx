import type { Metadata } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import { AmbientBackground } from "@/components/ambient-background";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FlowForge — AI Automation Workflows",
  description:
    "Visual workflow automation demo with live run streaming via Partykit WebSockets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${jetbrains.variable} h-full`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-[#030306] font-sans text-zinc-100 antialiased">
        <AmbientBackground />
        {children}
      </body>
    </html>
  );
}
