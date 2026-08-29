import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FlowForge — AI Automation Workflows",
  description:
    "Visual workflow automation demo with live run streaming via Partykit WebSockets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={jetbrains.variable} style={{ colorScheme: "dark" }}>
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
