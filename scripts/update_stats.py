#!/usr/bin/env python3
"""Write data/stats.json from public sources. Standard library only.

Run weekly by .github/workflows/stats.yml. Browsers cannot read PyPI download
counts directly (pypistats sends no CORS header), so the site reads this file.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "stats.json"
PACKAGE = "mcp-halflist"
REPOS = {"mcp_halflist": "abhishekhsingh/mcp-halflist", "halflist_action": "abhishekhsingh/halflist-action"}


def get(url, headers=None, tries=4):
    req = urllib.request.Request(url, headers={"User-Agent": "portfolio-stats", **(headers or {})})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and n < tries - 1:
                time.sleep(2 * (n + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def main():
    data = {}
    try:
        recent = get(f"https://pypistats.org/api/packages/{PACKAGE}/recent")["data"]
        data["pypi"] = {"package": PACKAGE, "last_week": recent["last_week"], "last_month": recent["last_month"]}
    except Exception as e:  # keep the previous value if the source is down
        print("pypistats failed:", e, file=sys.stderr)
    token = os.environ.get("GITHUB_TOKEN")
    gh = {"Accept": "application/vnd.github+json", **({"Authorization": f"Bearer {token}"} if token else {})}
    rel = {}
    for key, repo in REPOS.items():
        try:
            r = get(f"https://api.github.com/repos/{repo}/releases/latest", gh)
            rel[key] = {"tag": r["tag_name"], "date": r["published_at"][:10]}
        except Exception as e:
            print(f"release lookup failed for {repo}:", e, file=sys.stderr)
    if rel:
        data["releases"] = rel
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    core = {k: v for k, v in old.items() if k != "updated"}
    merged = {**core, **data}
    if OUT.exists() and merged == core:
        print("no change")
        return
    merged["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    OUT.write_text(json.dumps(merged, indent=2, sort_keys=True) + "\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
