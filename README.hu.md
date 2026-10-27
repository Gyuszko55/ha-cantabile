# Cantabile

**70-es évekbeli ezüst rádió és tape deck a Home Assistant vezérlőpultjára.** Adógombok egy FM-skálán, internetes
rádió, tape deck forgó orsókkal és valódi VU-mérőkkel, a saját zenemappád, Deezer és hangvezérlés.

*English: [README.md](README.md)*

## Mit tud

**Rádió**
- FM-skála mozgó mutatóval, adógombok, hangerő-forgatógomb, hangoló lendkerék.
- **NET**: több ezer internetes adó a [Radio Browser](https://www.radio-browser.info) adatbázisából (hazai, világ,
  műfaj, név szerint). Bármelyik adó gombra tehető.
- SIGNAL-műszer, ami a valódi stream bitrátáját követi.

**Tape deck**
- Kazetta-ablak forgó orsókkal, két mutatós VU-műszer *vagy* fluoreszcens (VFD) kijelző.
- A VU-mérő a **valódi hangszintet** mutatja: az integráció a szerveren ugyanazt a streamet vagy fájlt elemzi.
- REW / PLAY / FF / STOP / PAUSE / EJECT, SHUFFLE, REPEAT (1–5 kör vagy végtelen), FADE (Sonos-áttűnés), SLEEP.
- Kazetta-polc (EJECT):
  - **STREAMING** – a Sonos-kedvencek (listák, albumok);
  - **DEEZER** – a teljes Deezer-kínálat: toplista, keresés, előadó-oldalak (csak Sonoson);
  - **NAS** – a zenemappa (előadó → album), azonnali kereséssel;
  - **TELEFON** – a telefon / gép zenéje: BT-n közvetlenül, más hangszórón átmeneti feltöltéssel (TEMP jelzés, 24 óra múlva törlődik), vagy véglegesen a zenemappába;
  - **SOR** – a lejátszási sor: ugrás, törlés, következőnek, sor végére (Sonos).
- **Sor átrendezése**: a számot a fogantyújánál (⋮⋮) húzd – Sonos, WiiM és BT.
- **Hézagmentes lejátszás**: Sonoson (saját sor) és WiiM-en (a következő számot DLNA-n előre megkapja); BT-n közel hézagmentes.
- **Bemondás**: amíg az Assist (pl. Voice PE) vagy egy TTS-üzenet beszél, a zene lehalkul (Cantabile beállításai).
- **HA-újraindítás után** a Sonoson szóló zenemappás sor a szóló szám után magától folytatódik.
- **DALSZÖVEG**: koppints a kazettán a dal címére (vagy a rádió műsorinfójára, ha dalt mutat) – a szöveg az
  [LRCLIB](https://lrclib.net)-ről jön; a magnón az épp szóló sor kiemelve, a zenével együtt halad.

**Hangszórók**
- Sonos (minden funkció, „Mindkettő” csoporttal együtt), és bármely más lejátszó, ami URL-t tud lejátszani
  (pl. WiiM – az albumot az integráció számonként játssza le).
- **BT**: azon a készüléken szól, amelyiken a kártya nyitva van (fülhallgató, Bluetooth hangszóró).
- Hangszóróváltáskor a zene átkerül, mint egy igazi hangszóró-választón.

**Hangvezérlés**
- Assist-eszköz bármelyik LLM-es beszélgetőügynökhöz (Google Gemini, OpenAI, Anthropic, Ollama…):
  *„Játssz Queent a nappaliban”*, *„Tedd be a Kind of Magic albumot”*, *„Kapcsold be a Jazz FM-et a hálóban”*,
  *„Játszd a Deezerről Adele-t”*. Ami a zenemappában nincs meg, azt a Deezeren keresi.

Az előlapok feliratai mindig angolok, mint egy igazi 70-es évekbeli hifin; a beállítások, az üzenetek és a súgók a Home Assistant nyelvét követik: **magyar** vagy **angol**.

## Feltételek

- Home Assistant **2026.10** vagy újabb.
- Legalább egy médialejátszó. **Sonosszal** a teljes élmény (sor, Deezer, kedvencek, áttűnés, csoport);
  más lejátszón (WiiM, Chromecast…) a rádió és a zenemappa szól.
- Elhagyható: zenemappa a Home Assistant média-forrásai között (pl. a `/media` alá csatolt NAS-megosztás).
- A Deezer lejátszásához a Sonos appban be kell kötni a Deezert. A Deezer-kereséshez nem kell fiók.

## Telepítés

### HACS (egyéni tároló)
1. HACS → ⋮ → **Egyéni tárolók** → `https://github.com/Gyuszko55/ha-cantabile`, kategória: **Integráció**.
2. Telepítsd a **Cantabile**-t, majd indítsd újra a Home Assistantot.

### Kézzel
Másold a `custom_components/cantabile` mappát a `config/custom_components` mappába, és indítsd újra a Home Assistantot.

## Beállítás

1. **Beállítások → Eszközök és szolgáltatások → Integráció hozzáadása → Cantabile.** Ha hangvezérlést is szeretnél,
   hagyd bekapcsolva az „Assist-eszközt”.
2. Kártya a vezérlőpultra: **Vezérlőpult szerkesztése → Kártya hozzáadása → Cantabile.** A kártyát az integráció
   maga szolgálja ki és regisztrálja, külön erőforrás nem kell.
3. A kártya **⚙** gombjával állítsd be a hangszórókat, az adókat és a zenemappát. A *Mentés* minden vezérlőpult minden
   Cantabile kártyájába beírja, így a tablet és a telefon egyforma marad.

### Hangvezérlés
Az integráció beállítása után nyisd meg a beszélgetőügynök beállításait (pl. **Google Gemini → Beállítás**), és a
*Home Assistant vezérlése* résznél az *Assist* mellett kapcsold be a **Cantabile**-t is.

## A kártya beállításai (YAML)

```yaml
type: custom:cantabile-card
brand: Cantabile                 # elhagyható
bt: true                         # BT-kimenet ezen a készüléken; false = nincs
speakers:
  - name: Nappali
    entity: media_player.nappali
    mode: sonos                  # sonos | url (sor nélküli lejátszó, pl. WiiM)
  - name: WiiM
    entity: media_player.wiim_mini
    mode: url
stations:                        # elhagyható – a NET-tel többet is találsz
  - name: Petőfi Rádió
    short: Petőfi                # a gomb felirata
    frequency: 94.8              # helye a skálán (87,5–108)
    url: https://icast.connectmedia.hu/4738/mr2.mp3
tape:
  media_folder: media-source://media_source/local/Zene   # előadó/album/szám
  hires_folder: Hi-Res 48kHz     # elhagyható: 48 kHz-es másolatok a Sonosnak (<mappa>/<előadó>/<album [48kHz]>)
  upload_folder: Cantabile       # a TELEFON fül feltöltései ide kerülnek (a zenemappán belül)
  display: vu                    # vu (mutatós műszer) | vfd (fluoreszcens kijelző)
  vu_delay: 0                    # mp; a valódi VU-jelet a hangszóró pufferéhez igazítja
deezer: true                     # false = nincs DEEZER fül
multiroom: true                  # két vagy több Sonosnál „Mindkettő” állás
```

A korábbi magyar kulcsok (`hangszorok`, `adok`, `magno`, `nas` …) is működnek; a ⚙ Mentés abban a formában ír vissza, amiben a beállítás volt.

## Entitások és szolgáltatások

| Entitás | Mire való |
|---|---|
| `number.cantabile_ismetlesszam` | REPEAT: 1–5 kör, 6 = végtelen |
| `sensor.cantabile_alvasidozito` | A futó alvásidőzítők (`timers` attribútum: lejátszó → leállás ideje) |
| `sensor.cantabile_hanggal_inditott_ado` | A hanggal indított internetes adó, hogy a kártya felismerje |

| Szolgáltatás | Mire való |
|---|---|
| `cantabile.play` | Lejátszás név alapján (előadó, album, szám, adó, lista); visszaadja, mi szól és hol |
| `cantabile.play_tracks` / `cantabile.stop_tracks` | Számonkénti lejátszás sor nélküli lejátszón |
| `cantabile.sleep_timer` | Lejátszó leállítása N perc múlva (az utolsó 30 mp-ben lehalkít; Sonoson a saját időzítője) |

## Tudnivalók

- A **valódi VU-jelhez** `ffmpeg` kell a Home Assistant gépén (a Home Assistant OS tartalmazza). A titkosított
  streameket (pl. Deezer) nem lehet elemezni – ilyenkor a mutatók élethű utánzatra váltanak.
- A Sonos legfeljebb 48 kHz-et dekódol: ha a `hires` mappa be van állítva, a hi-res album 48 kHz-es másolata szól
  a Sonoson, a többi lejátszón az eredeti.
- A `..`-ot tartalmazó fájlneveket a Home Assistant média-forrása nem játssza le; a Cantabile kihagyja őket.
- **Hangszórók**: bármely `media_player`, ami tud médiát lejátszani (Sonos, WiiM, Cast, DLNA, Music Assistant, Squeezebox…). A `mode` elhagyható – a Sonost magától felismeri; a lejátszás-indítás nélküli lejátszók nem választhatók. A `short` rövid név a forgókapcsolóra.
- **Adók**: a `frequency` elhagyható; a csak internetes adók a skálán elosztva, WEB felirattal.
- **Deezer**: a Sonos appban bekötött Deezer-fiók kell; ha nincs, rejtsd el a fület (`deezer: false` vagy ⚙).
- **Mentés a ⚙-ben**: rendszergazda és felületen szerkesztett vezérlőpult kell; YAML-vezérlőpultnál a YAML-t szerkeszd (YAML-módú erőforrásoknál a `/cantabile_static/cantabile-card.js` modult is vedd fel). A zenemappába töltés / ürítés is rendszergazdai; az átmeneti feltöltés mindenkinek megy.
- **Biztonság**: a BT-továbbító (`/api/cantabile/stream`) és az átmeneti feltöltés (`/api/cantabile/upload`) bejelentkezett felhasználót kér; a továbbító csak hangot ad tovább, a feltöltési mappa legfeljebb 2 GB, 24 óra után ürül.
- A Radio Browser, a Deezer és az LRCLIB nyilvános adatbázis; a Cantabile csak a keresett szöveget küldi nekik
  (dalszövegnél: előadó, cím, album, hossz). A dalszövegeket csak a memóriában tárolja.

## Licenc

MIT – lásd [LICENSE](LICENSE). A mellékelt *Great Vibes* betűkészlet SIL Open Font License 1.1 alatt áll.
