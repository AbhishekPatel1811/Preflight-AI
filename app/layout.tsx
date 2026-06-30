import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LEGACY_THEME_STORAGE_KEYS, PRODUCT_NAME, THEME_STORAGE_KEY } from "@/lib/brand";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Launch Preflight Agent`,
  description: "Turn rough product launch inputs into readiness reports, prioritized fixes, owner checklists, launch copy, and follow-up questions.",
  openGraph: {
    title: `${PRODUCT_NAME} | Launch Preflight Agent`,
    description: "Turn rough product launch inputs into readiness reports, prioritized fixes, owner checklists, launch copy, and follow-up questions.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    try {
      var storedTheme = localStorage.getItem("${THEME_STORAGE_KEY}");
      var legacyKeys = ${JSON.stringify(LEGACY_THEME_STORAGE_KEYS)};
      for (var index = 0; !storedTheme && index < legacyKeys.length; index += 1) {
        storedTheme = localStorage.getItem(legacyKeys[index]);
      }
      var useDark = storedTheme ? storedTheme === "dark" : true;
      document.documentElement.classList.toggle("dark", useDark);
      if (storedTheme) {
        localStorage.setItem("${THEME_STORAGE_KEY}", storedTheme);
      }
    } catch (error) {
      document.documentElement.classList.add("dark");
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
