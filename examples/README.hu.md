# A Cantabile automatizálásból – példák

*English: [README.md](README.md)*

A Cantabile minden zenei művelete Home Assistant-műveletként is elérhető. Ugyanazt csinálja, mint a kártya vagy a
hangvezérlés: név alapján keres, és az útmátrix szerint a legjobb úton indít (a hangszóró saját szolgáltatása,
Music Assistant vagy zenemappa). Az itteni fájlok bemásolhatók; a hangszóró- és entitásneveket a saját rendszeredre
cseréld.

| Fájl | Mi van benne |
|---|---|
| [automations.yaml](automations.yaml) | Reggeli rádió, fokozatosan hangosodó ébresztő, esti album időzített kikapcsolással, zene hazaérkezéskor, hibakezelés telefonos értesítéssel, rádió be/ki gombnyomásra |
| [script_play_music.yaml](script_play_music.yaml) | Újrahasználható szkript mezőkkel (mit, hol, hangerő, időzítő), amely visszaadja, mi szól |
| [blueprint_example.yaml](blueprint_example.yaml) | A *Cantabile: zene időpontra* blueprintből készült automatizálás |
| [webhook_mqtt.yaml](webhook_mqtt.yaml) | Zene webhookról (telefonos gyorsparancs, NFC-matrica) vagy MQTT-üzenetre; Node-RED és websocket |
| [rest_example.sh](rest_example.sh), [rest_example.py](rest_example.py) | Hívás kívülről a REST API-n át, válasszal |

## A műveletek

| Művelet | Mire jó | Mezők |
|---|---|---|
| `cantabile.play` | Előadó, album, szám, rádióadó vagy lista indítása név alapján. Ez a leggyakoribb. | `query` (kötelező), `kind`, `artist`, `speaker`, `shuffle`, `source` |
| `cantabile.sleep_timer` | Időzített kikapcsolás: a végén elhalkul és leáll. A 0 kikapcsolja az időzítőt. | `entity_id`, `minutes` (0–720) |
| `cantabile.play_tracks` | Megadott zenemappás fájlok egymás után | `entity_id`, `tracks`, `start`, `position` |
| `cantabile.stop_tracks` | A Cantabile sorozatlejátszójának leállítása nem Sonos hangszórón (különben a stop után a következő szám indulna) | `entity_id` |
| `cantabile.add_tracks` | Számok a sor végére | `entity_id`, `tracks` |
| `cantabile.set_order` | A szóló sorozat sorrendje | `entity_id`, `tracks` |
| `cantabile.move_queue_item` | Egy szám áthelyezése a Sonos sorában | `entity_id`, `from`, `to` |

A `cantabile.play` mezői:

- **query** – mit keressen: előadó, album, szám, adó vagy lista neve.
- **kind** – `auto` (alap) · `artist` · `album` · `track` · `radio` · `playlist`. Akkor add meg, ha egy név előadó és
  album is (pl. „Queen”).
- **artist** – album vagy szám keresésénél pontosít.
- **speaker** – a kártya beállításában megadott név, vagy (2.7.1-től) a választón látható rövid név. Üresen: ahol épp
  szól valami, különben az első hangszóró.
- **shuffle** – keverve: `true` / `false`.
- **source** – `auto` (előbb a zenemappa és az adók, aztán a streaming) · `local` (csak a zenemappa: gyors, internet
  nélkül is megy) · `deezer` · `spotify` · `tidal`.

A hangerő, a szünet és a leállítás a szokásos `media_player.*` műveletekkel megy a hangszóró entitásán. A hangerőt a
zene indítása *előtt* állítsd be, így nem szól fel hangosan.

## A válasz

A `cantabile.play` megmondja, mi szól és hol. Hibánál nem állítja le az automatizálást: `success: false`-t és egy
olvasható `error` szöveget ad, így ágaztatni lehet rajta (automations.yaml, 5. példa). A válaszhoz
`response_variable` kell. A többi Cantabile-művelet nem ad választ.

```yaml
success: true
kind: album            # artist | album | track | radio | playlist
playing: A Kind of Magic
speaker: Bedroom
source: music folder   # music folder | Deezer | Spotify | Radio Browser | preset | Sonos favorites
shuffle: false
tracks: 9              # zenemappánál a számok száma
```

## Blueprint: zene időpontra

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2FGyuszko55%2Fha-cantabile%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fcantabile%2Fzene_idopontra.yaml)

A *Cantabile: zene időpontra* ([fájl](../blueprints/automation/cantabile/zene_idopontra.yaml)) adott időpontban,
választott napokon zenét vagy rádiót indít: kitöltöd az űrlapot, és annyi automatizálást készítesz belőle, amennyit
szeretnél (reggeli rádió, hétvégi ébresztő, esti album…), YAML nélkül. Importáld a fenti gombbal, vagy másold a
fájlt a `config/blueprints/automation/cantabile/` mappába.

Beállítható: időpont, napok, csak ha valaki otthon van · mit szóljon, fajta, előadó, forrás, keverve · hangszóró neve
és entitása, hangerő (a zene előtt áll be), fokozatos hangosodás (3 %-ról 10 lépésben, 1–30 perc alatt) · időzített
kikapcsolás · értesítő szolgáltatás, amely megírja, miért nem indult a zene. Hibánál a hangerő visszaáll.

## Hangvezérlés (Assist)

A Cantabile saját eszközt ad az Assist-ügynöknek (`cantabile_play`), ezért természetes mondatokkal is megy: „Játssz
Queent a konyhában”, „Tedd be a Jazz FM-et”. Ehhez az ügynök beállításaiban a Cantabile API-t be kell kapcsolni.
Automatizálásból a `conversation.process` művelettel hívható (az ügynököd azonosítója + a mondat a `text`-ben).

## Tippek

- Ha nem talál ilyen nevű hangszórót, a válasz `error` mezője felsorolja a választható neveket – ezt az
  automatizálás nyomkövetésében is látod.
- Mi szól éppen: `{{ state_attr('media_player.living_room', 'media_title') }}`.
- A Cantabile naplója rögzíti a döntéseit (utolsó 300 bejegyzés); a figyelmeztetések a HA naplójában is
  `custom_components.cantabile` alatt. Hibabejelentésnél add meg a kártya jobb alsó sarkában látható verziót.
