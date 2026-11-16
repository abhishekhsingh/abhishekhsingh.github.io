# abhishekhsingh.github.io

Personal portfolio website. Principal Engineer at Gainsight.

🔗 **Live**: [abhishekhsingh.github.io](https://abhishekhsingh.github.io)

## Themes

Five themes (Midnight, Signal, Terminal, Bento, Brutalist), each in dark and light mode. Pick one with the palette button in the nav, press Alt+Shift+T, or open a link like `?theme=terminal`. How it is built, how to add one and the measured performance are in [docs/themes.md](docs/themes.md).

![Themes in dark mode](docs/screenshots/themes-dark.jpg)

## Editing styles

The CSS source is in `css/`. The default theme is inlined into `index.html`, so after editing `css/base.css` or `css/themes/signal.css` run `python3 scripts/build.py`.

## Other pieces

- Ctrl or Cmd+K opens a command palette.
- The weekly job in `.github/workflows/stats.yml` refreshes `data/stats.json` (PyPI downloads and release tags).
- `assets/demo/` holds the recorded `mcp-halflist` runs behind the "Try it" box.
