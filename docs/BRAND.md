# lantern brand and design guide

Written 3 November 2026. This is the single reference for building the look of lantern. Read it before writing any UI.

lantern is a personal planner for one person: boards, lists and cards with drag and drop, checklists, progress bars, performance charts, quick to-do lists and due dates. It runs as an installable web app (PWA) on a laptop, a home PC and an iPhone, and a Claude MCP server lets Claude read and edit the boards. The feel is calm, warm, focused and professional. Not childish, not corporate. A lantern is a warm light you carry to see your way: amber glow against dark.

## Rules that always apply

- The name is always lowercase: **lantern**. Never "Lantern" or "LANTERN", including at the start of a sentence, in page titles and in the manifest.
- No emoji anywhere in the UI, and no cartoonish clip art. Shapes are clean, simple and distinctive.
- Use SVG (vector) wherever possible. Keep SVGs self-contained: no external fonts, no links, and only a few colours so they can be themed. PNG is used only where the platform requires it (the icon sizes below).
- Everything must read well small: a 32px favicon and a 180px iPhone home screen icon are the test sizes.
- Never hardcode hex values in components. Use the tokens in `lantern-tokens.css`. More themes are planned (dusk, hearth, daylight), and only token names carry over between them.

## Files in this package

| File | Use |
| --- | --- |
| `lantern-tokens.css` | Colour, type and shape tokens. The hearth theme is the default. |
| `svg/lantern-mark.svg` | The mark, themeable. Reads `--lantern-body` and `--lantern-caps`, with hearth fallbacks. Inline it to theme it; as an `<img>` it shows the hearth colours. |
| `svg/lantern-mark-mono.svg` | The mark in one colour, using `currentColor`. For single-colour contexts. |
| `svg/lantern-icon.svg` | App icon on the hearth background. Full-bleed square, no rounded corners (iOS and Android apply their own mask). |
| `svg/lantern-icon-forest.svg` | The same icon on forest. An alternative tile, not the default. |
| `svg/lantern-favicon.svg` | Browser tab icon. The mark is larger within a small rounded tile so it holds up at 16 to 32px. |
| `png/icon-192.png`, `png/icon-512.png` | PWA manifest icons. |
| `png/icon-maskable-512.png` | PWA maskable icon. The mark sits well inside the safe zone. |
| `png/apple-touch-icon.png` | 180px iPhone home screen icon. |
| `png/favicon-32.png` | Fallback favicon. |

## The mark ("E", stacked bands)

Three pill shapes stacked with a short cable on top: a cream cap, an orange body, a cream cap. It reads as a paper lantern without the traditional ornament. Geometry in a 100-unit box (shifted down 4 so the visible shape is centred; it spans x 18 to 82 and y 16 to 84):

- cable: rect x47 y12 w6 h12 rx3, cream
- top cap: rect x34 y20 w32 h12 rx6, cream
- body: rect x18 y36 w64 h28 rx14, orange
- bottom cap: rect x34 y68 w32 h12 rx6, cream

The cable is deliberately short and wide (6 units wide), which keeps it visible at 32px. Do not redraw the mark; use the SVG files. Minimum size is 16px tall.

## Colour: hearth theme

| Token | Hex | Role | Contrast on `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#1c0f0c` | App background | n/a |
| `--panel` | `#27150f` | Boards, panels, columns, cards sit on `--bg` inside panels | n/a |
| `--line` | `#432719` | Borders, dividers, progress tracks | n/a |
| `--text` | `#f6d9b0` | Primary text, cream caps of the mark | 13.8 : 1 |
| `--muted` | `#b8977a` | Secondary text, dates, meta | 6.9 : 1 (6.4 : 1 on `--panel`) |
| `--accent` | `#f08a3c` | Orange glow: the mark's body, work in progress, the main highlight | 7.5 : 1 |
| `--forest` | `#0e4a36` | Rare accent, filled shapes only | 1.8 : 1 |
| `--on-forest` | `#f6d9b0` | Text on forest fills | 7.5 : 1 on forest |
| `--forest-tint` | `#22a073` | Forest family for text, outlines, small icons and completed progress | 5.7 : 1 (5.3 : 1 on `--panel`) |

How to use forest, which is the part most easily got wrong:

- Forest is a **rare accent: at most one filled shape on a screen**, for example the main button, the active tab, a "done" label or the forest icon tile.
- It is for fills only, always with `--on-forest` text. On the hearth background it only reaches 1.8 : 1, so never use it for text, thin lines or small icons there.
- For anything in the same green family that has to be read on dark, use `--forest-tint`.
- Orange (`--accent`) stays the colour for work still in progress. A completed checklist progress bar fills with `--forest-tint`.

## Typography

Two families, both from Google Fonts and open source:

- **Sora** for the wordmark, page titles, headings and the small uppercase list labels.
- **Source Sans 3** for everything that is read or counted: card titles, body text, dates, counts and stats.

Load Sora 500 and 600, and Source Sans 3 400, 500 and 600. For the installed app, bundle them rather than loading from Google at runtime, so lantern works offline: use the `@fontsource/sora` and `@fontsource/source-sans-3` packages (or their variable versions), and import only the weights above and the latin subset.

| Role | Font | Weight | Size / line | Other |
| --- | --- | --- | --- | --- |
| Wordmark | Sora | 600 | 40 / 1 | letter-spacing -2% |
| Page title | Sora | 600 | 28 / 1.2 | letter-spacing -2% |
| Heading | Sora | 600 | 20 / 1.25 | letter-spacing -1% |
| List label | Sora | 500 | 11 / 1 | uppercase, letter-spacing +10% |
| Card title | Source Sans 3 | 600 | 17 / 1.35 | |
| Body | Source Sans 3 | 400 | 15 / 1.55 | keep lines near 60 characters |
| Meta and dates | Source Sans 3 | 400 | 13 / 1.4 | tabular numbers, `--muted` |
| Stat number | Source Sans 3 | 600 | 32 / 1 | tabular numbers |

Always set `font-variant-numeric: tabular-nums` on dates, counts, percentages and stats so digits line up in columns. Use lowercase for short UI words where it reads naturally (for example the tabs "today", "this week", "month"), matching the wordmark.

## Wordmark lockup

The horizontal lockup is the mark followed by the word "lantern" in Sora 600. The mark sits on the baseline of the lettering, and the gap is about a third of the font size. Until the outlined SVG wordmark exists (see Open items), build it in HTML so it matches:

```html
<a class="lockup" href="/" aria-label="lantern">
  <svg viewBox="0 0 64 68" aria-hidden="true"><!-- inline contents of lantern-mark.svg, cropped to the visible bounds --></svg>
  <span>lantern</span>
</a>
```

```css
.lockup {
  display: flex;
  align-items: baseline;      /* the mark's bottom edge sits on the text baseline */
  gap: 0.32em;
  font: 600 1em/1 var(--font-display);
  letter-spacing: -0.02em;
  color: var(--text);
  text-decoration: none;
}
.lockup svg { height: 0.74em; width: auto; flex: none; }
```

Set the size with `font-size` on `.lockup` (about 19px in the app header, 40px or more for a splash screen). The stacked lockup puts the mark centred above the word with a gap of about a third of the font size.

## App icons and PWA

Icons are full-bleed squares with the mark centred at about half the height. iOS and Android apply their own rounded mask, so do not add rounded corners to the PNGs.

Suggested location in the app: `public/icons/` for the PNGs and `public/` for `favicon.svg`.

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#1c0f0c">
```

```json
{
  "name": "lantern",
  "short_name": "lantern",
  "description": "A personal planner for boards, lists and cards.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1c0f0c",
  "theme_color": "#1c0f0c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Copy `svg/lantern-favicon.svg` to `public/favicon.svg`.

## Component guidance from the design studies

- **Cards** sit on `--bg` inside panels that use `--panel`, with a 1px `--line` border and `--radius-inner`. Panels use `--radius-card`. Controls use `--radius-control`. Labels and pills use `--radius-pill`.
- **Progress bars** are 8px tall with a `--line` track and a pill-rounded fill: `--accent` while in progress, `--forest-tint` when complete.
- **Status labels**: "done" is a forest fill with `--on-forest` text (this is the one forest shape for that screen); "in progress" is an outline in `--forest-tint` with `--forest-tint` text; due dates are an outline in `--line` with `--muted` text.
- **Tabs**: the active tab is a forest fill; inactive tabs are `--muted` text.
- **Counts** such as "2 of 5" use tabular numbers, with the count in `--forest-tint` when it appears next to a bar.
- Keyboard focus must always be visible: use a 2px outline in `--forest-tint` with a 2px offset.

## Open items

- **Outlined wordmark SVG.** Not done yet. It needs the Sora SemiBold font file to convert "lantern" to paths so the SVG needs no font. Until then use the HTML lockup above. When the outlined files exist they will be `lantern-wordmark.svg`, `lantern-lockup-horizontal.svg` and `lantern-lockup-stacked.svg`.
- **Other themes.** Only hearth is designed. Dusk and daylight are planned; they must reuse the token names in `lantern-tokens.css`.
- **Charts.** A palette for performance charts is not defined yet. Start from `--accent` and `--forest-tint` on `--panel`, and check contrast before adding more colours.
- **Chart, empty-state and illustration styles** are not designed yet. They follow the same rules: simple shapes, few colours, no emoji, no clip art.
