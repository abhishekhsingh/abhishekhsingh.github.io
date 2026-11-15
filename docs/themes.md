# Theme system

The site has four themes. Each one changes the look and the layout. The content, its order and its numbers are the same in all of them.

| Theme | Idea | Fonts |
|---|---|---|
| Midnight | The original look, cleaned up. Default. | Sora, DM Sans, JetBrains Mono (Google Fonts) |
| Terminal | Shell output: prompts, windows, a status bar. | JetBrains Mono |
| Bento | Rounded tiles on a quiet background. | Geist, Geist Mono |
| Brutalist | Thick borders, hard shadows, loud patches. | Archivo, JetBrains Mono |

Each theme works in dark and light mode, so there are 8 combinations. Screenshots: `docs/screenshots/themes-dark.jpg` and `docs/screenshots/themes-light.jpg`.

## How it works

Two attributes on `<html>` drive everything:

- `data-theme` is the theme name (`midnight`, `terminal`, `bento`, `brutalist`).
- `data-mode` is `dark` or `light`.

A script in the `<head>` sets both before first paint, so there is no flash of the wrong theme. The mode comes from `localStorage` (`portfolio-theme`), and the site defaults to dark with no system preference detection. The theme comes from `?theme=name`, then `localStorage` (`portfolio-style`), then Midnight.

### CSS

- `css/base.css`: reset, layout and shared components. Declares the layer order `reset, tokens, base, layout, components, theme, utilities`.
- `css/themes/midnight.css`: Midnight's token values for both modes, plus the diagram color tokens.
- `css/themes/<name>.css`: one file per other theme. Everything sits in `@layer theme` and is scoped under `[data-theme="<name>"]`, so a loaded but inactive theme does nothing.

Midnight and the base are **inlined** into `index.html` so the default page paints as fast as before. Edit the two CSS files, then run:

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
4. Register the theme in three places: the `registry` in `js/theme.js`, the allowed list and font preload map in the head script of `index.html`, and a radio plus a `.swatch--<name>` rule for the switcher.
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
