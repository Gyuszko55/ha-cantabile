"""Cantabile TV, DLNA mód: a szám adatlapja egyetlen 1920×1080-as képként (Kodi-szerű), amit a TV borítóként kap meg.

Háttér: az előadó képe (elsötétítve, balra erősebben), ha nincs, a borító elmosva, ha az sincs, borostyán–lila átmenet
hanglemezzel. Balra a borító (vagy hanglemez), jobbra NOW PLAYING / ON AIR, cím (legfeljebb két sor), előadó, album · év,
formátum-címkék; lent a Cantabile felirat. A rajzolás a végrehajtó szálon fut (Pillow).
"""

from __future__ import annotations

import io
import os
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H = 1920, 1080
BOR = 620                       # a borító oldala
BAL = 150                       # bal margó
SZOVEG_X = BAL + BOR + 90
SZOVEG_W = W - SZOVEG_X - 130
BOROSTYAN = (255, 181, 71)
KREM = (243, 234, 216)
FONTS = os.path.join(os.path.dirname(__file__), "fonts")


def _betu(nev: str, meret: int, suly: int | None = None) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(os.path.join(FONTS, nev), meret)
    if suly is not None:
        try:
            f.set_variation_by_axes([suly])
        except (OSError, AttributeError):
            pass
    return f


def _kep(adat: bytes | None) -> Image.Image | None:
    if not adat:
        return None
    try:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(adat))).convert("RGB")
    except Exception:  # noqa: BLE001
        return None


def _lemez(meret: int) -> Image.Image:
    k = Image.new("RGBA", (meret, meret), (0, 0, 0, 0))
    d = ImageDraw.Draw(k)
    r = meret / 2
    d.ellipse((0, 0, meret - 1, meret - 1), fill=(22, 22, 25, 255))
    for i in range(14):
        rr = r * (0.36 + i * 0.044)
        d.ellipse((r - rr, r - rr, r + rr, r + rr), outline=(255, 255, 255, 14), width=2)
    rr = r * 0.18
    d.ellipse((r - rr, r - rr, r + rr, r + rr), fill=(217, 164, 65, 255))
    d.ellipse((r - 6, r - 6, r + 6, r + 6), fill=(7, 7, 8, 255))
    return k


def _sorok(d: ImageDraw.ImageDraw, szoveg: str, betu: ImageFont.FreeTypeFont, szel: int, max_sor: int) -> list[str]:
    szavak, sorok, akt = szoveg.split(), [], ""
    for sz in szavak:
        uj = f"{akt} {sz}".strip()
        if d.textlength(uj, font=betu) <= szel:
            akt = uj
            continue
        if akt:
            sorok.append(akt)
        akt = sz
    if akt:
        sorok.append(akt)
    if len(sorok) > max_sor:
        sorok = sorok[:max_sor]
        while sorok[-1] and d.textlength(sorok[-1] + "…", font=betu) > szel:
            sorok[-1] = sorok[-1][:-1]
        sorok[-1] = sorok[-1].rstrip() + "…"
    return [s if d.textlength(s, font=betu) <= szel else _vag(d, s, betu, szel) for s in sorok]


def _vag(d: ImageDraw.ImageDraw, s: str, betu: ImageFont.FreeTypeFont, szel: int) -> str:
    while s and d.textlength(s + "…", font=betu) > szel:
        s = s[:-1]
    return s.rstrip() + "…"


def rajzol(meta: dict[str, Any], eloado_kep: bytes | None, borito: bytes | None) -> bytes:
    hatter_forras, bor = _kep(eloado_kep), _kep(borito)
    radio = meta.get("kind") == "stream"

    # háttér
    if hatter_forras or bor:
        h = ImageOps.fit(hatter_forras or bor, (W, H), Image.LANCZOS, centering=(0.5, 0.3))
        h = h.filter(ImageFilter.GaussianBlur(4 if hatter_forras else 28))
    else:
        h = Image.new("RGB", (W, H), (12, 11, 14))
        f = Image.new("RGB", (W, H), (0, 0, 0))
        fd = ImageDraw.Draw(f)
        fd.ellipse((W * 0.45, -H * 0.2, W * 1.15, H * 0.95), fill=(120, 72, 20))
        fd.ellipse((-W * 0.2, H * 0.5, W * 0.45, H * 1.4), fill=(70, 34, 90))
        h = Image.blend(h, f.filter(ImageFilter.GaussianBlur(160)), 0.55)
        lem = _lemez(900)
        h.paste(lem, (W - 640, 90), lem)
    sotet = Image.new("L", (W, H))
    sd = ImageDraw.Draw(sotet)
    for x in range(W):                                     # balra erősebb sötétítés (ott a szöveg)
        sd.line((x, 0, x, H), fill=int(245 - 150 * (x / W) ** 1.4))
    h = Image.composite(Image.new("RGB", (W, H), (6, 6, 8)), h, sotet)
    lent = Image.linear_gradient("L").resize((W, H)).point(lambda v: max(0, v - 120) * 2)
    h = Image.composite(Image.new("RGB", (W, H), (4, 4, 5)), h, lent)
    d = ImageDraw.Draw(h, "RGBA")

    # borító árnyékkal
    y0 = (H - BOR) // 2 - 10
    arny = Image.new("RGBA", (BOR + 160, BOR + 160), (0, 0, 0, 0))
    ImageDraw.Draw(arny).rectangle((80, 100, BOR + 80, BOR + 100), fill=(0, 0, 0, 200))
    arny = arny.filter(ImageFilter.GaussianBlur(34))
    h.paste(arny, (BAL - 80, y0 - 80), arny)
    if bor:
        h.paste(ImageOps.fit(bor, (BOR, BOR), Image.LANCZOS), (BAL, y0))
        d.rectangle((BAL, y0, BAL + BOR - 1, y0 + BOR - 1), outline=(255, 255, 255, 28), width=2)
    else:
        d.rectangle((BAL, y0, BAL + BOR, y0 + BOR), fill=(26, 24, 21, 255))
        lem = _lemez(BOR - 70)
        h.paste(lem, (BAL + 35, y0 + 35), lem)

    # szövegek
    y = y0 + 40
    cimke = "ON AIR" if radio else "NOW PLAYING"
    d.ellipse((SZOVEG_X, y + 6, SZOVEG_X + 16, y + 22), fill=(255, 176, 32, 255))
    d.text((SZOVEG_X + 34, y), cimke, font=_betu("Michroma.ttf", 24), fill=BOROSTYAN + (255,), spacing=0)
    y += 62
    cim = (meta.get("title") or meta.get("station") or "") if not radio else (meta.get("title") or meta.get("station") or "")
    nagy = _betu("Exo2.ttf", 92, 620)
    for sor in _sorok(d, cim, nagy, SZOVEG_W, 2):
        d.text((SZOVEG_X, y), sor, font=nagy, fill=(255, 255, 255, 255))
        y += 104
    y += 14
    masod = (meta.get("station") if radio and meta.get("title") else meta.get("artist")) or ""
    if masod:
        f = _betu("Exo2.ttf", 52, 520)
        d.text((SZOVEG_X, y), _vag(d, masod, f, SZOVEG_W) if d.textlength(masod, font=f) > SZOVEG_W else masod, font=f, fill=(241, 227, 198, 255))
        y += 72
    alb = "  ·  ".join(x for x in (meta.get("album"), meta.get("year")) if x)
    if alb:
        f = _betu("Exo2.ttf", 36, 420)
        d.text((SZOVEG_X, y), _vag(d, alb, f, SZOVEG_W) if d.textlength(alb, font=f) > SZOVEG_W else alb, font=f, fill=(185, 173, 152, 255))
        y += 58
    rate, bits = meta.get("rate") or 0, meta.get("bits") or 0
    khz = f"{rate / 1000:g} KHZ" + (f" / {bits} BIT" if bits else "") if rate else ""
    csipek = [str(x).upper() for x in (meta.get("codec"), khz, f"{meta['kbps']} KBPS" if meta.get("kbps") else "",
                                        f"TRACK {meta['track']}" if meta.get("track") else "", meta.get("genre"),
                                        "INTERNET RADIO" if radio else "") if x]
    y += 22
    cf, x = _betu("Michroma.ttf", 20), SZOVEG_X
    for c in csipek:
        sz = d.textlength(c, font=cf)
        if x + sz + 36 > SZOVEG_X + SZOVEG_W:
            break
        d.rounded_rectangle((x, y, x + sz + 36, y + 46), radius=5, fill=(20, 16, 10, 140), outline=(255, 176, 32, 120), width=2)
        d.text((x + 18, y + 11), c, font=cf, fill=(255, 208, 138, 255))
        x += sz + 52

    # márka
    d.text((BAL, H - 120), "Cantabile", font=_betu("GreatVibes.ttf", 64), fill=KREM + (235,))
    ki = io.BytesIO()
    h.save(ki, "JPEG", quality=88, optimize=True)
    return ki.getvalue()
