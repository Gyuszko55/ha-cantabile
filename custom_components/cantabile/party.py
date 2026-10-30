"""PARTY: végtelen keverés a zenemappából, vendégkívánságokkal.

A kártya PARTY füléről indul (`cantabile/party/start`): a választott albumokból (műfajcsaládok vagy az egész zenetár) a
szerver véletlenszerűen válogat – ugyanaz a szám sokáig nem jön újra, ugyanaz az előadó nem jön kétszer egymás után –,
és addig tölti, amíg le nem állítják, vagy más nem kezd szólni a hangszórón. Sonoson a hangszóró saját sorába mindig a
következő szám kerül (hézag nélkül szól), más lejátszón a beépített sorozatlejátszó viszi. A kártya bezárása nem állítja le.

Vendégkívánságok: titkos linkű oldal (a kártyán QR-kód), Home Assistant-fiók nélkül – keresés a zenemappában, „Kérem”
(vendégenként legfeljebb 3 függő kívánság). A kívánság a következő szabad helyre kerül; a link a party végéig érvényes.

Websocket: `cantabile/party/start`, `…/stop`, `…/state`, `…/skip`, `…/guests`.
Vendégoldal: `/api/cantabile/party/<token>` (és `/state`, `/search`, `/request`).
"""

from __future__ import annotations

import logging
import random
import re
import secrets
import time
from collections import deque
from typing import Any
from urllib.parse import unquote

import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_state_change_event

from . import foglalas
from .const import DOMAIN
from .library import ELOTAG
from .music import HibaUzenet, nas_lista, norm, sonos_valtozat, tiszta_nev

_LOGGER = logging.getLogger(__name__)

URL = "/api/cantabile/party"
KIVANSAG_MAX = 3            # függő kívánság vendégenként
KIVANSAG_OSSZES = 30        # függő kívánság összesen
ELOZMENY_MAX = 300          # ennyi szám nem jön újra (kis válogatásnál a fele)


def kozpont(hass: HomeAssistant) -> Partik:
    return hass.data[DOMAIN]["party"]


def _eloado(rel: str) -> str:
    t = rel.split("/")
    return t[0] if len(t) > 2 else ""


def _szam(rel: str) -> dict[str, str]:
    t = rel.split("/")
    return {"f": rel, "cim": re.sub(r"^\d{1,3}\s*[-._)]\s*", "", tiszta_nev(rel)) or tiszta_nev(rel), "eloado": t[0] if len(t) > 2 else "", "album": t[-2] if len(t) > 1 else ""}


class Party:
    """Egy hangszóró (vagy Sonos-csoport) partyja; a sorozatlejátszónak iterátorként adja a számokat."""

    party = True
    szamok: list[str] = []          # a sorozatlejátszó felé: nincs rögzített sor

    def __init__(self, kp: Partik, tagok: list[str], mod: str, nas: str, osszes: dict[str, list[str]], albumok: list[str] | None,
                 cim: str, hires: str | None, gazda: dict[str, str]) -> None:
        self.kp, self.hass = kp, kp.hass
        self.tagok, self.e, self.mod, self.nas, self.cim, self.hires, self.gazda = tagok, tagok[0], mod, nas, cim, hires, gazda
        self.osszes = osszes
        kulcsok = albumok if albumok else [a for a in osszes if not (hires and (a == hires or a.startswith(f"{hires}/")))]
        self.pool = [f for a in dict.fromkeys(kulcsok) for f in osszes.get(a, [])]
        self.elozmeny: deque[str] = deque(maxlen=max(1, min(ELOZMENY_MAX, len(self.pool) // 2)))
        self.eloadok: deque[str] = deque(maxlen=2)
        self.kivansag: deque[dict[str, Any]] = deque()
        self.lejatszva: deque[dict[str, Any]] = deque(maxlen=30)
        self.kerte: dict[str, str] = {}             # rel → ki kérte (a „most szól” kijelzéséhez)
        self.token = secrets.token_urlsafe(18)
        self.vendeg = True
        self.indult = time.time()
        self.most: str | None = None
        self.utolso: str | None = None
        self._le: list[Any] = []
        self._tolt = False
        self.aktiv = True

    # ---- válogatás ----
    def kovetkezo_rel(self) -> str:
        if self.kivansag:
            k = self.kivansag.popleft()
            f = k["f"]
            if k.get("ki"):
                self.kerte[f] = k["ki"]
        else:
            f = random.choice(self.pool)
            for proba in range(60):
                if f not in self.elozmeny and (proba > 40 or _eloado(f) not in self.eloadok or not _eloado(f)):
                    break
                f = random.choice(self.pool)
        self.elozmeny.append(f)
        self.eloadok.append(_eloado(f))
        return f

    def __iter__(self) -> Party:
        return self

    def __next__(self) -> str:
        if not self.aktiv or not self.pool:
            raise StopIteration
        self.utolso = f"{self.nas}/{self.kovetkezo_rel()}"
        return self.utolso

    def kovetkezo(self) -> str | None:
        return None

    def _rel(self, id_or_url: str) -> str | None:
        """A szóló szám (media-source azonosító vagy a Sonos aláírt linkje) zenemappán belüli útja."""
        t = unquote(str(id_or_url or "")).split("?")[0]
        if t.startswith(f"{self.nas}/"):
            rel = t[len(self.nas) + 1:]
        else:
            jel = f"/media/{self.nas[len(ELOTAG):]}/"           # a Sonos aláírt linkje: http://…/media/local/NAS310/…
            if jel not in t:
                return None
            rel = t.split(jel, 1)[1]
        if self.hires and rel.startswith(f"{self.hires}/"):
            # a Sonos 48 kHz-es másolata: az eredeti album azonos nevű száma
            eloado, album, fajl = (rel.split("/", 1)[1].split("/") + ["", ""])[:3]
            for a in self.osszes:
                if a.startswith(f"{eloado}/") and fajl in {x.rpartition("/")[2] for x in self.osszes[a]}:
                    return f"{a}/{fajl}"
        return rel

    # ---- indítás / leállítás ----
    async def indit(self) -> None:
        if self.mod != "sonos":
            self.kp.rt.play_iter(self.e, self)
            return
        z = self.kp.zene
        z._hatter_le(self.tagok)
        await z.csoport(self.tagok)
        e = {"entity_id": self.e}
        await z.hiv("media_player", "shuffle_set", {**e, "shuffle": False})
        await z.hiv("media_player", "repeat_set", {**e, "repeat": "off"})
        await z.hiv("media_player", "clear_playlist", e)
        for _ in range(2):
            await self._sonos_hozzaad()
        await z.hiv("sonos", "play_queue", {**e, "queue_position": 0})
        self._le.append(async_track_state_change_event(self.hass, [self.e], self._sonos_allapot))

    async def _sonos_hozzaad(self) -> None:
        for _ in range(3):           # egy hibás fájl ne akassza meg: a következővel próbálja
            rel = self.kovetkezo_rel()
            uj = sonos_valtozat(self.osszes, [rel], self.hires)[0]
            try:
                await self.kp.zene.hiv("media_player", "play_media", {"entity_id": self.e, "media_content_id": f"{self.nas}/{uj}",
                                                                      "media_content_type": "music", "enqueue": "add"})
                return
            except Exception as err:  # noqa: BLE001
                _LOGGER.warning("Cantabile PARTY: kihagyva %s (%s)", rel, err)

    @callback
    def _sonos_allapot(self, ev: Event) -> None:
        uj = ev.data.get("new_state")
        if not self.aktiv or uj is None:
            return
        a = uj.attributes
        cid = str(a.get("media_content_id") or "")
        if uj.state in ("playing", "paused") and cid and self._rel(cid) is None:
            _LOGGER.info("Cantabile PARTY: más szól a(z) %s hangszórón, a party véget ért", self.e)
            self.kp.vege(self.e)
            return
        meret, hely = a.get("queue_size"), a.get("queue_position")
        if uj.state == "playing" and meret is not None and hely is not None and int(meret) - int(hely) <= 2 and not self._tolt:
            self._tolt = True

            async def tolt() -> None:
                try:
                    await self._sonos_hozzaad()
                finally:
                    self._tolt = False

            self.hass.async_create_background_task(tolt(), f"cantabile party {self.e}")

    def leall(self) -> None:
        self.aktiv = False
        for le in self._le:
            le()
        self._le.clear()
        if self.mod != "sonos" and self.kp.rt.sorrend(self.e) is self:
            self.kp.rt.stop_tracks(self.e)

    def el(self) -> bool:
        if not self.aktiv:
            return False
        if self.mod != "sonos":
            return self.kp.rt.sorrend(self.e) is self
        return True

    # ---- állapot ----
    def szol(self) -> dict[str, Any] | None:
        s = self.hass.states.get(self.e)
        if self.mod != "sonos":
            rel = self._rel(self.most or "") if self.most else None
        else:
            rel = self._rel(str(s.attributes.get("media_content_id") or "")) if s else None
        if not rel:
            return None
        sz = _szam(rel)
        if s and s.attributes.get("media_title"):
            sz["cim"] = s.attributes["media_title"]
            sz["eloado"] = s.attributes.get("media_artist") or sz["eloado"]
        return {**sz, "ki": self.kerte.get(rel), "allapot": s.state if s else None}

    def allapot(self) -> dict[str, Any]:
        return {"entity_id": self.e, "tagok": self.tagok, "cim": self.cim, "db": len(self.pool), "indult": self.indult, "vendeg": self.vendeg,
                "gazda": self.gazda.get("nev"), "most": self.szol(),
                "kivansag": [{**_szam(k["f"]), "ki": k.get("ki")} for k in self.kivansag]}

    # ---- vendégek ----
    def keres(self, q: str) -> list[dict[str, str]]:
        szavak = norm(q).split()
        if not szavak:
            return []
        ki = []
        for a, fajlok in self.osszes.items():
            if self.hires and (a == self.hires or a.startswith(f"{self.hires}/")):
                continue
            na = norm(a)
            for f in fajlok:
                if all(w in na or w in norm(f.rpartition("/")[2]) for w in szavak):
                    ki.append(_szam(f))
                    if len(ki) >= 40:
                        return ki
        return ki

    def kivan(self, rel: str, ki: str, vendeg_id: str) -> int:
        album = rel.rpartition("/")[0]
        if rel not in self.osszes.get(album, []):
            raise ValueError("unknown")
        if not self.vendeg:
            raise ValueError("closed")
        if len(self.kivansag) >= KIVANSAG_OSSZES or sum(1 for k in self.kivansag if k["v"] == vendeg_id) >= KIVANSAG_MAX:
            raise ValueError("limit")
        if any(k["f"] == rel for k in self.kivansag):
            raise ValueError("queued")
        self.kivansag.append({"f": rel, "ki": ki[:24].strip() or None, "v": vendeg_id})
        return len(self.kivansag)


class Partik:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.partik: dict[str, Party] = {}

    @property
    def rt(self) -> Any:
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            raise HomeAssistantError("not_configured")
        return entries[0].runtime_data

    @property
    def zene(self) -> Any:
        z = self.hass.data[DOMAIN].get("zene")
        if z is None:
            raise HomeAssistantError("not_configured")
        return z

    def elo(self) -> dict[str, Party]:
        for e in [e for e, p in self.partik.items() if not p.el()]:
            self.vege(e)
        return self.partik

    def tokennel(self, token: str) -> Party | None:
        for p in self.elo().values():
            if secrets.compare_digest(p.token, token):
                return p
        return None

    def vege(self, e: str) -> None:
        if p := self.partik.pop(e, None):
            p.leall()

    def stop(self) -> None:
        for e in list(self.partik):
            self.vege(e)


def _vendeg_url(hass: HomeAssistant, p: Party) -> str | None:
    from homeassistant.helpers.network import NoURLAvailableError, get_url
    try:
        alap = get_url(hass, allow_external=False, allow_cloud=False, prefer_external=False).strip().rstrip("/")
    except NoURLAvailableError:
        return None
    return f"{alap}{URL}/{p.token}"


def _qr(szoveg: str) -> str | None:
    try:
        import segno
    except ImportError:
        return None
    return segno.make(szoveg, error="m").svg_inline(scale=5, border=2, dark="#15161a", light="#f3ead8")


def regisztral(hass: HomeAssistant) -> None:
    kp = hass.data[DOMAIN]["party"] = Partik(hass)
    hass.http.register_view(VendegOldal())
    hass.http.register_view(VendegAllapot())
    hass.http.register_view(VendegKeres())
    hass.http.register_view(VendegKer())

    def _foglal(conn: websocket_api.ActiveConnection, ids: list[str]) -> None:
        fk = foglalas.kozpont(hass)
        if m := fk.masik(ids, conn.user.id):
            raise HomeAssistantError(f"busy:{m[1]['nev']}")

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/party/start",
        vol.Required("entity_id"): str,
        vol.Optional("tagok"): [str],
        vol.Required("mod"): vol.In(("sonos", "url")),
        vol.Required("mappa"): vol.All(str, vol.Match(r"^media-source://media_source/")),
        vol.Optional("albumok"): vol.All([str], vol.Length(max=5000)),
        vol.Optional("cim", default="PARTY"): vol.All(str, vol.Length(max=80)),
        vol.Optional("hires"): vol.Any(None, str),
        vol.Optional("device", default="gep"): vol.In(foglalas.ESZKOZOK),
    })
    @websocket_api.async_response
    async def ws_start(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        e = msg["entity_id"]
        tagok = [e] + [t for t in msg.get("tagok") or [] if t != e]
        try:
            _foglal(conn, tagok)
            nas = msg["mappa"].rstrip("/")
            l = await hass.async_add_executor_job(nas_lista, hass, nas)
            p = Party(kp, tagok, msg["mod"], nas, l["albumok"], msg.get("albumok"), msg["cim"], msg.get("hires"),
                      {"id": conn.user.id, "nev": conn.user.name or "?"})
            if not p.pool:
                raise HomeAssistantError("empty")
            for t in tagok:
                kp.vege(t)
            kp.partik[e] = p
            await p.indit()
            foglalas.kozpont(hass).foglal(tagok, conn.user.id, conn.user.name or "?", msg["device"])
        except (HomeAssistantError, HibaUzenet) as err:
            kp.vege(e)
            conn.send_error(msg["id"], "party_failed", str(err))
            return
        except Exception as err:  # noqa: BLE001
            kp.vege(e)
            _LOGGER.exception("Cantabile PARTY: nem indult (%s)", e)
            conn.send_error(msg["id"], "party_failed", str(err))
            return
        conn.send_result(msg["id"], p.allapot())

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/party/stop", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_stop(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        p = kp.elo().get(msg["entity_id"])
        if p:
            _foglal(conn, [p.e])
            kp.vege(p.e)
        conn.send_result(msg["id"], {"stopped": bool(p)})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/party/state", vol.Optional("qr", default=False): bool})
    @callback
    def ws_state(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        ki = []
        for p in kp.elo().values():
            a = p.allapot()
            if msg["qr"]:
                a["url"] = _vendeg_url(hass, p)
                a["qr"] = _qr(a["url"]) if a["url"] else None
            ki.append(a)
        conn.send_result(msg["id"], {"parties": ki})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/party/skip", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_skip(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        p = kp.elo().get(msg["entity_id"])
        if not p:
            conn.send_error(msg["id"], "no_party", "no_party")
            return
        _foglal(conn, [p.e])
        if p.mod == "sonos":
            await hass.services.async_call("media_player", "media_next_track", {"entity_id": p.e}, blocking=True)
        else:
            kp.rt.ugrik(p.e, 1)
        conn.send_result(msg["id"], {})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/party/guests", vol.Required("entity_id"): str, vol.Required("on"): bool})
    @callback
    def ws_guests(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        p = kp.elo().get(msg["entity_id"])
        if p:
            p.vendeg = msg["on"]
            if not p.vendeg:
                p.token = secrets.token_urlsafe(18)       # a régi link (és QR) érvénytelen lesz
        conn.send_result(msg["id"], {"guests": bool(p and p.vendeg)})

    for cmd in (ws_start, ws_stop, ws_state, ws_skip, ws_guests):
        websocket_api.async_register_command(hass, cmd)


# ---- vendégoldal (Home Assistant-fiók nélkül, a titkos link védi) ----

def _party(req: web.Request, token: str) -> Party:
    p = kozpont(req.app["hass"]).tokennel(token)
    if p is None or not p.vendeg:
        raise web.HTTPNotFound()
    return p


def _vendeg_id(req: web.Request) -> str:
    return req.cookies.get("cantabile_vendeg") or req.remote or "?"


class VendegOldal(HomeAssistantView):
    url = URL + "/{token}"
    name = "api:cantabile:party"
    requires_auth = False

    async def get(self, req: web.Request, token: str) -> web.Response:
        _party(req, token)
        oldal = VENDEG_HTML if str(req.app["hass"].config.language or "").startswith("hu") else _angol(VENDEG_HTML)
        r = web.Response(text=oldal, content_type="text/html", headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
        if not req.cookies.get("cantabile_vendeg"):
            r.set_cookie("cantabile_vendeg", secrets.token_urlsafe(9), max_age=86400, httponly=True, samesite="Strict")
        return r


class VendegAllapot(HomeAssistantView):
    url = URL + "/{token}/state"
    name = "api:cantabile:party:state"
    requires_auth = False

    async def get(self, req: web.Request, token: str) -> web.Response:
        p = _party(req, token)
        a = p.allapot()
        v = _vendeg_id(req)
        return self.json({"cim": a["cim"], "most": a["most"], "kivansag": a["kivansag"],
                          "sajat": sum(1 for k in p.kivansag if k["v"] == v), "max": KIVANSAG_MAX})


class VendegKeres(HomeAssistantView):
    url = URL + "/{token}/search"
    name = "api:cantabile:party:search"
    requires_auth = False

    async def get(self, req: web.Request, token: str) -> web.Response:
        p = _party(req, token)
        q = req.query.get("q", "")[:60]
        return self.json({"talalat": await req.app["hass"].async_add_executor_job(p.keres, q) if len(q.strip()) >= 2 else []})


class VendegKer(HomeAssistantView):
    url = URL + "/{token}/request"
    name = "api:cantabile:party:request"
    requires_auth = False

    async def post(self, req: web.Request, token: str) -> web.Response:
        p = _party(req, token)
        try:
            adat = await req.json()
            hely = p.kivan(str(adat.get("f") or "")[:600], str(adat.get("ki") or ""), _vendeg_id(req))
        except ValueError as err:
            return self.json({"hiba": str(err)}, status_code=400)
        except Exception:  # noqa: BLE001
            return self.json({"hiba": "bad"}, status_code=400)
        return self.json({"hely": hely})


_EN = {
    'lang="hu"': 'lang="en"', "MOST SZÓL": "NOW PLAYING", "KÍVÁNSÁG": "REQUEST A SONG", "A neved (nem kötelező)": "Your name (optional)",
    "Előadó vagy szám…": "Artist or song…", "SORON KÖVETKEZŐ KÍVÁNSÁGOK": "UP NEXT", "A party véget ért.": "The party is over.",
    "Mindjárt indul…": "Starting…", " kérte<": " asked for it<", "Még nincs kívánság – légy te az első!": "No requests yet – be the first!",
    "Keresés…": "Searching…", "Nincs ilyen a zenetárban.": "Not in the library.", ">Kérem<": ">Request<",
    "A keresés most nem megy.": "Search isn't working right now.", "Felírva: ": "Added: ", " – a sorban ": " – number ",
    "Egyszerre legfeljebb ${max} kívánságod lehet – várd meg, amíg sorra kerülnek.": "You can have ${max} requests at a time – wait until they play.",
    "Ez már a kívánságok között van.": "That one is already requested.", "A kívánságok most szünetelnek.": "Requests are paused right now.",
    "Nem sikerült.": "That didn't work.",
}


def _angol(oldal: str) -> str:
    for hu, en in _EN.items():
        oldal = oldal.replace(hu, en)
    return oldal


VENDEG_HTML = """<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>Cantabile PARTY</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f3ead8;
 background:radial-gradient(circle at 20% 0%,#3a2a14 0,transparent 45%),radial-gradient(circle at 100% 30%,#2a1838 0,transparent 40%),#0d0e10}
.ab{max-width:560px;margin:0 auto;padding:16px 16px 40px}
.fej{display:flex;align-items:center;gap:8px;font:600 11px/1 system-ui;letter-spacing:.32em;color:rgba(255,190,90,.85);margin:6px 0 14px}
.fej i{width:7px;height:7px;border-radius:50%;background:#ffb020;box-shadow:0 0 8px #ffb020;animation:p 1.6s ease-in-out infinite}
@keyframes p{50%{opacity:.35}}
.uveg{border:1px solid rgba(255,176,32,.38);border-radius:10px;padding:14px 16px;background:linear-gradient(180deg,rgba(30,32,36,.94),rgba(10,11,13,.96));
 box-shadow:0 14px 34px rgba(0,0,0,.55),0 0 22px rgba(255,160,40,.14),inset 0 1px 0 rgba(255,255,255,.09);margin-bottom:14px}
small.c{display:block;font:600 10px/1 system-ui;letter-spacing:.26em;color:rgba(255,190,90,.75);margin-bottom:8px}
.most b{display:block;font-size:20px;line-height:1.2}
.most span{color:#c9bfa9}
.ki{display:inline-block;margin-top:6px;padding:2px 8px;border-radius:9px;border:1px solid rgba(180,140,255,.6);color:#d4c0ff;font-size:12px}
input{width:100%;padding:11px 14px;border-radius:22px;border:1px solid rgba(255,176,32,.45);background:rgba(0,0,0,.35);color:#f3ead8;font-size:16px;outline:none}
input:focus{border-color:#ffb020;box-shadow:0 0 0 3px rgba(255,176,32,.18)}
#nev{margin-bottom:8px}
.l{display:grid;gap:6px;margin-top:10px}
.s{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
.s div{flex:1;min-width:0}.s b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s span{display:block;font-size:12.5px;color:#a99f8b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button{border:1px solid rgba(255,176,32,.6);background:rgba(255,176,32,.12);color:#ffcf7a;border-radius:6px;padding:8px 12px;font:600 13px system-ui;letter-spacing:.04em}
button:disabled{opacity:.45}
.u{color:#c9bfa9;font-size:13.5px;margin:8px 2px}
.ok{color:#9be29b}.hi{color:#ff9b8a}
</style></head><body><div class="ab">
<div class="fej"><i></i>CANTABILE · PARTY</div>
<div class="uveg most"><small class="c">MOST SZÓL</small><div id="most"><span>…</span></div></div>
<div class="uveg"><small class="c">KÍVÁNSÁG</small>
 <input id="nev" placeholder="A neved (nem kötelező)" maxlength="24" autocomplete="nickname">
 <input id="q" type="search" placeholder="Előadó vagy szám…" autocomplete="off" enterkeyhint="search">
 <div class="u" id="uz"></div><div class="l" id="tal"></div></div>
<div class="uveg"><small class="c">SORON KÖVETKEZŐ KÍVÁNSÁGOK</small><div class="l" id="sor"></div></div>
</div>
<script>
const alap=location.pathname.replace(/\\/$/,""),$=(i)=>document.getElementById(i);
const E=(t)=>String(t??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let tal=[],ido=null,sajat=0,max=3;
try{$("nev").value=localStorage.getItem("cantabile-nev")||""}catch(e){}
$("nev").addEventListener("change",()=>{try{localStorage.setItem("cantabile-nev",$("nev").value)}catch(e){}});
async function allapot(){
 try{const r=await fetch(alap+"/state",{cache:"no-store"});if(!r.ok){$("most").innerHTML="<span>A party véget ért.</span>";return}
 const a=await r.json();sajat=a.sajat;max=a.max;
 $("most").innerHTML=a.most?`<b>${E(a.most.cim)}</b><span>${E([a.most.eloado,a.most.album].filter(Boolean).join(" · "))}</span>${a.most.ki?`<div class="ki">♥ ${E(a.most.ki)} kérte</div>`:""}`:"<span>Mindjárt indul…</span>";
 $("sor").innerHTML=a.kivansag.length?a.kivansag.map((k,i)=>`<div class="s"><div><b>${i+1}. ${E(k.cim)}</b><span>${E(k.eloado)}${k.ki?" · "+E(k.ki):""}</span></div></div>`).join(""):'<div class="u">Még nincs kívánság – légy te az első!</div>';
 }catch(e){}
}
async function keres(){
 const q=$("q").value.trim();if(q.length<2){$("tal").innerHTML="";$("uz").textContent="";return}
 $("uz").textContent="Keresés…";
 try{const r=await fetch(alap+"/search?q="+encodeURIComponent(q),{cache:"no-store"});tal=(await r.json()).talalat||[];
 $("uz").textContent=tal.length?"":"Nincs ilyen a zenetárban.";
 $("tal").innerHTML=tal.map((t,i)=>`<div class="s"><div><b>${E(t.cim)}</b><span>${E([t.eloado,t.album].filter(Boolean).join(" · "))}</span></div><button data-i="${i}">Kérem</button></div>`).join("");
 }catch(e){$("uz").textContent="A keresés most nem megy."}
}
$("q").addEventListener("input",()=>{clearTimeout(ido);ido=setTimeout(keres,350)});
$("tal").addEventListener("click",async(ev)=>{
 const b=ev.target.closest("button");if(!b)return;const t=tal[Number(b.dataset.i)];b.disabled=true;
 try{const r=await fetch(alap+"/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({f:t.f,ki:$("nev").value})});
 const v=await r.json();
 if(r.ok){b.textContent="✓ "+v.hely+".";$("uz").innerHTML=`<span class="ok">Felírva: ${E(t.cim)} – a sorban ${v.hely}.</span>`;allapot()}
 else{b.disabled=false;$("uz").innerHTML=`<span class="hi">${{limit:`Egyszerre legfeljebb ${max} kívánságod lehet – várd meg, amíg sorra kerülnek.`,queued:"Ez már a kívánságok között van.",closed:"A kívánságok most szünetelnek."}[v.hiba]||"Nem sikerült."}</span>`}
 }catch(e){b.disabled=false}
});
allapot();setInterval(allapot,5000);
</script></body></html>
"""
