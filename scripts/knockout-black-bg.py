"""Remove solid/near-black background connected to image edges (PNG → RGBA)."""
from __future__ import annotations

import sys
from collections import deque

from PIL import Image


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: knockout-black-bg.py <input.png> <output.png> [threshold]", file=sys.stderr)
        sys.exit(1)
    inp, outp = sys.argv[1], sys.argv[2]
    thr = int(sys.argv[3]) if len(sys.argv) > 3 else 42

    img = Image.open(inp).convert("RGBA")
    w, h = img.size
    px = img.load()

    def dark(x: int, y: int) -> bool:
        r, g, b, _a = px[x, y]
        return r <= thr and g <= thr and b <= thr

    seen = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if dark(x, y):
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if dark(x, y):
                q.append((x, y))

    def bfs(starts: list[tuple[int, int]]) -> None:
        qq = deque(starts)
        while qq:
            x, y = qq.popleft()
            if x < 0 or x >= w or y < 0 or y >= h or seen[x][y]:
                continue
            if not dark(x, y):
                continue
            seen[x][y] = True
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and dark(nx, ny):
                    qq.append((nx, ny))

    bfs(list(q))

    # Затворено „дупче“ вътре в емблемата (черен фон, несвързан с ръба)
    cx, cy = w // 2, h // 2
    if not seen[cx][cy] and dark(cx, cy):
        bfs([(cx, cy)])

    img.save(outp, optimize=True)


if __name__ == "__main__":
    main()
