export interface AppPreview {
  name: string
  icon: string
  href: string
  iconImage?: string
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
        name: "Leprechaun",
        icon: "🍀",
        href: "https://leprechaun.flaio.com",
        iconImage: "/icons/leprechaun.png",
      },
      {
        name: "Video Poker",
        icon: "🃏",
        href: "https://poker.flaio.com",
        iconImage: "/icons/videopoker.png",
      },
      {
        name: "Lector",
        icon: "📰",
        href: "https://lector.flaio.com",
        iconImage: "/icons/lector.png",
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
    href: "https://beyonce.flaio.com",
    linkLabel: "Browse the archive",
    accentHue: 45,
    screenshot: "/screenshots/archive.jpg",
    tags: ["archive", "media", "culture"],
  },
  {
    word: "art",
    name: "FLAIO Art",
    description:
      "Original digital art, generative visuals, and creative experiments. Where code meets canvas.",
    icon: "🎨",
    href: "/art",
    linkLabel: "View gallery",
    accentHue: 310,
    tags: ["art", "generative", "creative"],
  },
]
