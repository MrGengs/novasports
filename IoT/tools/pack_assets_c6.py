"""
Pack screen assets for the NovaSports ESP32-C6 display (240 x 280 portrait).

    python3 tools/pack_assets_c6.py [--novaband ../../novaband]

Reuses the Nova-Band asset pipeline's output and re-targets it to the portrait panel:
  splash  <- novaband/build/screen/splash/f_*.png   (gold Blender renders, every 2nd frame, 240x280)
  spin    <- novaband/build/screen/spin/f_*.png     (3D band turntable)
  bg      <- generated here: gold bokeh, half-res 240x140 (firmware upscales 2x -> 480x280 parallax strip)
  heart, icons, fonts, QR  <- copied byte-for-byte from novaband/firmware/prebuilt/assets.bin
out: build/assets.bin  (flash at 0x310000)  and  novasports_display/src/asset_ids.h
"""
import argparse, glob, os, struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
here = os.path.dirname(os.path.abspath(__file__))
ap.add_argument("--novaband", default=os.path.normpath(os.path.join(here, "..", "..", "..", "novaband")))
args = ap.parse_args()
NB = args.novaband
W, H = 240, 280
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0

def to565(rgb):
    a = rgb.astype(np.float32); h, w = a.shape[:2]
    d = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    r = np.clip(np.floor(a[..., 0] / 255 * 31 + d), 0, 31).astype(np.uint16)
    g = np.clip(np.floor(a[..., 1] / 255 * 63 + d), 0, 63).astype(np.uint16)
    b = np.clip(np.floor(a[..., 2] / 255 * 31 + d), 0, 31).astype(np.uint16)
    return (r << 11) | (g << 5) | b

entries = []
def add(name, typ, w, h, frames, data, extra=0):
    entries.append((name, typ, w, h, frames, extra, data))

# ---- splash: the landscape render sits in the upper-middle, black above/below, wordmark drawn by the UI
fr = sorted(glob.glob(os.path.join(NB, "build", "screen", "splash", "f_*.png")))[::2]
RW, RH = 240, 127; RY = 24
yy = np.arange(H)[:, None]
mask = np.zeros((H, 1), np.float32)
band = (yy - RY) / RH
inside = (band >= 0) & (band <= 1)
mask[inside] = np.minimum(1, np.minimum(band[inside], 1 - band[inside]) / 0.22)
blob = bytearray()
for i, f in enumerate(fr):
    im = Image.open(f).convert("RGB").resize((RW, RH), Image.LANCZOS)
    canvas = np.zeros((H, W, 3), np.float32)
    canvas[RY:RY + RH] = np.asarray(im).astype(np.float32)
    canvas *= mask[..., None]
    canvas += np.array([20, 16, 0], np.float32) * (1 - mask[..., None]) * 0.0   # keep the area outside pure black
    fade = min(1.0, (i + 1) / 5.0) ** 1.6
    blob += to565(canvas * fade).tobytes()
add("splash", 1, W, H, len(fr), bytes(blob))

# ---- bg: gold bokeh, half-res 240 x 140
rng = np.random.default_rng(7)
bw, bh = 480, 280
img = Image.new("RGB", (bw, bh), (20, 16, 0))
g = np.asarray(img).astype(np.float32)
Y, X = np.mgrid[0:bh, 0:bw]
g += (np.array([34, 26, 2], np.float32)) * np.clip(1 - Y / bh, 0, 1)[..., None] * 0.6
img = Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))
lay = Image.new("RGB", (bw, bh), (0, 0, 0)); d = ImageDraw.Draw(lay)
cols = [(255, 200, 40), (255, 243, 196), (255, 138, 31), (201, 176, 112)]
for _ in range(34):
    cx, cy = rng.uniform(0, bw), rng.uniform(0, bh); r = rng.uniform(12, 44)
    c = cols[rng.integers(0, 4)]; k = rng.uniform(0.10, 0.26)
    d.regular_polygon((cx, cy, r), 7, rotation=float(rng.uniform(0, 50)), fill=tuple(int(v * k) for v in c))
lay = lay.filter(ImageFilter.GaussianBlur(5))
bg = np.clip(np.asarray(img).astype(np.float32) + np.asarray(lay).astype(np.float32), 0, 255)
vig = 1 - 0.5 * (((X - bw / 2) / (bw * 0.7)) ** 2 + ((Y - bh / 2) / (bh * 0.7)) ** 2)
bg *= np.clip(vig, 0.3, 1)[..., None] * 0.8
bgh = np.asarray(Image.fromarray(bg.astype(np.uint8)).resize((240, 140), Image.LANCZOS))
add("bg", 1, 240, 140, 1, to565(bgh).tobytes())

# ---- spin (gold band turntable)
spin = sorted(glob.glob(os.path.join(NB, "build", "screen", "spin", "f_*.png")))
boxes = [Image.open(f).getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox() for f in spin]
ub = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
side = max(ub[2] - ub[0], ub[3] - ub[1]); cx, cy = (ub[0] + ub[2]) // 2, (ub[1] + ub[3]) // 2
SP = 88; blob = bytearray()
for f in spin:
    im = Image.open(f).convert("RGBA").crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((SP, SP), Image.LANCZOS)
    a = np.asarray(im); blob += to565(a[..., :3]).tobytes() + a[..., 3].tobytes()
add("spin", 2, SP, SP, len(spin), bytes(blob))

# ---- copy the rest from the prebuilt Nova-Band image
pb = open(os.path.join(NB, "firmware", "prebuilt", "assets.bin"), "rb").read()
assert pb[:4] == b"NBA1"
cnt, total = struct.unpack_from("<II", pb, 4)
ent = []
for i in range(cnt):
    n, typ, off, w, h, fr_, _, size, extra = struct.unpack_from("<24sIIHHHHII", pb, 16 + 48 * i)
    ent.append((n.rstrip(b"\0").decode(), typ, off, w, h, fr_, size, extra))
for n, typ, off, w, h, fr_, size, extra in ent:
    if n in ("splash", "bg", "spin"): continue
    add(n, typ, w, h, fr_, pb[off:off + size], extra)

HEAD, ENT = 16, 48
off = HEAD + ENT * len(entries); table, data = bytearray(), bytearray()
for name, typ, w, h, frames, extra, raw in entries:
    pad = (-off) % 4; data += b"\0" * pad; off += pad
    table += struct.pack("<24sIIHHHHII", name.encode(), typ, off, w, h, frames, 0, len(raw), extra)
    data += raw; off += len(raw)
out = struct.pack("<4sIII", b"NBA1", len(entries), off, 0) + table + data
os.makedirs(os.path.join(here, "..", "build"), exist_ok=True)
open(os.path.join(here, "..", "build", "assets.bin"), "wb").write(out)
hdr = ["// generated by tools/pack_assets_c6.py - do not edit", "#pragma once", "namespace A {"]
for i, e in enumerate(entries): hdr.append("constexpr int %s = %d;" % (e[0].upper(), i))
hdr += ["constexpr int COUNT = %d;" % len(entries), "}  // namespace A", ""]
open(os.path.join(here, "..", "novasports_display", "src", "asset_ids.h"), "w").write("\n".join(hdr))
for name, typ, w, h, frames, extra, raw in entries:
    print("%-14s type %d  %4dx%-4d x%-3d %8.1f KB" % (name, typ, w, h, frames, len(raw) / 1024))
print("assets.bin %.2f MB (partition 12 MB)" % (len(out) / 1048576))
assert len(out) < 0xC00000
