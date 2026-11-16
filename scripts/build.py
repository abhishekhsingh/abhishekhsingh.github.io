#!/usr/bin/env python3
"""Inline the default theme's CSS into index.html.

Source of truth is css/base.css and css/themes/midnight.css. Run this after
editing either file. Use --check to verify index.html is up to date.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ["css/base.css", "css/themes/midnight.css"]
START, END = "<!-- css:start -->", "<!-- css:end -->"


def squeeze(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"[ \t]+\n", "\n", css)
    return re.sub(r"\n{2,}", "\n", css).strip()


def build():
    css = "\n".join(squeeze((ROOT / f).read_text(encoding="utf-8")) for f in FILES)
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    pat = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    block = f"{START}\n<style>\n{css}\n</style>\n{END}"
    if not pat.search(html):
        sys.exit("css markers not found in index.html")
    return html, pat.sub(lambda _: block, html)


if __name__ == "__main__":
    old, new = build()
    if "--check" in sys.argv:
        sys.exit(0 if old == new else "index.html is out of date, run scripts/build.py")
    (ROOT / "index.html").write_text(new, encoding="utf-8")
    print("index.html updated" if old != new else "index.html already up to date")
