#!/usr/bin/env python3
"""Generate the hero service-mesh graph used by the Signal theme.

The same file is the static poster (as a CSS mask) and the data source for the
canvas animation, so the two always match. Deterministic: same seed, same graph.
Run: python3 scripts/make_mesh.py
"""
import math
import random
from pathlib import Path

W, H = 1200, 720
SEED, TARGET = 11, 64
MIN_DIST = 66

rng = random.Random(SEED)
pts = []
tries = 0
while len(pts) < TARGET and tries < 20000:
    tries += 1
    x, y = rng.uniform(40, W - 30), rng.uniform(40, H - 40)
    # sparse on the left where the headline sits, denser to the right
    if rng.random() > ((x / W) ** 1.6) * 1.15 + 0.04:
        continue
    if all(math.hypot(x - a, y - b) >= MIN_DIST for a, b in pts):
        pts.append((x, y))
pts.sort(key=lambda p: (round(p[0] / 120), p[1]))

def dist(i, j):
    return math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])

hubs = set(sorted(range(len(pts)), key=lambda i: -sum(1 for j in range(len(pts)) if j != i and dist(i, j) < 150))[:9])
edges = set()
for i in range(len(pts)):
    near = sorted((j for j in range(len(pts)) if j != i), key=lambda j: dist(i, j))
    for j in near[: 3 if i in hubs else 2]:
        if dist(i, j) < 200:
            edges.add((min(i, j), max(i, j)))

# make the graph connected
def comps():
    seen, out = set(), []
    adj = {i: set() for i in range(len(pts))}
    for a, b in edges:
        adj[a].add(b); adj[b].add(a)
    for s in range(len(pts)):
        if s in seen:
            continue
        stack, c = [s], set()
        while stack:
            n = stack.pop()
            if n in c:
                continue
            c.add(n); stack.extend(adj[n] - c)
        seen |= c; out.append(c)
    return out

while len(comps()) > 1:
    cs = comps()
    a, b = min(((i, j) for i in cs[0] for c in cs[1:] for j in c), key=lambda p: dist(*p))
    edges.add((min(a, b), max(a, b)))

lines = [f'<line x1="{pts[a][0]:.0f}" y1="{pts[a][1]:.0f}" x2="{pts[b][0]:.0f}" y2="{pts[b][1]:.0f}" data-i="{a}" data-j="{b}"/>' for a, b in sorted(edges)]
circles = [f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{5 if i in hubs else 2.8}"' + (' data-h="1"' if i in hubs else '') + '/>' for i, (x, y) in enumerate(pts)]
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMaxYMid slice">\n'
       f'<g stroke="#000" stroke-width="1" fill="none">\n' + '\n'.join(lines) + '\n</g>\n'
       f'<g fill="#000">\n' + '\n'.join(circles) + '\n</g>\n</svg>\n')
out = Path(__file__).resolve().parent.parent / 'assets/signal/mesh.svg'
out.write_text(svg)
print(f'{len(pts)} nodes, {len(edges)} edges, {len(hubs)} hubs, {len(svg)} bytes')
