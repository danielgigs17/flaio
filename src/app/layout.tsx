import type { Metadata } from "next"
import {
  Cormorant_Garamond,
  Darker_Grotesque,
  JetBrains_Mono,
  Orbitron,
  Share_Tech_Mono,
  Space_Mono,
  VT323,
  Inter,
} from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"

// ── Editorial ──
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
})
const darkerGrotesque = Darker_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-darker-grotesque",
  display: "swap",
})

// ── Terminal ──
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
})

// ── Cyberpunk ──
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
})
const shareTech = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sharetech",
  display: "swap",
})

// ── Brutalist ──
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
})

// ── Retro ──
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
})

// ── Minimal ──
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
})

const allFonts = [
  cormorant,
  darkerGrotesque,
  jetbrains,
  orbitron,
  shareTech,
  spaceMono,
  vt323,
  inter,
]
  .map((f) => f.variable)
  .join(" ")

export const metadata: Metadata = {
  title: "FLAIO — Fun Little Apps I Own",
  description:
    "A collection of fun little apps, ateliers, archives, and anything else worth making.",
  openGraph: {
    title: "FLAIO — Fun Little Apps I Own",
    description:
      "A collection of fun little apps, ateliers, archives, and anything else worth making.",
    siteName: "FLAIO",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${allFonts} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
