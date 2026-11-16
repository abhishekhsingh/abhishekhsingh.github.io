# Theme system

The site has five themes. Each one changes the look and the layout. The content, its order and its numbers are the same in all of them.

| Theme | Idea | Fonts |
|---|---|---|
| Midnight | The original look, cleaned up. Default. | Sora, DM Sans, JetBrains Mono (Google Fonts) |
| Signal | Mission control: a live service-mesh hero, huge numerals, one mint accent. | Geist, Geist Mono, Instrument Serif italic |
| Terminal | Shell output: prompts, windows, a status bar. | JetBrains Mono |
| Bento | Rounded tiles on a quiet background. | Geist, Geist Mono |
| Brutalist | Thick borders, hard shadows, loud patches. | Archivo, JetBrains Mono |

Each theme works in dark and light mode, so there are 10 combinations. Screenshots: `docs/screenshots/themes-dark.jpg` and `docs/screenshots/themes-light.jpg`.

## How it works

Two attributes on `<html>` drive everything:

- `data-theme` is the theme name (`midnight`, `signal`, `terminal`, `bento`, `brutalist`).
- `data-mode` is `dark` or `light`.

A script in the `<head>` sets both before first paint, so there is no flash of the wrong theme. The mode comes from `localStorage` (`portfolio-theme`), and the site defaults to dark with no system preference detection. The theme comes from `?theme=name`, then `localStorage` (`portfolio-style`), then Midnight.

### CSS

- `css/base.css`: reset, layout and shared components. Declares the layer order `reset, tokens, base, layout, components, theme, utilities`.
- `css/themes/midnight.css`: Midnight's token values for both modes, plus the diagram color tokens.
- `css/themes/<name>.css`: one file per other theme. Everything sits in `@layer theme` and is scoped under `[data-theme="<name>"]`, so a loaded but inactive theme does nothing.

Only `js/theme.js` and `js/fx.js` load with the page. The trace, demo, stats and palette code load when the browser is idle. Midnight and the base are **inlined** into `index.html` so the default page paints as fast as before. Edit the two CSS files, then run:

```
python3 scripts/build.py          # inline the CSS into index.html
python3 scripts/build.py --check  # fail if index.html is out of date
```

Other themes are plain stylesheets, loaded on demand when someone picks them. For a returning visitor whose saved theme is not Midnight, the head script adds the stylesheet with `blocking="render"` and preloads that theme's font. A fallback hides the page until the stylesheet loads, or for 1.5 seconds at most.

### JavaScript

`js/theme.js` holds the registry, lazy loading, persistence and the switcher. It also handles:

- the circular reveal when switching (View Transitions, skipped for reduced motion or unsupported browsers)
- Alt+Shift+T to cycle themes
- a status line for screen readers (`role="status"`)
- the pointer spotlight on Bento tiles (pointer devices only, throttled with `requestAnimationFrame`)

The switcher is a native popover with radio inputs, top right next to the dark/light button.

### Markup hooks

Themes target stable hooks, not page-specific classes: `data-section` on sections, `data-region` on the nav and footer, and the classes `.card`, `.stat`, `.role`, `.system`, `.chip`, `.quote` and `.diagram`. Inline styles were moved into classes so themes can override them.

## Shared behaviour

These work in every theme and are styled with the theme's tokens.

| Piece | Where | Notes |
|---|---|---|
| Count-up numbers | `js/fx.js`, `[data-count]` | The final value is real text in the HTML. Counting starts when a number is in view and is skipped for reduced motion. After counting the plain text is restored (Signal keeps the suffix in a coloured span). |
| Estimated throughput | `js/fx.js`, `.hero-estimate` | About 706,000 records a second from the 61B+ per day average, labelled as an estimate, with a pause button. Runs about 18 seconds, then stops. |
| Pause motion | `js/fx.js`, `.fx-toggle` | One switch stops the graph, glow, ticker, estimate and diagram animation. The choice is stored under `portfolio-fx`. |
| Hero graph | `js/hero.js`, `assets/signal/mesh.svg` | A Canvas 2D service mesh with travelling pulses, drawn from the SVG so the poster and the animation match. Used by Signal, Terminal and Bento. Pauses offscreen and in hidden tabs, and gives up on slow devices. Regenerate the graph with `python3 scripts/make_mesh.py`. |
| WebGL glow | `js/hero-gl.js` | Signal only. Loaded after the page is idle, on desktops with more than 4 cores, never on Save-Data, reduced motion or software renderers. Removes itself if frames are slow. |
| Request step-through | `js/trace.js` | Matches nodes by the label text in each diagram SVG, so diagrams stay plain SVG. Steps live in `STEPS` at the top of the file. |
| Case studies | `index.html`, `.case-study` | Context, scale, decision, trade-off and outcome under each system. |
| Command palette | `js/palette.js`, `css/palette.css` | Ctrl or Cmd+K, or the search button in the nav. Commands are built from the page, so new sections and themes appear automatically. |
| Recorded demo | `js/demo.js`, `assets/demo/` | Replays real `mcp-halflist` output. See `assets/demo/README.md` for how it was recorded. |
| Background art | `assets/signal/art/`, `scripts/make_art.py` | Signal only. Faint dotted world map, embedding cloud and flow lines behind each system, applied as CSS masks. The map is built from Natural Earth land data (public domain). Regenerate with `python3 scripts/make_art.py`. The map markers are decorative and do not name real regions. |
| Weekly stats | `scripts/update_stats.py`, `.github/workflows/stats.yml`, `data/stats.json` | A scheduled job refreshes PyPI downloads and release tags. The page reads the file, because browsers cannot read PyPI download counts directly. |
| Print styles | `css/print.css` (linked with `media="print"`, so it never delays rendering) | Black on white, all systems shown, no interactive controls. |

## Tokens

Every theme fills in the same custom properties:

```
--bg --bg-2 --surface --surface-2 --surface-3 --border --border-glow
--text --text-dim --text-muted
--accent --accent-2 --accent-3 --amber --red --purple --pink --teal
--glow --nav-bg --nav-bg-mobile --hover-soft --code-shadow
--font-head --font-body --font-mono --max-w
```

Diagram colors use `--dg-fill-<family>-<n>` and `--dg-line-<family>-<n>`. Fills and lines are separate because Midnight's light mode tints fills only. Families: green, violet, amber, cyan, slate, blue, pink, red. A higher number is a lighter color.

## Adding a theme

1. Copy the closest file in `css/themes/` and rename it. Keep the `@layer` order line at the top, because the file can load before the base.
2. Define tokens for both `[data-mode="dark"]` and `[data-mode="light"]`, including all diagram tokens.
3. Put fonts in `fonts/<name>/` (OFL only, Latin subset, under 50 KB each) with the license text, and declare them with `@font-face` inside the theme file.
4. Register the theme in three places: the `registry` in `js/theme.js`, the allowed list and font preload map in the head script of `index.html`, and a radio plus a `.swatch--<name>` rule for the switcher. To show the hero graph, also add the theme to the lists in `js/fx.js` and `css/base.css`.
5. Run the checks below in both modes.

## Measured on 16 Nov 2026

Mobile numbers use 4x CPU slowdown and 1.6 Mbps with 150 ms round trip, cold cache, from a local server without compression.

| Theme | Theme CSS (gzip) | Font files | First paint, mobile | Largest paint, mobile |
|---|---|---|---|---|
| Midnight | inlined | none extra | 360 ms | 376 ms |
| Terminal | 2.5 KB | 31 KB | 756 ms | 820 ms |
| Bento | 2.6 KB | 29 KB + 23 KB | 776 ms | 776 ms |
| Brutalist | 2.9 KB | 35 KB + 31 KB (shared) | 772 ms | 840 ms |

Before the theme work the default page painted at 344 ms. Layout shift is under 0.01 and total blocking time is 0 in every theme.

Checks that pass for all 8 combinations: axe-core with no violations at 375 and 1440 px, no horizontal overflow at 320, 375, 768 and 1440 px, no looping animation under reduced motion, a visible keyboard focus ring, readable borders and text under forced colors, and no console errors.

## Notes and known gaps

- Terminal puts the navigation in a bottom status bar on wide screens. It stays at the top on phones.
- Brutalist keeps diagrams on a paper background in both modes so the ink-on-color labels stay readable.
- Bento tiles do not expand on click. The spotlight is the only pointer effect there.
- Diagram text is still small on phones in every theme. Use the Expand button or scroll.
- Not covered: a Safari or real-device pass.
