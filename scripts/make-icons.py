#!/usr/bin/env python3
"""Generate apps/<id>/icon.png in the catalog's house style.

One flat mark per app on a diagonal gradient derived from the manifest's own
`accent` oklch colour, inside a rounded square with a thin inset outline —
matching the hand-made resume-screener and candidate-tracker icons.

    python3 scripts/make-icons.py            # every app missing an icon
    python3 scripts/make-icons.py --force    # redraw all of them
    python3 scripts/make-icons.py invoice-chaser competitor-brief

Needs Pillow (`pip install pillow`). Icons are committed artwork; this script
exists so they can be regenerated consistently, not at install time.
"""

import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512
SS = 4  # supersample factor — everything is drawn 4x then downsampled
APPS = Path(__file__).resolve().parent.parent / "apps"

WHITE = (255, 255, 255, 255)
GREEN = (61, 128, 51, 255)
RED = (200, 66, 55, 255)


# ── colour ────────────────────────────────────────────────────────────────
def oklch_to_rgb(L, C, h_deg):
    h = math.radians(h_deg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_

    def enc(c):
        c = max(0.0, min(1.0, c))
        c = 1.055 * (c ** (1 / 2.4)) - 0.055 if c > 0.0031308 else 12.92 * c
        return int(round(c * 255))

    return enc(r), enc(g), enc(bl)


def parse_accent(accent):
    m = re.match(r"oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)", accent or "")
    return (
        (float(m.group(1)), float(m.group(2)), float(m.group(3)))
        if m
        else (0.55, 0.13, 250.0)
    )


def gradient(L, C, h):
    """Diagonal light→dark wash, top-left to bottom-right."""
    top = oklch_to_rgb(min(L + 0.10, 0.95), C * 0.92, h)
    bottom = oklch_to_rgb(max(L - 0.12, 0.12), C * 0.95, h)
    n = SIZE * SS
    img = Image.new("RGB", (n, n))
    px = img.load()
    for y in range(n):
        for x in range(0, n, 8):  # 8px bands: invisible after downsampling
            t = (x + y) / (2 * (n - 1))
            c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
            for dx in range(min(8, n - x)):
                px[x + dx, y] = c
    return img


# ── drawing helpers (all coordinates in the 0–512 design space) ───────────
class Pen:
    def __init__(self, draw):
        self.d = draw

    def _s(self, box):
        return [v * SS for v in box]

    def rrect(self, box, r, fill=WHITE, outline=None, width=0):
        self.d.rounded_rectangle(
            self._s(box), radius=r * SS, fill=fill, outline=outline, width=width * SS
        )

    def circle(self, cx, cy, r, fill=WHITE, outline=None, width=0):
        self.rrect([cx - r, cy - r, cx + r, cy + r], r, fill, outline, width)

    def line(self, pts, width, fill=WHITE):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=width * SS,
                    joint="curve")

    def arc(self, box, start, end, width, fill=WHITE):
        self.d.arc(self._s(box), start, end, fill=fill, width=width * SS)

    def poly(self, pts, fill=WHITE):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)

    def check(self, cx, cy, r, fill=WHITE):
        self.line(
            [(cx - r * 0.55, cy), (cx - r * 0.15, cy + r * 0.42), (cx + r * 0.6, cy - r * 0.45)],
            max(2, int(r * 0.34)),
            fill,
        )

    def badge(self, cx, cy, r, colour):
        """Corner badge: a hole punched in the artwork, then a filled disc."""
        self.circle(cx, cy, r + 12, fill=(0, 0, 0, 0))
        self.circle(cx, cy, r, fill=colour)


# ── the marks ─────────────────────────────────────────────────────────────
def doc(p, x=140, y=96, w=232, h=320, r=22):
    p.rrect([x, y, x + w, y + h], r)


def doc_lines(p, colour, x=176, y=150, w=160, gap=44, n=4, h=20):
    for i in range(n):
        wide = w if i % 2 == 0 else int(w * 0.86)
        p.rrect([x, y + i * gap, x + wide, y + i * gap + h], h // 2, colour)


def browser(p, base, x=104, y=128, w=304, h=248):
    p.rrect([x, y, x + w, y + h], 24)
    p.line([(x, y + 56), (x + w, y + 56)], 6, base)
    for i in range(3):
        p.circle(x + 34 + i * 34, y + 28, 9, fill=base)


def calendar(p, base, x=112, y=128, w=288, h=248, cols=4, rows=2):
    p.rrect([x, y, x + w, y + h], 26)
    p.line([(x, y + 62), (x + w, y + 62)], 8, base)
    cw = (w - 60) / cols
    for row in range(rows):
        for col in range(cols):
            cx = x + 30 + col * cw
            cy = y + 92 + row * 62
            p.rrect([cx, cy, cx + cw * 0.62, cy + 40], 10, base)


def star(p, cx, cy, r, fill=WHITE):
    pts = []
    for i in range(10):
        ang = math.radians(-90 + i * 36)
        rad = r if i % 2 == 0 else r * 0.44
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    p.poly(pts, fill)


def bubble(p, x, y, w, h, tail=True):
    p.rrect([x, y, x + w, y + h], 30)
    if tail:
        p.poly([(x + 56, y + h - 6), (x + 116, y + h - 6), (x + 62, y + h + 54)])


def bars(p, heights, x=136, y_base=392, w=52, gap=24):
    for i, hgt in enumerate(heights):
        left = x + i * (w + gap)
        p.rrect([left, y_base - hgt, left + w, y_base], 12)


def tray(p, base):
    p.rrect([112, 244, 400, 392], 26)
    p.poly([(140, 244), (372, 244), (340, 312), (172, 312)], base)


def dollar(p, cx, cy, r, colour):
    w = max(8, int(r * 0.24))
    p.arc([cx - r * 0.62, cy - r * 0.86, cx + r * 0.62, cy - r * 0.02], 20, 250, w, colour)
    p.arc([cx - r * 0.62, cy + r * 0.02, cx + r * 0.62, cy + r * 0.86], 200, 70, w, colour)
    p.line([(cx, cy - r * 1.05), (cx, cy + r * 1.05)], w, colour)


def magnifier(p, cx, cy, r, colour=WHITE, hole=None):
    p.circle(cx, cy, r, fill=colour)
    p.circle(cx, cy, r - 16, fill=hole if hole else (0, 0, 0, 0))
    p.line([(cx + r * 0.72, cy + r * 0.72), (cx + r * 1.5, cy + r * 1.5)], 22, colour)


def pin(p, cx=256, cy=200, r=86):
    p.circle(cx, cy, r)
    p.poly([(cx - r * 0.78, cy + r * 0.62), (cx + r * 0.78, cy + r * 0.62), (cx, cy + r * 2.1)])
    p.circle(cx, cy, r * 0.38, fill=(0, 0, 0, 0))


def MARKS():
    """appId -> draw(pen, base_rgb). base_rgb tints shapes that sit on white."""
    def resume_like(p, base, badge_colour=GREEN, tick=True):
        doc(p)
        doc_lines(p, base)
        if tick:
            p.badge(370, 372, 78, badge_colour)
            p.check(370, 372, 46)

    def interview_scheduler(p, base):
        calendar(p, base)
        p.badge(372, 372, 74, WHITE)
        p.circle(372, 372, 74, fill=WHITE)
        p.circle(372, 372, 58, fill=base)
        p.line([(372, 372), (372, 336)], 12, WHITE)
        p.line([(372, 372), (402, 386)], 12, WHITE)

    def speed_to_lead(p, base):
        p.rrect([104, 152, 408, 360], 26)
        p.poly([(104, 168), (256, 282), (408, 168), (408, 152), (104, 152)], base)
        p.badge(374, 366, 80, WHITE)
        p.poly([(384, 306), (338, 380), (372, 380), (356, 434), (410, 352), (374, 352)], base)

    def lead_enrichment(p, base):
        p.rrect([96, 136, 416, 368], 22)
        p.rrect([96, 136, 416, 196], 0, fill=base)
        for r_ in range(3):
            p.rrect([116, 216 + r_ * 52, 250, 244 + r_ * 52], 14, base)
            p.rrect([274, 216 + r_ * 52, 396, 244 + r_ * 52], 14, base)
        p.badge(372, 372, 84, WHITE)
        magnifier(p, 364, 364, 52, WHITE, hole=base)

    def pipeline_staleness(p, base):
        p.poly([(112, 132), (400, 132), (300, 260), (300, 396), (212, 344), (212, 260)])
        p.badge(376, 368, 78, WHITE)
        p.circle(376, 368, 78, fill=WHITE)
        p.circle(376, 368, 62, fill=base)
        p.line([(376, 368), (376, 330)], 12, WHITE)
        p.line([(376, 368), (408, 382)], 12, WHITE)

    def proposal_builder(p, base):
        doc(p)
        doc_lines(p, base, n=3)
        p.badge(372, 372, 80, WHITE)
        dollar(p, 372, 372, 46, base)

    def google_review(p, base):
        bubble(p, 96, 120, 320, 216)
        star(p, 256, 224, 78, base)

    def yelp_review(p, base):
        star(p, 200, 216, 104)
        bubble(p, 232, 264, 184, 128, tail=False)
        p.rrect([264, 306, 384, 322], 8, base)
        p.rrect([264, 342, 344, 358], 8, base)

    def testimonial(p, base):
        bubble(p, 96, 120, 320, 216)
        for dx in (0, 96):
            p.rrect([160 + dx, 176, 200 + dx, 216], 8, base)
            p.poly([(160 + dx, 216), (200 + dx, 216), (170 + dx, 262)], base)
        p.badge(374, 366, 78, GREEN)
        star(p, 374, 366, 46)

    def gbp(p, base):
        pin(p)
        p.rrect([196, 168, 316, 188], 8, base)
        p.rrect([206, 200, 306, 250], 6, base)

    def social(p, base):
        p.circle(160, 256, 56)
        p.circle(360, 160, 52)
        p.circle(360, 352, 52)
        p.line([(160, 256), (360, 160)], 18)
        p.line([(160, 256), (360, 352)], 18)

    def competitor(p, base):
        p.rrect([96, 200, 224, 384], 62)
        p.rrect([288, 200, 416, 384], 62)
        p.circle(160, 300, 40, fill=base)
        p.circle(352, 300, 40, fill=base)
        p.rrect([224, 232, 288, 268], 12)
        p.poly([(120, 200), (176, 128), (216, 128), (200, 200)])
        p.poly([(392, 200), (336, 128), (296, 128), (312, 200)])

    def invoice_chaser(p, base):
        p.poly(
            [(140, 96), (372, 96), (372, 416), (334, 384), (296, 416), (256, 384),
             (216, 416), (178, 384), (140, 416)]
        )
        doc_lines(p, base, x=176, y=150, w=160, n=3)
        p.badge(374, 372, 80, WHITE)
        dollar(p, 374, 372, 46, base)

    def spend_anomaly(p, base):
        p.line([(112, 336), (192, 272), (256, 312), (336, 176), (408, 232)], 22)
        for x, y in ((112, 336), (192, 272), (256, 312), (336, 176), (408, 232)):
            p.circle(x, y, 15)
        p.badge(360, 372, 86, WHITE)
        p.poly([(360, 320), (422, 420), (298, 420)], base)
        p.line([(360, 356), (360, 388)], 11, WHITE)
        p.circle(360, 404, 7, fill=WHITE)

    def bookkeeping(p, base):
        p.rrect([104, 120, 408, 392], 26)
        for i in range(3):
            y = 176 + i * 72
            p.rrect([136, y - 22, 180, y + 22], 10, base)
            p.rrect([204, y - 12, 372, y + 12], 12, base)
        p.badge(374, 372, 80, GREEN)
        p.check(374, 372, 46)

    def meeting_debriefer(p, base):
        p.rrect([208, 96, 304, 272], 48)
        p.line([(160, 240), (160, 268)], 20)
        p.line([(352, 240), (352, 268)], 20)
        p.line([(160, 268), (352, 268)], 20)
        p.line([(256, 268), (256, 336)], 20)
        p.rrect([192, 348, 320, 372], 12)
        p.badge(378, 356, 76, GREEN)
        p.check(378, 356, 44)

    def meeting_prep(p, base):
        calendar(p, base, x=96, y=104, w=250, h=214, cols=3)
        p.rrect([236, 236, 424, 424], 22)
        doc_lines(p, base, x=266, y=274, w=128, gap=38, n=3, h=16)

    def inbox_triage(p, base):
        tray(p, base)
        p.rrect([160, 128, 352, 152], 12)
        p.rrect([184, 176, 328, 200], 12)
        p.rrect([208, 224, 304, 248], 12)
        p.badge(378, 366, 74, GREEN)
        p.check(378, 366, 42)

    def fundraising(p, base):
        bars(p, [96, 168, 240])
        p.badge(372, 356, 84, WHITE)
        dollar(p, 372, 356, 48, base)

    def renewal(p, base):
        doc(p, x=128, y=88, w=256, h=336, r=24)
        doc_lines(p, base, x=168, y=140, w=176, n=3)
        p.badge(370, 366, 86, WHITE)
        p.arc([326, 322, 414, 410], 110, 20, 16, base)
        p.poly([(392, 296), (416, 344), (364, 340)], base)

    def rfp(p, base):  # noqa: E301
        p.poly([(256, 104), (416, 192), (96, 192)])
        p.rrect([96, 200, 416, 224], 8)
        for i in range(4):
            p.rrect([128 + i * 70, 232, 168 + i * 70, 344], 8)
        p.rrect([96, 352, 416, 384], 8)
        p.badge(376, 368, 82, WHITE)
        magnifier(p, 368, 360, 50, WHITE, hole=base)

    def website_editor(p, base):
        browser(p, base)
        p.rrect([144, 216, 320, 240], 10, base)
        p.rrect([144, 264, 264, 288], 10, base)
        p.badge(370, 366, 86, WHITE)
        p.poly([(330, 410), (346, 358), (398, 306), (428, 336), (376, 388)], base)
        p.line([(346, 358), (376, 388)], 7, WHITE)

    def website_watchdog(p, base):
        browser(p, base)
        p.line([(136, 288), (188, 288), (216, 236), (256, 336), (288, 288), (376, 288)], 18, base)
        p.badge(374, 368, 84, WHITE)
        p.poly([(374, 312), (424, 334), (424, 378), (374, 422), (324, 378), (324, 334)], base)
        p.check(374, 366, 34, WHITE)

    def repo_engineer(p, base):
        p.circle(160, 152, 40)
        p.circle(160, 376, 40)
        p.circle(352, 264, 40)
        p.line([(160, 152), (160, 376)], 20)
        p.line([(160, 264), (352, 264)], 20)
        p.circle(160, 152, 18, fill=base)
        p.circle(160, 376, 18, fill=base)
        p.circle(352, 264, 18, fill=base)

    return {
        "resume-screener": resume_like,
        "interview-scheduler": interview_scheduler,
        "speed-to-lead": speed_to_lead,
        "lead-enrichment": lead_enrichment,
        "pipeline-staleness": pipeline_staleness,
        "proposal-builder": proposal_builder,
        "google-review-responder": google_review,
        "yelp-review-responder": yelp_review,
        "testimonial-harvester": testimonial,
        "gbp-maintainer": gbp,
        "social-repurposer": social,
        "competitor-brief": competitor,
        "invoice-chaser": invoice_chaser,
        "spend-anomaly-watch": spend_anomaly,
        "bookkeeping-tidy": bookkeeping,
        "meeting-debriefer": meeting_debriefer,
        "meeting-prep": meeting_prep,
        "inbox-triage": inbox_triage,
        "fundraising-crm": fundraising,
        "renewal-tracker": renewal,
        "rfp-finder": rfp,
        "website-editor": website_editor,
        "website-watchdog": website_watchdog,
        "repo-engineer": repo_engineer,
    }


# ── compose ───────────────────────────────────────────────────────────────
def render(app_id, accent, draw_mark):
    L, C, h = parse_accent(accent)
    base = oklch_to_rgb(L, C, h)
    n = SIZE * SS

    icon = gradient(L, C, h).convert("RGBA")

    # Rounded-square silhouette.
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=112 * SS, fill=255)
    icon.putalpha(mask)

    # Inset hairline outline, then the mark, on one transparent layer so the
    # marks can punch holes (badges) without eating the background.
    art = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    pen = Pen(ImageDraw.Draw(art))
    pen.rrect([16, 16, SIZE - 16, SIZE - 16], 92, fill=None, outline=WHITE, width=5)
    draw_mark(pen, base)

    icon.alpha_composite(art)
    return icon.resize((SIZE, SIZE), Image.LANCZOS)


def main(argv):
    force = "--force" in argv
    wanted = [a for a in argv if not a.startswith("--")]
    marks = MARKS()
    written = []
    for manifest_path in sorted(APPS.glob("*/app.json")):
        app_id = manifest_path.parent.name
        if wanted and app_id not in wanted:
            continue
        out = manifest_path.parent / "icon.png"
        if out.exists() and not force:
            continue
        mark = marks.get(app_id)
        if mark is None:
            print(f"… {app_id}: no mark defined, skipping")
            continue
        manifest = json.loads(manifest_path.read_text())
        render(app_id, manifest.get("accent"), mark).save(out)
        written.append(app_id)
    print(f"✔ wrote {len(written)} icons" + (f": {', '.join(written)}" if written else ""))


if __name__ == "__main__":
    main(sys.argv[1:])
