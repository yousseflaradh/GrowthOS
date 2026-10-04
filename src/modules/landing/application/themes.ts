/**
 * Landing-page color palettes + font pairings. A theme is a set of CSS-variable
 * overrides applied to the preview/export wrapper — so the page never inherits
 * the app's (or the scraped brand's) look by default. Pure data, no server
 * deps, safe to import from client components.
 */
export interface ThemeFonts {
  /** Display (headings) font stack. */
  display: string;
  /** Body font stack. */
  body: string;
  /** Google Fonts stylesheet href to load these fonts. */
  href: string;
}

export interface LandingTheme {
  key: string;
  name: string;
  /** [dark, accent, surface] — shown as the swatch in the picker. */
  swatch: [string, string, string];
  /** Overrides for the global --color-* tokens, scoped to the page wrapper. */
  vars: Record<string, string>;
  fonts: ThemeFonts;
}

/** Curated Google-font pairings — distinct, premium, web-loadable. */
const FONTS = {
  fraunces: {
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600&display=swap",
  },
  poppins: {
    display: "'Poppins', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap",
  },
  playfair: {
    display: "'Playfair Display', Georgia, serif",
    body: "'Mulish', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Mulish:wght@400;500;700&display=swap",
  },
  spaceGrotesk: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
  },
  sora: {
    display: "'Sora', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap",
  },
  archivo: {
    display: "'Archivo', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&display=swap",
  },
} satisfies Record<string, ThemeFonts>;

interface Colors {
  d950: string;
  d900: string;
  d800: string;
  d700: string;
  accent: string;
  accent2: string;
  surface: string;
  surface2: string;
  ink: string;
  body: string;
  hairline: string;
  onDark?: string;
  onDarkMuted: string;
}

function colorVars(c: Colors): Record<string, string> {
  return {
    "--color-green-950": c.d950,
    "--color-green-900": c.d900,
    "--color-green-800": c.d800,
    "--color-green-700": c.d700,
    "--color-gold-500": c.accent,
    "--color-gold-400": c.accent2,
    "--color-cream-50": c.surface,
    "--color-cream-100": c.surface2,
    "--color-ink": c.ink,
    "--color-body": c.body,
    "--color-hairline": c.hairline,
    "--color-ondark": c.onDark ?? "#ffffff",
    "--color-ondark-muted": c.onDarkMuted,
    // Font overrides (consumed by the page wrapper).
    "--font-display": "var(--lp-display)",
  };
}

function theme(key: string, name: string, fonts: ThemeFonts, c: Colors): LandingTheme {
  return { key, name, swatch: [c.d950, c.accent, c.surface], vars: colorVars(c), fonts };
}

export const LANDING_THEMES: LandingTheme[] = [
  theme("forest", "Forest & Gold", FONTS.fraunces, {
    d950: "#0b2218", d900: "#0f2b20", d800: "#15392b", d700: "#1d4a38",
    accent: "#d8a94b", accent2: "#e6c36b", surface: "#fbf6ec", surface2: "#f3ecdc",
    ink: "#10241b", body: "#4b5a52", hairline: "#ece7da", onDarkMuted: "#b9c8be",
  }),
  theme("ocean", "Ocean & Sky", FONTS.poppins, {
    d950: "#0a1a33", d900: "#0e2547", d800: "#143160", d700: "#1c4486",
    accent: "#38bdf8", accent2: "#7dd3fc", surface: "#f1f6fc", surface2: "#e3edf8",
    ink: "#0f1f3a", body: "#4a5a6e", hairline: "#dbe6f2", onDarkMuted: "#aec6e0",
  }),
  theme("sunset", "Sunset & Coral", FONTS.playfair, {
    d950: "#2a1510", d900: "#3a1d16", d800: "#4d271d", d700: "#6b3826",
    accent: "#f97316", accent2: "#fb923c", surface: "#fdf5ee", surface2: "#f8e8da",
    ink: "#2a1812", body: "#6b5249", hairline: "#f0e0d2", onDarkMuted: "#e7c3ac",
  }),
  theme("berry", "Berry & Pink", FONTS.sora, {
    d950: "#2a0f2e", d900: "#3a163f", d800: "#4d1f54", d700: "#6b2c75",
    accent: "#ec4899", accent2: "#f472b6", surface: "#fbf0f6", surface2: "#f6dcea",
    ink: "#2a0f2e", body: "#6b4f63", hairline: "#f0d8e6", onDarkMuted: "#e3b6d0",
  }),
  theme("slate", "Slate & Emerald", FONTS.spaceGrotesk, {
    d950: "#0f172a", d900: "#16213c", d800: "#1e2c4f", d700: "#2b3e6b",
    accent: "#10b981", accent2: "#34d399", surface: "#f1f5f9", surface2: "#e2e8f0",
    ink: "#0f172a", body: "#475569", hairline: "#dbe2ea", onDarkMuted: "#aebfd0",
  }),
  theme("mono", "Charcoal & Amber", FONTS.archivo, {
    d950: "#18181b", d900: "#232327", d800: "#2f2f34", d700: "#404048",
    accent: "#f5b301", accent2: "#ffd34d", surface: "#f7f7f5", surface2: "#ececea",
    ink: "#18181b", body: "#52525b", hairline: "#e4e4e7", onDarkMuted: "#c0c0c6",
  }),
];

export const THEME_KEYS = LANDING_THEMES.map((t) => t.key);
const DEFAULT_THEME = LANDING_THEMES[0]!;

/* ── custom palette ─────────────────────────────────────────── */

const hex = /^#?[0-9a-fA-F]{6}$/;
const norm = (c: string, fallback: string) => {
  const s = c.trim();
  return hex.test(s) ? (s.startsWith("#") ? s : `#${s}`) : fallback;
};
/** Mix `hex` toward white (amt 0..1) for lighter shades. */
function lighten(hexColor: string, amt: number): string {
  const n = parseInt(hexColor.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v: number) => Math.round(v + (255 - v) * amt);
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}
function darken(hexColor: string, amt: number): string {
  const n = parseInt(hexColor.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v: number) => Math.round(v * (1 - amt));
  return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
}

export interface CustomColors {
  base: string; // dark hero/base
  accent: string;
  surface: string; // light page surface
}

/** Build a full theme from 3 user-picked colors, deriving the rest. */
export function customTheme(input: CustomColors): LandingTheme {
  const base = norm(input.base, "#0b2218");
  const accent = norm(input.accent, "#d8a94b");
  const surface = norm(input.surface, "#fbf6ec");
  const c: Colors = {
    d950: base,
    d900: lighten(base, 0.06),
    d800: lighten(base, 0.14),
    d700: lighten(base, 0.24),
    accent,
    accent2: lighten(accent, 0.18),
    surface,
    surface2: darken(surface, 0.05),
    ink: darken(base, 0.1),
    body: lighten(darken(base, 0.05), 0.35),
    hairline: darken(surface, 0.1),
    onDarkMuted: lighten(base, 0.62),
  };
  return { key: "custom", name: "Custom", swatch: [base, accent, surface], vars: colorVars(c), fonts: FONTS.fraunces };
}

/* ── resolution ─────────────────────────────────────────────── */

/** Parse a stored custom-theme JSON string, if that's what `value` is. */
function parseCustom(value: string): CustomColors | null {
  if (!value.startsWith("{")) return null;
  try {
    const o = JSON.parse(value) as Partial<CustomColors>;
    if (o.base && o.accent && o.surface) return { base: o.base, accent: o.accent, surface: o.surface };
  } catch {
    /* not custom */
  }
  return null;
}

export function getTheme(value: string | null | undefined): LandingTheme {
  if (!value) return DEFAULT_THEME;
  const custom = parseCustom(value);
  if (custom) return customTheme(custom);
  return LANDING_THEMES.find((t) => t.key === value) ?? DEFAULT_THEME;
}

/**
 * Resolve the stored theme value for a generation. Honors an explicit preset
 * key or a custom-colors JSON string; otherwise ("auto") picks a stable preset
 * from the product name so different products get different looks.
 */
export function resolveTheme(choice: string | null | undefined, seed: string): string {
  if (choice && choice !== "auto") {
    if (parseCustom(choice)) return choice; // custom JSON, store as-is
    if (THEME_KEYS.includes(choice)) return choice;
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return THEME_KEYS[h % THEME_KEYS.length]!;
}
