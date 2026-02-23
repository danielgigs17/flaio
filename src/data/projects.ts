export interface AppPreview {
  name: string
  icon: string
  href: string
  screenshot?: string
}

export interface Project {
  word: string
  name: string
  description: string
  icon: string
  href: string
  linkLabel: string
  accentHue: number
  screenshot?: string
  apps?: AppPreview[]
  tags?: string[]
}

export const projects: Project[] = [
  {
    word: "apps",
    name: "FLAIO Apps",
    description:
      "A suite of web apps built for fun, strategy, and daily use. Play poker, beat the house, or read the internet.",
    icon: "🎰",
    href: "/apps",
    linkLabel: "Explore apps",
    accentHue: 220,
    apps: [
      {
        name: "Video Poker",
        icon: "🃏",
        href: "https://poker.flaio.com",
        screenshot: "/screenshots/poker.jpg",
      },
      {
        name: "Freebet Blackjack",
        icon: "🍀",
        href: "/apps/blackjack",
        screenshot: "/screenshots/blackjack.jpg",
      },
      {
        name: "Lector",
        icon: "📰",
        href: "https://lector.flaio.com",
        screenshot: "/screenshots/lector.jpg",
      },
    ],
    tags: ["gaming", "productivity", "web"],
  },
  {
    word: "atelier",
    name: "FLAIO Atelier",
    description:
      "Rhinestone athleisure. Every crystal placed by hand. Premium activewear covered in thousands of Crystal AB stones.",
    icon: "✨",
    href: "https://atelier.flaio.com",
    linkLabel: "Visit store",
    accentHue: 35,
    screenshot: "/screenshots/atelier.jpg",
    tags: ["fashion", "shopify", "e-commerce"],
  },
  {
    word: "archive",
    name: "The Beyoncé Archive",
    description:
      "A curated archive of Beyoncé — performances, visuals, fashion, eras, and cultural moments. Organized, searchable, and ever-growing.",
    icon: "🐝",
    href: "/archive",
    linkLabel: "Browse the archive",
    accentHue: 45,
    screenshot: "/screenshots/archive.jpg",
    tags: ["archive", "media", "culture"],
  },
  {
    word: "aggregator",
    name: "Lector",
    description:
      "A modern RSS reader and feed aggregator. Subscribe to feeds, read articles, and stay informed without the noise.",
    icon: "📡",
    href: "https://lector.flaio.com",
    linkLabel: "Read",
    accentHue: 25,
    screenshot: "/screenshots/lector.jpg",
    tags: ["rss", "reader", "productivity"],
  },
  {
    word: "auth",
    name: "FLAIO Auth",
    description:
      "Centralized OAuth service for the FLAIO ecosystem. One login across all apps — secure, fast, and unified.",
    icon: "🔐",
    href: "/auth",
    linkLabel: "Learn more",
    accentHue: 260,
    tags: ["oauth", "identity", "infrastructure"],
  },
]
