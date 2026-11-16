#!/usr/bin/env python3
"""Generate the faint background art used by the Signal theme (assets/signal/art/*.svg).

- map.svg: a dotted world map built from Natural Earth land data (public domain),
  downloaded from the world-atlas package on first run.
- cloud.svg: a seeded embedding-style point cloud.
- flow.svg: curved parallel flow lines.

Deterministic. Run: python3 scripts/make_art.py
"""
import json
import math
import random
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets/signal/art"
OUT.mkdir(parents=True, exist_ok=True)


def dots_path(points, w=1):
    return "".join(f"M{x:.0f} {y:.0f}h0" for x, y in points)


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMaxYMin meet">{body}</svg>\n'


def decode_land():
    url = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json"
    topo = json.load(urllib.request.urlopen(url, timeout=30))
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts

    polys = []
    for geom in topo["objects"]["land"]["geometries"]:
        shapes = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
        for poly in shapes:
            polys.append([ring(r) for r in poly])
    return polys


def inside(pt, ring):
    x, y = pt
    c = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def in_land(pt, polys):
    for poly in polys:
        if inside(pt, poly[0]) and not any(inside(pt, h) for h in poly[1:]):
            return True
    return False


def make_map():
    polys = decode_land()
    W, H = 1000, 500
    step = 3.3  # degrees between dots
    pts = []
    lat = 80.0
    while lat > -58:
        lon = -180.0
        while lon < 180:
            if in_land((lon, lat), polys):
                pts.append(((lon + 180) / 360 * W, (90 - lat) / 180 * H))
            lon += step
        lat -= step
    body = f'<path d="{dots_path(pts)}" stroke="#000" stroke-width="4.2" stroke-linecap="round" fill="none"/>'
    (OUT / "map.svg").write_text(svg(W, H, body))
    return len(pts)


def make_cloud():
    rng = random.Random(5)
    W, H = 1000, 500
    centres = [(250, 170, 90), (560, 290, 110), (780, 130, 80), (420, 380, 70), (860, 360, 90)]
    pts = []
    for cx, cy, s in centres:
        for _ in range(130):
            pts.append((min(W - 8, max(8, rng.gauss(cx, s))), min(H - 8, max(8, rng.gauss(cy, s * 0.8)))))
    lines = []
    for i, p in enumerate(pts):
        near = sorted(range(len(pts)), key=lambda j: math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]))[1:2]
        for j in near:
            if i < j and rng.random() < 0.28:
                lines.append(f"M{p[0]:.0f} {p[1]:.0f}L{pts[j][0]:.0f} {pts[j][1]:.0f}")
    body = f'<path d="{"".join(lines)}" stroke="#000" stroke-width="1" fill="none"/><path d="{dots_path(pts)}" stroke="#000" stroke-width="5" stroke-linecap="round" fill="none"/>'
    (OUT / "cloud.svg").write_text(svg(W, H, body))
    return len(pts)


def make_flow():
    W, H = 1000, 500
    paths = []
    for k in range(14):
        y0 = 40 + k * 32
        amp = 26 + (k % 4) * 10
        paths.append(f"M0 {y0}C250 {y0 - amp} 450 {y0 + amp} 650 {y0 - amp * 0.4:.0f}S900 {y0 + amp * 0.3:.0f} 1000 {y0 - 10}")
    body = f'<path d="{"".join(paths)}" stroke="#000" stroke-width="1.6" fill="none"/>'
    (OUT / "flow.svg").write_text(svg(W, H, body))
    return len(paths)


if __name__ == "__main__":
    print("map dots:", make_map(), "| cloud points:", make_cloud(), "| flow lines:", make_flow())
