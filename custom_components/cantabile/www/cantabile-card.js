// Cantabile – régi hi-fi rádió és kazettás magnó kártya a Home Assistanthoz (custom:cantabile-card).
// https://github.com/Gyuszko55/ha-cantabile · a kártyát a `cantabile` integráció szolgálja ki és regisztrálja.
//
// Rádió: fent a fekete üvegskála (FM 87,5–108 MHz), a piros mutató az épp szóló adó frekvenciájára csúszik.
// Alatta a programozott nyomógombok (adók frekvencia szerint), jobbra a hangerő-forgatógomb (húzással vagy görgővel),
// a bekapcsoló gomb (szól → leállít, áll → az utolsó adót indítja), a NET gomb a Radio Browser adóihoz.
// Indítás stream-címmel (media_player.play_media); Sonos-on x-rincon-mp3radio:// előtaggal, így a Sonos rádióként kezeli.
//
// Magnó: kazetta-ablak forgó orsókkal, két VU-mérő (vagy fluoreszcens kijelző), REW/PLAY/FF/STOP/PAUSE/EJECT,
// SHUFFLE / REPEAT (1–5 kör, ∞) / FADE / SLEEP. A VU-mérő a valódi zenei jelet mutatja: az integráció ugyanazt a
// forrást elemzi a szerveren (rádió-stream, helyi fájl), és websocketen küldi a bal/jobb szintet (`cantabile/signal`).
// Ahol ez nem megy (titkosított streaming), élethű utánzat. Kazetta-polc (EJECT): STREAMING (Sonos-kedvencek),
// DEEZER (a teljes katalógus), NAS (a zenemappa, kereséssel), TELEFON (zene a telefonról), SOR (a lejátszási sor).
// Sorral rendelkező lejátszón (Sonos) az album a lejátszó sorába kerül; sor nélküli lejátszón (pl. WiiM) az integráció
// sorozatlejátszója (`cantabile.play_tracks`) játssza egymás után a számokat. BT: a zene azon a készüléken szól,
// amelyiken a kártya nyitva van. A ⚙ Mentés minden UI-s vezérlőpult összes Cantabile kártyájába beírja a beállításokat.
// Keskeny helyen (< 600 px) álló elrendezésre vált. A felirat magyar vagy angol, a Home Assistant nyelve szerint.
//
// type: custom:cantabile-card
// brand: Cantabile                               # (marka) elhagyható
// bt: true                                       # BT kimenet: ezen a készüléken szól; false = nincs
// speakers:                                      # (hangszorok)
//   - { name: Living room, entity: media_player.living_room, mode: sonos }   # mode: sonos | url (sor nélküli, pl. WiiM)
//   - { name: WiiM, entity: media_player.wiim_mini, mode: url }
// stations:                                      # (adok) elhagyható – a NET gombbal is kereshetsz
//   - { name: Radio Paradise, short: Paradise, frequency: 94.8, url: http://stream.radioparadise.com/mp3-192 }
// tape:                                          # (magno)
//   media_folder: media-source://media_source/local/Music   # (nas) a zenemappa: előadó/album/szám
//   hires_folder: Hi-Res 48kHz                   # (hires) elhagyható: a Sonosnak 48 kHz-es másolatok mappája
//   upload_folder: Cantabile                     # (feltoltes) a TELEFON fül feltöltéseinek mappája
//   display: vu                                  # (vu_kijelzo) vu = két mutatós VU-műszer (deprez) | vfd = fluoreszcens (fluor)
//   vu_delay: 0                                  # (vu_kesleltetes_mp) a valódi jel ennyivel később (a hangszóró pufferel)
// deezer: true                                   # false = nincs DEEZER fül
// multiroom: true                                # két Sonos esetén „Mindkettő” állás a hangszóró-választón

// angol feliratok (kulcs: a magyar forrásszöveg)
const EN = {
  "Véletlenszerű lejátszás": "Shuffle",
  "Ismétlés: 1 · 2 · 3 · 4 · 5 kör · végtelen": "Repeat: 1 · 2 · 3 · 4 · 5 rounds · endless",
  "Áttűnés a számok között (csak Sonos)": "Crossfade between tracks (Sonos only)",
  "Időzített kikapcsolás: 15 · 30 · 45 · 60 · 90 perc · ki": "Sleep timer: 15 · 30 · 45 · 60 · 90 min · off",
  "Hangszóró váltása": "Change speaker",
  "be": "on",
  "ki": "off",
  "BT be / ki": "BT on / off",
  "Rádió / tape": "Radio / tape",
  "RÁDIÓ": "RADIO",
  "TAPE": "TAPE",
  "Beállítások": "Settings",
  "Hangolás: húzd oldalra vagy görgess": "Tuning: drag sideways or scroll",
  "Még nincs adó a gombokon – a NET gombbal keress, és a „+ gombra” teszi ide.": "No preset stations yet – find one with NET and “+ preset” puts it here.",
  "Internetes rádióadók (Radio Browser)": "Internet radio stations (Radio Browser)",
  "Adj meg legalább egy hangszórót (speakers).": "Add at least one speaker (speakers).",
  "Mindkettő": "Both",
  "Mind": "All",
  "A BT kimeneten ez nem játszható le (otthoni hálózaton próbáld, vagy válassz másik adót).": "This can't be played on the BT output (try on the home network, or pick another station).",
  "Telefon": "Phone",
  "A Cantabile integráció nincs beállítva (Beállítások → Eszközök és szolgáltatások).": "The Cantabile integration is not set up (Settings → Devices & services).",
  "Kikapcsol {p} perc múlva ({t}).": "Turning off in {p} minutes ({t}).",
  "Időzített kikapcsolás törölve.": "Sleep timer cleared.",
  "Időzítő: {h}": "Sleep timer: {h}",
  "Az ismétlés beállítása nem sikerült: {h}": "Setting repeat failed: {h}",
  "A csoportba kapcsolás nem sikerült: {h}": "Grouping the speakers failed: {h}",
  "Az átváltás nem sikerült: {h}": "Switching failed: {h}",
  "VÉTEL": "SIGNAL",
  "KERESÉS": "SEARCH",
  "HANGOLÁS…": "TUNING…",
  "PUFFEREL": "BUFFERING",
  "NINCS JEL": "NO SIGNAL",
  "nincs adó": "no station",
  "Beállítások – a Mentés minden vezérlőpult Cantabile kártyájába beírja": "Settings – Save writes them into every Cantabile card on all dashboards",
  "Mégse": "Cancel",
  "BT: ezen a készüléken szól (újra koppintva vissza a hangszóróra)": "BT: play on this device (tap again to return to the speaker)",
  "Mentés": "Save",
  "Általános": "General",
  "Márkanév": "Brand name",
  "Rádióadók": "Radio stations",
  "+ Új adó": "+ New station",
  "NÉV": "NAME",
  "GOMBON": "ON BUTTON",
  "STREAM-CÍM": "STREAM URL",
  "Név": "Name",
  "(a név)": "(the name)",
  "Lejátszás a választott hangszórón": "Play on the selected speaker",
  "▶ Próba": "▶ Test",
  "Törlés": "Delete",
  "A gombok frekvencia szerint rendeződnek; 6–7 gomb fér el kényelmesen. Sonosnál a furcsa portos https-cím helyett próbáld http-vel.": "Buttons are sorted by frequency; 6–7 fit comfortably. On Sonos, try http instead of an https address with an odd port.",
  "Adó keresése név szerint (Radio Browser), pl. Kossuth, Jazzy, Rock FM": "Search stations by name (Radio Browser), e.g. BBC, Jazz FM, Rock",
  "Keresés": "Search",
  "+ Felvesz": "+ Add",
  "Hangszórók": "Speakers",
  "+ Új hangszóró": "+ New speaker",
  "LEJÁTSZÓ": "PLAYER",
  "FAJTA": "TYPE",
  "Egyéb (sor nélkül, pl. WiiM)": "Other (no queue, e.g. WiiM)",
  "Tape deck": "Tape deck",
  "Zenemappa": "Music folder",
  "48 kHz-es másolatok mappája": "Folder of 48 kHz copies",
  "(nincs)": "(none)",
  "Feltöltések mappája": "Uploads folder",
  "Saját lejátszó-szkript": "Custom player script",
  "(beépített)": "(built-in)",
  "Kijelző": "Display",
  "Előlap": "Front panel",
  "Ez a TV saját lejátszója: csak a hang megy át. A képernyőhöz válaszd a(z) „{n}” lejátszót.": "This is the TV's own player: only the sound gets through. For the screen, choose “{n}”.",
  "Átállítás": "Switch",
  "Tipp: ha ennek az eszköznek van képernyője, a Cantabile integráció beállításaiban (TV-lejátszók) felvéve a szám a képernyőn is megjelenik.": "Tip: if this device has a screen, add it under TV players in the Cantabile integration options to show the track on screen.",
  "A(z) {h} a TV saját lejátszója – csak a hang megy át. A ⚙-ben állítsd át a(z) „{n}” lejátszóra.": "{h} is the TV's own player – only the sound gets through. Switch it to “{n}” in ⚙.",
  "A Cantabile TV-oldala a Cast-os TV-re: equalizer, előadókép, a szám adatai és haladásjelző.": "The Cantabile TV page for a Cast TV: equalizer, artist image, track details and progress.",
  "Ezüst (húzott alumínium)": "Silver (brushed aluminium)",
  "Fekete (90-es évek)": "Black (nineties)",
  "Deprez-műszer (mutatós VU)": "Moving-coil VU meters",
  "Fluoreszcens kijelző (VFD)": "Fluorescent display (VFD)",
  "VU-késleltetés (mp)": "VU delay (s)",
  "„{n}” felvéve – add meg a frekvenciáját (MHz).": "“{n}” added – enter its frequency (MHz).",
  "A próbához adj meg egy http(s):// kezdetű stream-címet.": "Enter a stream URL starting with http(s):// to test.",
  "Próba: „{n}” a(z) {h} hangszórón.": "Test: “{n}” on {h}.",
  "A(z) {h} nem tudta lejátszani: {e}": "{h} could not play it: {e}",
  "Írj be legalább két betűt.": "Type at least two letters.",
  "Nincs találat – próbáld másképp írva (ékezet nélkül is).": "No results – try another spelling.",
  "A keresés nem sikerült: {h}": "Search failed: {h}",
  "{n}. adó: hiányzik a név": "Station {n}: name is missing",
  "{n}: a frekvencia 87,5 és 108 közé essen": "{n}: frequency must be between 87.5 and 108",
  "{n}. adó": "Station {n}",
  "{n}: a stream-cím http:// vagy https:// kezdetű legyen": "{n}: the stream URL must start with http:// or https://",
  "{n}. hangszóró: név és lejátszó kell": "Speaker {n}: name and player are required",
  "Legalább egy hangszóró kell.": "At least one speaker is required.",
  "nem találom a kártyát ezen a vezérlőpulton": "the card was not found on this dashboard",
  "Áttekintés": "Overview",
  "Ez a lejátszó nem tud keverni.": "This player can't shuffle.",
  "Beállítások elmentve: {n}.": "Settings saved: {n}.",
  "Nem sikerült: {h}.": "Failed: {h}.",
  "A mentéshez rendszergazdai felhasználó kell.": "Saving requires an administrator user.",
  "A mentés nem sikerült: {h}": "Saving failed: {h}",
  "A telefonról választott zene a BT kimeneten szól – átváltottam.": "Music picked from the phone plays on the BT output – switched to it.",
  "A streaming kazetta csak Sonos hangszórón szól.": "Streaming tapes only play on Sonos speakers.",
  "Ebben a mappában nincs lejátszható szám.": "There are no playable tracks in this folder.",
  "Adó keresése név szerint…": "Search stations by name…",
  "Bezár": "Close",
  "Betöltés…": "Loading…",
  "Nincs találat erre: „{q}”.": "No results for “{q}”.",
  "Nincs találat.": "No results.",
  "Gombra (⚙ beállításokban)": "To a preset button (⚙ settings)",
  "+ gombra": "+ preset",
  "A Radio Browser most nem érhető el: {h}": "Radio Browser is not reachable right now: {h}",
  "„{n}” felvéve – a Mentéssel gombként is megmarad.": "“{n}” added – Save keeps it as a preset.",
  "„{n}” felvéve – add meg a frekvenciáját (MHz), majd Mentés.": "“{n}” added – enter its frequency (MHz), then Save.",
  "Keresés…": "Searching…",
  "A keresés nem érhető el: {h}": "Search is not available: {h}",
  "Következőnek": "Play next",
  "Sor végére": "Add to end of queue",
  "ELŐADÓK": "ARTISTS",
  "ALBUMOK": "ALBUMS",
  "SZÁMOK": "TRACKS",
  "LISTÁK": "PLAYLISTS",
  "Keverés közben a „következőnek” és a „sor végére” nem érhető el (a Sonos véletlen helyre tenné).": "While shuffling, “play next” and “add to end” are not available (Sonos would insert at a random place).",
  "A Deezer csak Sonos hangszórón szól – válts Sonos hangszóróra.": "Deezer only plays on Sonos speakers – switch to a Sonos speaker.",
  "Keresés a Deezeren…": "Search Deezer…",
  "Deezer toplista…": "Deezer charts…",
  "Deezer-lista · {n} szám": "Deezer playlist · {n} tracks",
  "{e} – népszerű számok": "{e} – top tracks",
  "{n} szám": "{n} tracks",
  "kislemez": "single",
  "válogatás": "compilation",
  "album": "album",
  "Nincs találat a Deezeren erre: „{q}”.": "No results on Deezer for “{q}”.",
  "A Deezer most nem érhető el: {h}": "Deezer is not reachable right now: {h}",
  "Rádióadó szól – ott nincs lejátszási sor.": "A radio station is playing – there is no queue.",
  "A(z) {h} hangszórón most nincs lejátszási sor. Tegyél be egy kazettát.": "{h} has no queue right now. Insert a tape.",
  "(cím nélkül)": "(untitled)",
  "(cím nélkül – Deezer)": "(untitled – Deezer)",
  "A sor nem olvasható: {h}": "The queue can't be read: {h}",
  "keverve": "shuffled",
  "keverés közben a „következőnek” nem érhető el": "“play next” is not available while shuffling",
  "Törlés a sorból": "Remove from queue",
  "Biztos?": "Sure?",
  "A törlés nem sikerült: {h}": "Removing failed: {h}",
  "Az áthelyezés nem sikerült: {h}": "Moving failed: {h}",
  "Sorba tenni csak Sonos hangszórón lehet.": "Queueing only works on Sonos speakers.",
  "Keverés közben a Sonos véletlen helyre teszi – kapcsold ki a SHUFFLE-t.": "While shuffling, Sonos inserts at a random place – turn SHUFFLE off.",
  "{m} a szóló után következik.": "{m} will play next.",
  "{m} a sor végére került.": "{m} added to the end of the queue.",
  "A szám": "The track",
  "A sorba tétel nem sikerült: {h}": "Adding to the queue failed: {h}",
  "Nem sikerült a számra ugrani: {h}": "Jumping to the track failed: {h}",
  "‹ Vissza": "‹ Back",
  "Keresés a zenemappában…": "Search the music folder…",
  "Saját zene": "My music",
  "Sonos kedvencek": "Sonos favourites",
  "TELEFON": "PHONE",
  "SOR": "QUEUE",
  "A streaming kazetták csak Sonos hangszórón szólnak – válts Sonos hangszóróra.": "Streaming tapes only play on Sonos speakers – switch to a Sonos speaker.",
  "Nincs Sonos-kedvenc lista vagy album.": "No Sonos favourite playlists or albums.",
  "Nincs megadva zenemappa (⚙ → Tape deck → Zenemappa).": "No music folder set (⚙ → Tape deck → Music folder).",
  "Üres mappa.": "Empty folder.",
  "Hiba: {h}": "Error: {h}",
  "EZEN A KÉSZÜLÉKEN · BÁRMELYIK HANGSZÓRÓN": "ON THIS DEVICE · ANY SPEAKER",
  "Saját zene a(z) {h} hangszórón: átmeneti feltöltés (24 óra múlva törlődik)…": "Your music on {h}: temporary upload (deleted after 24 hours)…",
  "A feltöltés nem sikerült: {h}": "Upload failed: {h}",
  "A fájl már nem érhető el – válaszd ki újra.": "The file is no longer available – pick it again.",
  "Válassz zenét erről a készülékről: a BT kimeneten közvetlenül szól; más hangszórón átmenetileg feltöltődik a Home Assistantra (a kazettán TEMP jelzés), és 24 óra múlva magától törlődik.": "Pick music from this device: it plays directly on the BT output; on any other speaker it is uploaded to Home Assistant temporarily (TEMP on the tape) and deleted automatically after 24 hours.",
  "♪ Zene választása…": "♪ Choose music…",
  "FELTÖLTVE · BÁRMELYIK HANGSZÓRÓN": "UPLOADED · ON ANY SPEAKER",
  "A kiválasztott számok a zenemappa „{m}” mappájába kerülnek (fájlonként legfeljebb 20 MB), utána bármelyik hangszóró és a BT is lejátssza.": "The chosen tracks go to the “{m}” folder of the music folder (max. 20 MB per file); then any speaker and BT can play them.",
  "↑ Feltöltés…": "↑ Upload…",
  "Telefonról": "From phone",
  "{n} szám a zenemappában": "{n} tracks in the music folder",
  "Ürítés ({n} szám törlése)": "Clear ({n} tracks)",
  "Még nincs feltöltött szám.": "No uploaded tracks yet.",
  "Biztos? Koppints újra a törléshez": "Sure? Tap again to delete",
  "Törlés…": "Deleting…",
  "A törléshez rendszergazdai felhasználó kell.": "Deleting requires an administrator user.",
  "Törlés: {h}": "Delete: {h}",
  "Saját válogatás": "My selection",
  "{n} szám a telefonról": "{n} tracks from the phone",
  "A feltöltéshez rendszergazdai felhasználó kell.": "Uploading requires an administrator user.",
  "Feltöltve: {n} szám.": "Uploaded: {n} tracks.",
  "20 MB fölött, kihagyva: {h}.": "Over 20 MB, skipped: {h}.",
  "lejátszási lista": "playlist",
  "nem elérhető": "unavailable",
  "a tape deck szól": "the tape deck is playing",
  "kikapcsolva": "off",
  "RÁDIÓ SZÓL": "RADIO ON",
  "VU · VALÓDI JEL": "VU · REAL SIGNAL",
  "VU · NORMALIZÁLT": "VU · NORMALISED",
  "PEAK · dBFS": "PEAK · dBFS",
  "VU · UTÁNZAT": "VU · SIMULATED",
  "Lejátszási sor": "Queue",
  "— üres —": "— empty —",
  "EJECT: kazetta választás": "EJECT: choose a tape",
  "Dalszöveg": "Lyrics",
  "lista · {o}": "playlist · {o}",
  "lista": "playlist",
  "kísérleti": "experimental",
  "Keresés: {s}…": "Search {s}…",
  "{s}: kísérleti funkció – élő fiókkal még nincs visszaigazolva.": "{s}: experimental – not yet confirmed with a live account.",
  "Írd be, mit keresel: előadó, album, szám vagy lista.": "Type what you're looking for: artist, album, track or playlist.",
  "az előadó oldala nem tölthető be": "the artist page could not be loaded",
  "A(z) {s} most nem érhető el: {h}": "{s} is not available right now: {h}",
  "Nincs találat ({s}): „{q}”.": "No results on {s} for “{q}”.",
  "A(z) {s} Sonoson szól – válts Sonos hangszóróra.": "{s} plays on Sonos – switch to a Sonos speaker.",
  "A Spotify Sonoson vagy Spotify Connect-hangszórón szól – válts hangszórót.": "Spotify plays on Sonos or on a Spotify Connect speaker – switch speakers.",
  "Saját Spotify-könyvtár": "Your Spotify library",
  "A(z) {h} nem szerepel a Spotify Connect-eszközök között (nyisd meg rajta egyszer a Spotify appot, vagy add meg a nevét: spotify_device).": "{h} is not among the Spotify Connect devices (open the Spotify app on it once, or set its name: spotify_device).",
  "A Spotify Connect-lejátszás csak Spotify Connect-hangszóróra vihető át – a(z) {r} szól tovább.": "Spotify Connect playback can only move to a Spotify Connect speaker – it keeps playing on {r}.",
  "Ebben a zenetárban nincs keresés – böngéssz a mappák között (töröld a keresőt).": "This library can't be searched – browse the folders instead (clear the search box).",
  "Ezt, ami most szól, nem tudom átvinni a(z) {h} hangszóróra – a(z) {r} szól tovább.": "I can't move what's playing now to {h} – it keeps playing on {r}.",
  "Üres hely – koppints, és a NET-katalógusból tegyél ide adót": "Empty slot – tap to put a station here from the NET catalogue",
  "Régi hi-fi rádió és tape deck (ezüst vagy fekete): adógombok, NET-rádió, forgó kazetta, valódi VU-mérők, NAS, Deezer, Spotify és Tidal.": "Old hi-fi radio and tape deck (silver or black): station buttons, NET radio, turning cassette, real VU meters, NAS, Deezer, Spotify and Tidal.",
  "A(z) {h} nem tud zenét fogadni a Cantabile-tól (nincs lejátszás-indítás funkciója) – válassz másik lejátszót a ⚙ beállításokban.": "{h} can't receive music from Cantabile (it has no play-media function) – pick another player in ⚙ settings.",
  "A KÁRTYÁN (MAX. 8)": "ON CARD (MAX. 8)",
  "max. 8": "max. 8",
  "{n}: a kártyán megjelenő név legfeljebb 8 karakter lehet": "{n}: the name shown on the card can be at most 8 characters",
  "{n}: a név 8 karakternél hosszabb – adj meg rövidebb nevet a kártyára": "{n}: the name is longer than 8 characters – give a shorter name for the card",
  "DEEZER fül": "DEEZER tab",
  "Látszik (a Sonos appban bekötött Deezer-fiókkal szól)": "Shown (plays with the Deezer account linked in the Sonos app)",
  "Rejtve (nincs Deezer)": "Hidden (no Deezer)",
  "{n}: a frekvencia 87,5 és 108 közé essen (vagy hagyd üresen)": "{n}: the frequency must be between 87.5 and 108 (or leave it empty)",
  "A gombok frekvencia szerint rendeződnek, 12 hely van. A frekvencia elhagyható (csak internetes adó: a skálán egyenletesen elosztva, a gombon WEB). Sonosnál a furcsa portos https-cím helyett próbáld http-vel.": "Buttons are sorted by frequency; there are 12 slots. The frequency is optional (internet-only station: spread evenly on the dial, WEB on the button). On Sonos, try http instead of an https address with an odd port.",
  "Zenemappa": "Music folder",
  "A Deezer nem indult el ({h}). A Sonos appban kösd be a Deezer-fiókot (Beállítások → Szolgáltatások), vagy a ⚙ beállításokban rejtsd el a DEEZER fület.": "Deezer did not start ({h}). Link your Deezer account in the Sonos app (Settings → Services), or hide the DEEZER tab in ⚙ settings.",
  "A tekerés nem sikerült: {h}": "Seeking failed: {h}",
  "A Deezer és a Sonos-kedvencek csak Sonoson szólnak – a(z) {h} szól tovább.": "Deezer and Sonos favourites only play on Sonos – {h} keeps playing.",
  "A telefonról választott zene csak BT-n szól – ott marad.": "Music chosen from the phone only plays on BT – it stays there.",
  "Húzd az átrendezéshez": "Drag to reorder",
  "Újraindult a Home Assistant – a kazettát friss linkekkel töltöm újra.": "Home Assistant restarted – reloading the tape with fresh links.",
  "Nincs dalszöveg ehhez a dalhoz.": "No lyrics found for this song.",
  "Instrumentális szám – nincs szövege.": "Instrumental – no lyrics.",
  "A dalszöveg-szolgáltatás nem érhető el.": "The lyrics service is unavailable.",
  "A Cantabile integráció nincs telepítve.": "The Cantabile integration is not installed.",
  "Rádióadásnál a pontos hely nem ismert, a szöveg kiemelés nélkül látszik.": "On radio the exact position is unknown, so no line is highlighted."
};
// felirat a Home Assistant nyelvén: a forrásszöveg magyar, angolul az EN szótárból ({x} = behelyettesítés)
const MAGYAR = () => /^hu/i.test(document.documentElement.lang || navigator.language || "");
const T = (s, v = {}) => String((MAGYAR() ? s : EN[s] ?? s)).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const NYELV = () => (MAGYAR() ? "hu-HU" : document.documentElement.lang || undefined);
// a hangszóró neve a kártyán (forgó, fejléc, kazetta, üzenetek): a „kártyán” név, legfeljebb NEV_MAX karakter; a hangvezérlés a teljes nevet használja
const NEV_MAX = 8;
const KN = (h) => (!h ? "" : h.kulcs === "multiroom" ? h.rovid : String(h.rovid || h.nev || "").slice(0, NEV_MAX));
const ESC = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MIN_F = 87.5, MAX_F = 108;
const POZ = (f) => ((Math.min(MAX_F, Math.max(MIN_F, f)) - MIN_F) / (MAX_F - MIN_F)) * 100;
const MHZ = (f) => f.toLocaleString(NYELV(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const CIM = (u) => String(u || "").replace(/^([a-z0-9+.-]+:\/\/)+/i, "").replace(/;$/, "");   // sémák és záró ; nélkül (a Sonos x-rincon-mp3radio://http://… alakban adja vissza)
const SZOL = (s) => ["playing", "buffering"].includes(s?.state);
// szünetel-e: a Sonos zenemappás számnál szünetben is „idle”-t jelent (nincs cím), de a sora és a helye megvan
const SZUNETEL = (s) => s?.state === "paused" || (s?.state === "idle" && Number(s.attributes?.queue_size) > 0 && Number(s.attributes?.media_position) > 0);
// a „BT” kimenet: a zene azon a készüléken szól, amelyiken a kártya nyitva van (telefon/tablet), így a hozzá párosított
// Bluetooth fülhallgatóra vagy hangszóróra megy; a kártya saját <audio> lejátszóval játssza (Deezer-kazetta itt nem megy)
const HELYI = "helyi:bt";
// sor-szerkesztés ikonjai (rajzolva, hogy minden betűkészlettel látsszanak)
const SI = {
  kov: '<svg viewBox="0 0 24 24"><path d="M12 19V7M6.5 12.5 12 7l5.5 5.5M5 4h14"/></svg>',
  vegere: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  torol: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
// a magnó öt funkciógombjának ikonjai (a Sonos app jelei mintájára, vonalrajzzal)
const OI = {
  korok: '<svg viewBox="0 0 24 24"><path d="M4 11V9a2.5 2.5 0 0 1 2.5-2.5H19M16 3.5l3 3-3 3M20 13v2a2.5 2.5 0 0 1-2.5 2.5H5M8 20.5l-3-3 3-3"/></svg>',
  kever: '<svg viewBox="0 0 24 24"><path d="M3 7h3c4 0 6 10 10 10h4M17 14l3 3-3 3M3 17h3c1.6 0 2.8-1.6 3.9-3.6M13.6 9.6C14.7 7.6 15.9 7 17 7h3M17 4l3 3-3 3"/></svg>',
  fade: '<svg viewBox="0 0 24 24"><path d="M3.5 6.5v11L12 12zM20.5 6.5v11L12 12z"/></svg>',
  sleep: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.5 2M4.5 4.5 2.5 6.5M19.5 4.5l2 2"/></svg>',
  bt: '<svg viewBox="0 0 24 24"><path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5"/></svg>',
  net: '<svg viewBox="0 0 24 24"><path d="M12 11v10M8.5 21h7M8.3 6.3a5.2 5.2 0 0 0 0 7.4M15.7 6.3a5.2 5.2 0 0 1 0 7.4M5.4 3.4a9.3 9.3 0 0 0 0 13.2M18.6 3.4a9.3 9.3 0 0 1 0 13.2"/><circle cx="12" cy="10" r="1.4"/></svg>',
};
// NET-adó: a Radio Browserből választott, gombra nem tett adó (az _adoIndex ezt adja vissza)
const KULSO = -2;
// Radio Browser: a tükörszerverek listáját a szolgáltatótól kéri (a szerverek cserélődnek), tartaléknak az ismertek
const RB_ALAP = ["de1", "de2"].map((x) => `https://${x}.api.radio-browser.info`);
let RB_LISTA = null;
const RB_SZERVEREK = () => (RB_LISTA ||= (async () => {
  const ctl = new AbortController(), ido = setTimeout(() => ctl.abort(), 5000);
  try {
    const l = await (await fetch("https://all.api.radio-browser.info/json/servers", { signal: ctl.signal })).json();
    return [...new Set([...l.map((x) => `https://${x.name}`), ...RB_ALAP])];
  } catch (e) { RB_LISTA = null; return RB_ALAP; } finally { clearTimeout(ido); }
})());
// kereséshez: kisbetű, ékezet nélkül
const KERES_NORM = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const SAFE_DECODE = (t) => { try { return decodeURIComponent(t); } catch (e) { return t; } };
// a telefonról feltöltött zene helye a zenemappán belül (magno.feltoltes); a Home Assistant feltöltője fájlonként legfeljebb 20 MB-ot fogad
const TEL_ALAP = "Cantabile", FEL_MAX = 20 * 1024 * 1024;
// alvásidőzítő: SLEEP gomb lépései (perc); a közös állapotot (lejátszó → leállás ideje) az integráció érzékelője tartja
const ALVAS_LEPES = [15, 30, 45, 60, 90];
// a kártya angol kulcsai → a belső (magyar) kulcsok; a ⚙ Mentés abban a nyelvben ír vissza, amiben a beállítás volt
const KULCS = { speakers: "hangszorok", stations: "adok", name: "nev", short: "rovid", frequency: "frekvencia", mode: "mod", tape: "magno",
  media_folder: "nas", brand: "marka", hires_folder: "hires", upload_folder: "feltoltes", player_script: "szkript", display: "vu_kijelzo", vu_delay: "vu_kesleltetes_mp", finish: "felulet" };
const VISSZA = Object.fromEntries(Object.entries(KULCS).map(([a, b]) => [b, a]));
const ATKULCS = (o, t) => Array.isArray(o) ? o.map((x) => ATKULCS(x, t)) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [t[k] || k, ATKULCS(v, t)])) : o;
const KIJELZO_BE = { vu: "deprez", vfd: "fluor" }, KIJELZO_KI = { deprez: "vu", fluor: "vfd" };
const KARTYAK = ["custom:cantabile-card", "custom:tablet-radio"];
// media_player-szolgáltatások és a hozzájuk kellő képesség-bit (supported_features)
const KEPESSEG = { volume_set: 4, shuffle_set: 32768, repeat_set: 262144, join: 524288 };
// a kártya beállításának „személyazonossága” a mentéshez: a hangszórók és az adók sora (a nevek, rövid nevek nem számítanak)
const LENYOMAT = (y) => { const c = ATKULCS(y || {}, KULCS); return JSON.stringify([(c.hangszorok || []).map((h) => h?.entity), (c.adok || []).map((a) => a?.url)]); };
const URLSZERU = (x) => /^[a-z0-9+.-]+:\/\//i.test(String(x || ""));
const HANGFAJL = /\.(mp3|flac|m4a|aac|ogg|wav|wma)$/i;
// lejátszható zeneszám-e egy médiaböngésző-elem: helyi fájlnál a kiterjesztés, más zenetárnál (Jellyfin, DLNA-médiaszerver…)
// a médiaosztály vagy a tartalomtípus dönt
const ZENE = (x) => !!x?.can_play && (HANGFAJL.test(x.media_content_id || "") || ["music", "track"].includes(x.media_class) || /^audio\//.test(x.media_content_type || ""));
// helyi médiamappa-e (ott a kereső a teljes fájllistán dolgozik; máshol a HA médiakeresője)
const HELYI_TAR = (id) => String(id || "").startsWith("media-source://media_source/");
// fájlnév → olvasható cím: „401-abba_-_when_i_kissed_the_teacher.mp3?authSig=…” → „abba – when i kissed the teacher”
const FAJLNEV = (u) => {
  let n = String(u || "").replace(/\?.*$/, "").split("/").pop();
  try { n = decodeURIComponent(n); } catch (e) { /* marad */ }
  return n.replace(/\.[a-z0-9]+$/i, "").replace(/^\d+[-_. ]*/, "").replace(/_/g, " ").replace(/\s+-\s+/, " – ").trim();
};
const ORA = (mp) => { mp = Math.max(0, Math.floor(mp || 0)); return `${Math.floor(mp / 3600)}:${String(Math.floor(mp / 60) % 60).padStart(2, "0")}:${String(mp % 60).padStart(2, "0")}`; };
const SZOLGALTATO = { 2: "Deezer", 9: "Spotify", 12: "Spotify", 174: "TIDAL", 204: "Apple Music", 284: "YouTube Music", 160: "SoundCloud" };
// a betöltött stream-kazetta szolgáltatója a forrás-dobozba (Spotify Connecten nincs Sonos-sid)
const SZOLG_NEV = { spotify: "SPOTIFY", tidal: "TIDAL", deezer: "DEEZER" };
// kis ikonok a kijelző-kazettához
const KI = {
  hang: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
  hangszoro: '<svg viewBox="0 0 24 24"><path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-5 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>',
  kever: '<svg viewBox="0 0 24 24"><path d="M14.8 13.4l-1.4 1.4 3.1 3.1L14.5 20H20v-5.5l-2 2-3.2-3.1zM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5zm-3.9 5.2L5.4 4 4 5.4l5.2 5.2 1.4-1.4z"/></svg>',
  ember: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/></svg>',
  lemez: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  szint: '<svg viewBox="0 0 24 24"><path d="M3 21h3v-7H3v7zm5 0h3V10H8v11zm5 0h3V6h-3v15zm5-18v18h3V3h-3z"/></svg>',
  sziv: '<svg viewBox="0 0 24 24"><path d="M12 21.4l-1.5-1.3C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.5 11.6L12 21.4z"/></svg>',
};
const SZINEK = ["#c0392b", "#e07b24", "#2c7fb8", "#2a9d8f", "#7b4fa0", "#c99a12", "#4a4e55", "#b5562a", "#3f8f3f", "#b8336a"];
const SZIN = (s) => { let h = 0; for (const ch of String(s || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return SZINEK[h % SZINEK.length]; };
const ROVID = (s, n) => { s = String(s || ""); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
// VU-skála: dB → a skála 0…1 közötti helye (a 0 VU kb. 72%-nál, utána a piros sáv)
const VU_JELEK = [[-20, 0], [-10, 0.2], [-7, 0.33], [-5, 0.45], [-3, 0.58], [-2, 0.65], [-1, 0.72], [0, 0.79], [1, 0.86], [2, 0.93], [3, 1]];
const IKON = {
  rew: '<svg viewBox="0 0 24 14"><path d="M12 0v14L0 7zM24 0v14L12 7z"/></svg>',
  play: '<svg viewBox="0 0 12 14"><path d="M0 0v14l12-7z"/></svg>',
  ff: '<svg viewBox="0 0 24 14"><path d="M0 0v14l12-7zM12 0v14l12-7z"/></svg>',
  stop: '<svg viewBox="0 0 12 14"><path d="M0 1h12v12H0z"/></svg>',
  pause: '<svg viewBox="0 0 12 14"><path d="M0 0h4v14H0zM8 0h4v14H8z"/></svg>',
  eject: '<svg viewBox="0 0 14 14"><path d="M7 0l7 8H0zM0 10h14v4H0z"/></svg>',
  fogas: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
};
// hétszegmenses, döntött számjegyek SVG-ben (a fluoreszcens kijelző számlálóihoz); a „.” az előző jegy után kis pont
const SZEGMENS = { a: [2.4, 0.5, 7.2, 1.1], b: [9.9, 2, 1.1, 7.2], c: [9.9, 10.8, 1.1, 7.2], d: [2.4, 18.4, 7.2, 1.1], e: [1, 10.8, 1.1, 7.2], f: [1, 2, 1.1, 7.2], g: [2.4, 9.45, 7.2, 1.1] };
const JEGYEK = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];
const HETSZEG = (szoveg) => {
  let x = 0, t = "";
  for (const ch of String(szoveg)) {
    if (ch === ".") { t += `<circle class="be" cx="${x - 1.2}" cy="19" r="1"/>`; x += 1.6; continue; }
    const be = /\d/.test(ch) ? JEGYEK[Number(ch)] : ch === "-" ? "g" : "";
    for (const [n, [sx, sy, w, h]] of Object.entries(SZEGMENS)) t += `<rect class="${be.includes(n) ? "be" : ""}" x="${x + sx}" y="${sy}" width="${w}" height="${h}" rx=".6"/>`;
    x += 13.5;
  }
  // width/height: a méretarány minden böngészőben ebből jön (a kijelző a magasságból számolja a szélességet)
  return `<svg viewBox="-1 0 ${x + 1} 20" width="${x + 1}" height="20" preserveAspectRatio="xMinYMid meet"><g transform="skewX(-8) translate(2.6 0)">${t}</g></svg>`;
};
// a „fordulatszámláló”: a kazetta (album/lista) haladása C90-es szalagon a felcsévélő orsó fordulataira számolva, 0000–9999
// (szalagsebesség 4,76 cm/s, oldalanként 45 perc, orsómag-sugár 1,1 cm, szalagvastagság 12 µm, 0,8-as számláló-áttétel)
const FORDULAT = (p) => {
  const hossz = Math.max(0, Math.min(1, p)) * 45 * 60 * 4.76, r0 = 1.1, d = 0.0012;
  const r = Math.sqrt(r0 * r0 + (hossz * d) / Math.PI);
  return Math.round(((r - r0) / d) * 0.8);
};

// a fluoreszcens kijelző digitális csúcsmérő (dBFS, a CD-játszók és stúdiók mintájára, IEC 60268-18): skálahelyek 0…1;
// −3 dBFS fölött piros (0,79-től, mint eddig), 0 dBFS = végkitérés (OVER = valódi vágás)
const PK_JELEK = [[-40, 0], [-30, 0.14], [-20, 0.3], [-10, 0.52], [-6, 0.66], [-3, 0.79], [0, 0.94]];
const PKPOZ = (db) => {
  if (db <= PK_JELEK[0][0]) return 0;
  for (let k = 1; k < PK_JELEK.length; k++) { const [d1, x1] = PK_JELEK[k - 1], [d2, x2] = PK_JELEK[k]; if (db <= d2) return x1 + ((db - d1) / (d2 - d1)) * (x2 - x1); }
  return 1;
};
const PK_ESES = 20 / 1.7;
// a mutatós VU hangosság-normalizált (mint a streaming-szolgáltatók, ReplayGain-szerűen): a szám átlagos hangossága
// (energiaátlag, a csend nélkül) −1 VU-ra kerül, így a mai hangos és a régi halk felvételek is 0 VU körül lengenek
const HN_CEL = -1, HN_CSEND = -35, HN_MAX = 14;   // dB / mp – a csúcsmérő visszaesése (IEC 60268-18: 20 dB 1,7 mp alatt)
// dB (VU-skála) → mutatóhely 0…1 (a VU_JELEK között egyenesen; −20 alatt a bal ütköző, +3 fölött kicsit túllendül)
const DBPOZ = (db) => {
  if (db <= VU_JELEK[0][0]) return 0;
  for (let k = 1; k < VU_JELEK.length; k++) {
    const [d1, x1] = VU_JELEK[k - 1], [d2, x2] = VU_JELEK[k];
    if (db <= d2) return x1 + ((db - d1) / (d2 - d1)) * (x2 - x1);
  }
  return Math.min(1.06, 1 + (db - 3) * 0.02);
};
// az írott márkanév betűkészlete – a dokumentumba kell bejegyezni (árnyék-DOM-ban a @font-face nem mindig hat).
// `alap`: a TV-oldalnak a HA teljes címe – a Cast-vevő oldala más címről fut, ott a betűket CORS-os útvonalon kéri
const BETU = (alap = "/cantabile_static/") => {
  if (document.getElementById("tablet-radio-betu")) return;
  const st = document.createElement("style");
  st.id = "tablet-radio-betu";
  // az üzenetablak betűi (Michroma: fejléc, Exo 2: szöveg; OFL, helyben, magyar ékezetekkel)
  const ff = (n, f, r, w = "400") => `@font-face{font-family:'${n}';src:url('${alap}${f}') format('woff2');font-weight:${w};font-display:swap;unicode-range:${r}}`;
  const LAT = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
  const EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF";
  // a kártya alapbetűje (Arimo, az Ariallal azonos méretű; OFL): a telefon lecserélt rendszerbetűje ne borítsa fel a képet
  const sans = (f, r) => `@font-face{font-family:'Cantabile Sans';src:url('${alap}${f}') format('woff2');font-weight:400 700;font-display:swap;unicode-range:${r}}`;
  st.textContent = sans("Arimo-latin.woff2", LAT) + sans("Arimo-latin-ext.woff2", EXT) + "@font-face{font-family:'Great Vibes';src:url('" + alap + "GreatVibes-latin.woff2') format('woff2');font-display:swap}"
    + ff("Michroma", "Michroma-latin.woff2", LAT) + ff("Michroma", "Michroma-latin-ext.woff2", EXT)
    + ff("Exo 2", "Exo2-latin.woff2", LAT, "100 900") + ff("Exo 2", "Exo2-latin-ext.woff2", EXT, "100 900");
  document.head.appendChild(st);
};
const TAR = {
  olvas(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ir(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privát mód */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
};

class CantabileCard extends HTMLElement {
  setConfig(eredeti) {
    // angol kulcsok (speakers, stations…) is jók; belül a magyar nevek
    this._angol = !!(eredeti?.speakers || eredeti?.stations || eredeti?.tape || eredeti?.brand);
    this._eredetiCfg = eredeti;
    const config = ATKULCS(eredeti || {}, KULCS);
    // a hangszóró típusa magától: Sonos-platform → sonos (sor, csoport, kedvencek), minden más → url
    (config.hangszorok || []).forEach((h) => {
      if (h && h.mod !== "sonos" && h.mod !== "url") { h.mod = this._hass?.entities?.[h.entity]?.platform === "sonos" ? "sonos" : "url"; h.automod = true; }
    });
    this._autoMod = !this._hass && (config.hangszorok || []).some((h) => h?.automod);
    if (config.magno?.vu_kijelzo in KIJELZO_BE) config.magno.vu_kijelzo = KIJELZO_BE[config.magno.vu_kijelzo];
    // előlap: ezüst (alap) vagy fekete húzott felület (90-es évek)
    this.toggleAttribute("fekete", config.felulet === "black");
    if (!Array.isArray(config.hangszorok) || !config.hangszorok.length) throw new Error(T("Adj meg legalább egy hangszórót (speakers)."));
    // frekvencia nélküli (csak internetes) adók: a skálán egyenletesen elosztva, a gombon WEB felirattal
    const adok = [...(config.adok || [])].filter((a) => a && a.url).map((a) => ({ ...a }));
    const nincsF = adok.filter((a) => !(Number(a.frekvencia) >= MIN_F && Number(a.frekvencia) <= MAX_F));
    nincsF.forEach((a, k) => { a.frekvencia = Math.round((88.5 + ((k + 1) * 19) / (nincsF.length + 1)) * 10) / 10; a.virt = true; });
    adok.forEach((a) => { a.frekvencia = Number(a.frekvencia); });
    this._config = { magno: {}, ...config, adok: adok.sort((a, b) => a.frekvencia - b.frekvencia) };
    // multiroom: ha legalább két Sonos van, a SPEAKERS kapcsoló kap egy közös állást is (mint a receivereken az A+B) –
    // ilyenkor a Sonos egy csoportba fogja őket (media_player.join), a hangerő mindegyikre megy; `multiroom: false` kikapcsolja
    const hl = [...config.hangszorok], sonosok = hl.filter((h) => h.mod === "sonos");
    if (sonosok.length >= 2 && config.multiroom !== false) {
      const utolso = hl.lastIndexOf(sonosok[sonosok.length - 1]);
      hl.splice(utolso + 1, 0, { nev: sonosok.map((h) => h.nev).join(" + "), rovid: "Multiroom", entity: sonosok[0].entity, mod: "sonos", tagok: sonosok.map((h) => h.entity), kulcs: "multiroom" });
    }
    this._kimenetek = [...hl, ...(config.bt === false ? [] : [{ nev: "BT", entity: HELYI, mod: "helyi" }])];
    this._hsz = null;
    this._mod = null;
    this._vu = [0, 0];
    this._vuCel = [0, 0];
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    BETU();
    this._epit();
  }

  set hass(hass) {
    const elso = !this._hass;
    this._hass = hass;
    // a típus nélküli hangszórók a platformból kapják meg (ehhez a hass kell): újraépítés egyszer
    if (elso && this._autoMod) { this._autoMod = false; this.setConfig(this._eredetiCfg); }
    if (elso) this._infoKer();
    if (this._hsz == null) this._hsz = this._kezdoHangszoro();
    if (this._mod == null) this._mod = this._kezdoMod();
    // a HA minden állapotváltozáskor (bármely szenzor) új hass-t ad: csak akkor rajzol újra, ha a kártyát érintő
    // állapot változott (lejátszók, kapcsolók, az integráció entitásai, nyelv) – nagy telepítésen gyenge tableten is sima;
    // biztonságból 10 mp-enként akkor is
    const ujNy = this._lenyomat(hass), regiNy = this._utolsoNy;
    if (!elso && regiNy && Date.now() - this._utolsoFr < 10000 && ujNy.length === regiNy.length && ujNy.every((x, i) => x === regiNy[i])) return;
    this._utolsoNy = ujNy; this._utolsoFr = Date.now();
    this._frissit();
  }

  _lenyomat(h) {
    const ki = [h.locale, h.language, h.entities, h.connected];
    for (const e of Object.values(this._ent || {})) ki.push(h.states[e]);
    for (const e in h.states) if (e.startsWith("media_player.") || e.startsWith("switch.")) ki.push(h.states[e]);
    return ki;
  }

  // az integráció entitásai (ismétlésszám, alvásidőzítő, NET-adó) a cantabile/info parancsból
  async _infoKer() {
    try { const v = await this._hass.callWS({ type: "cantabile/info" }); this._ent = v.entities || {}; this._haIndult = v.started ? v.started * 1000 : null; this._stream = v.streaming || {}; this._tvMap = v.tv || {}; }
    catch (e) { this._ent = {}; this._nincsIntegracio = true; }
    this._frissit();
  }

  static getStubConfig(hass) {
    const lejatszok = Object.keys(hass?.states || {}).filter((e) => e.startsWith("media_player."));
    const sonos = lejatszok.filter((e) => hass.entities?.[e]?.platform === "sonos");
    const valasztott = (sonos.length ? sonos : lejatszok).slice(0, 2);
    return { type: "custom:cantabile-card", speakers: (valasztott.length ? valasztott : ["media_player.example"]).map((e) => ({
      name: hass?.states[e]?.attributes?.friendly_name || e.split(".")[1], entity: e, mode: hass?.entities?.[e]?.platform === "sonos" ? "sonos" : "url" })),
      stations: [], tape: { media_folder: "media-source://media_source/local" } };
  }

  // a lapozó nem lapoz tovább, amíg a kazetta-polc nyitva van
  get tart() { return !!this._polc || !!this._szerk || !!this._net; }

  connectedCallback() {
    HELYI_KOZOS.kartya = this;
    // telefonon (keskeny helyen) álló elrendezés
    if (!this._meret && "ResizeObserver" in window) {
      this._meret = new ResizeObserver((e) => {
        const sz = e[0]?.contentRect.width;
        if (sz) this.toggleAttribute("keskeny", sz < 600);
        // panel nézet / magas kártyahely: az előlap a saját magasságában, függőlegesen középen (nem nyúlik szét)
        const mag = e[0]?.contentRect.height;
        if (sz && mag) this.toggleAttribute("magas", sz >= 600 && mag > sz * 0.62);
        const sr = this.shadowRoot; if (sr) { this._gorgo(sr.getElementById("kcim")); this._gorgo(sr.querySelector("#ksor .kea")); }
        this._igazitKesobb();
      });
      this._meret.observe(this);
    }
    if (!this._lato && "IntersectionObserver" in window) {
      this._lato = new IntersectionObserver((e) => { this._lathato = e[0]?.isIntersecting; this._jelFeliratkozas(); this._animIndit(); });
      this._lato.observe(this);
    }
  }

  disconnectedCallback() {
    if (HELYI_KOZOS.kartya === this) HELYI_KOZOS.kartya = null;   // a BT-hang eseményei ne egy lekerült kártyára menjenek
    this._lato?.disconnect(); this._lato = null;
    this._meret?.disconnect(); this._meret = null;
    cancelAnimationFrame(this._anim); this._anim = null;
    this._jelFeliratkozas();
  }

  _kezdoHangszoro() {
    const h = this._kimenetek;
    const szolo = h.findIndex((x) => SZOL(this._allapot(x)));
    if (szolo >= 0) {
      // ha a szóló Sonos épp a közös csoport vezetője, a közös állás az indulóállás
      const cs = h.findIndex((x) => x.tagok && x.entity === h[szolo].entity && this._egyutt(x));
      return cs >= 0 ? cs : szolo;
    }
    const tarolt = h.findIndex((x) => (x.kulcs || x.entity) === TAR.olvas("tablet-radio-hangszoro"));
    return tarolt >= 0 ? tarolt : 0;
  }

  _kezdoMod() {
    const hsz = this._hangszoro(), s = this._allapot(hsz);
    if (SZOL(s)) return this._adoIndex(hsz) !== -1 ? "radio" : "magno";
    return TAR.olvas("tablet-radio-mod") === "magno" ? "magno" : "radio";
  }

  // melyik adó szól a hangszórón (-1: semmi vagy ismeretlen)
  _adoIndex(hsz) {
    const s = this._allapot(hsz);
    if (!SZOL(s)) return -1;
    const a = s.attributes, adok = this._config.adok;
    let i = a.media_content_id ? adok.findIndex((x) => x.url && CIM(a.media_content_id) === CIM(x.url)) : -1;
    // a WiiM és a Cast az adó URL-jét a címmezőbe írja, a tartalom-azonosító üres
    const cimUrl = URLSZERU(a.media_title) ? CIM(a.media_title) : "";
    if (i < 0 && cimUrl) i = adok.findIndex((x) => x.url && CIM(x.url) === cimUrl);
    if (i < 0) {
      const szoveg = `${a.media_channel || ""} ${a.media_title || ""} ${a.source || ""}`.toLowerCase();
      i = adok.findIndex((x) => szoveg.includes(x.nev.toLowerCase()));
    }
    if (i < 0 && (a.media_content_id || cimUrl)) {
      const k = this._kulso(), c = a.media_content_id ? CIM(a.media_content_id) : cimUrl;
      if (k?.url && (c === CIM(k.url) || c === k.alias || (cimUrl && cimUrl === CIM(k.url)))) return KULSO;
    }
    return i;
  }

  // a kártyán választott NET-adó, vagy ha az szól, a hanggal indított (cantabile.play / Assist → az integráció NET-adó érzékelője)
  _kulso() {
    const t = TAR.json("tablet-radio-kulso"), h = this._hass?.states?.[this._ent?.net]?.attributes;
    if (!h?.url) return t;
    const c = CIM(this._allapot(this._hangszoro())?.attributes?.media_content_id || "");
    if (c && (c === CIM(h.url) || c === h.alias)) return h;
    return t || h;
  }

  _epit() {
    const c = this._config;
    this._kcimHtml = this._ksorHtml = null;
    let jelek = "";
    for (let f = 88; f <= 108; f += 0.5) {
      const egesz = Number.isInteger(f);
      jelek += `<i class="j ${egesz ? "n" : ""}" style="left:${POZ(f)}%"></i>`;
      if (egesz && f % 2 === 0) jelek += `<b class="sz${f % 4 === 2 ? " ptl" : ""}" style="left:${POZ(f)}%">${f}</b>`;
    }
    const adojel = c.adok.map((a, i) => `<i class="aj" data-i="${i}" style="left:${POZ(a.frekvencia)}%"></i>`).join("");
    const ADOHELY = 12;
    const gombok = c.adok.map((a, i) => `
      <button class="bill ado" data-i="${i}"><span class="led"></span><b>${ESC(a.rovid || a.nev)}</b><small>${a.virt ? "WEB" : MHZ(a.frekvencia)}</small></button>`).join("")
      + Array.from({ length: Math.max(0, ADOHELY - c.adok.length) }, () => `<button class="bill adoures" title="${T("Üres hely – koppints, és a NET-katalógusból tegyél ide adót")}"><span class="plusz">+</span></button>`).join("");
    // kimenetválasztó a Technics RS-M205 „tape select” tolókapcsolóinak mintájára: függőleges kapcsoló a hangszórókhoz
    // (annyi állás, ahány hangszóró), mellette külön kétállású BT kapcsoló; a kiválasztott név félkövér
    const kim = this._kimenetek, hszIdx = kim.map((h, i) => i).filter((i) => kim[i].entity !== HELYI), btIdx = kim.findIndex((h) => h.entity === HELYI);
    this._hszIdx = hszIdx; this._btIdx = btIdx;
    const funkGombok = `<button class="fgomb" data-f="kever" title="${T("Véletlenszerű lejátszás")}"><span class="led"></span>SHUFFLE</button>`
      + `<button class="fgomb" data-f="korok" title="${T("Ismétlés: 1 · 2 · 3 · 4 · 5 kör · végtelen")}"><span class="led"></span>REPEAT<b class="amar">1</b></button>`
      + `<button class="fgomb" data-f="fade" title="${T("Áttűnés a számok között (csak Sonos)")}"><span class="led"></span>FADE</button>`;
    const alvasGomb = `<button class="sleep" title="${T("Időzített kikapcsolás: 15 · 30 · 45 · 60 · 90 perc · ki")}"><span class="led"></span>SLEEP<b class="amar"></b></button>`;
    // a magnó öt funkciógombja: egyforma, ikonos gombok, a felirat alattuk (REPEAT · SHUFFLE · FADE · SLEEP · BT)
    const og = (f, cim, felirat) => `<div class="og og-${f}"><button class="ogomb" data-f="${f}" title="${cim}"><span class="led"></span><i>${OI[f]}${f === "korok" ? '<b class="oszam"></b>' : ""}</i></button><small>${felirat}<b class="amar"></b></small></div>`;
    const otGomb = `<div class="otg">${og("korok", T("Ismétlés: 1 · 2 · 3 · 4 · 5 kör · végtelen"), "REPEAT")}${og("kever", T("Véletlenszerű lejátszás"), "SHUFFLE")}`
      + `${og("fade", T("Áttűnés a számok között (csak Sonos)"), "FADE")}${og("sleep", T("Időzített kikapcsolás: 15 · 30 · 45 · 60 · 90 perc · ki"), "SLEEP")}`
      + `${this._kimenetek.some((h) => h.entity === HELYI) ? og("bt", T("BT: ezen a készüléken szól (újra koppintva vissza a hangszóróra)"), "BT") : ""}</div>`;
    const tolo = (nevek, osztaly, cim) => `<div class="tolo ${osztaly}"><div class="tnevek">${nevek}</div><div class="sin" title="${cim}"><i class="tfog"></i></div></div>`;
    const valaszto = `<div class="kimenet"><div class="tolok">
      <div class="toloo">${tolo(hszIdx.map((i) => `<button class="hszv" data-i="${i}" title="${ESC(kim[i].nev)}">${ESC(KN(kim[i]))}</button>`).join(""), "thsz", T("Hangszóró váltása"))}<small>SPEAKERS</small></div>
      ${btIdx >= 0 ? `<div class="toloo">${tolo(`<button class="btv" data-b="1">ON</button><button class="btv" data-b="0">OFF</button>`, "tbt", T("BT be / ki"))}<small>BT</small></div>` : ""}
    </div></div>`;
    // forgó hangszóró-választó (hi-fi SELECTOR mintára): a mutató állásai egyenletesen egy ~270°-os íven (bal alsótól az
    // óramutató irányában a jobb alsóig); minden álláshoz sugárirányú vonal indul a gombból, és a név magasságában vízszintesbe
    // fordul. Oldalanként legfeljebb 4 név (bal oldalt jobbra, jobb oldalt balra zárva); a 9. név középen a gomb fölé, a 10.-kel
    // ketten a gomb fölé, egymás mellé kerülnek. Legfeljebb 4 állásnál minden név jobbra (a gomb jobb felén, 0–150°).
    const L0 = kim.map((h, i) => i).filter((i) => kim[i].entity !== HELYI).slice(0, 10), nL = L0.length;
    const ketOldal = nL > 4, R = 26, SUG = R + 14, VIZ = 10, LBL = 86;
    const IV = ketOldal ? [-135, 135] : [0, 150];
    const fokok = L0.map((i, n) => (nL > 1 ? IV[0] + ((IV[1] - IV[0]) * n) / (nL - 1) : 0));
    // a felső (gomb fölötti) nevek: 9-nél a középső, 10-nél a két középső
    const felso = new Set(nL === 9 ? [4] : nL === 10 ? [4, 5] : []);
    const CX = ketOldal ? SUG + VIZ + LBL : R + 8, CY = SUG + 14, VH = CY + Math.round(SUG * 0.71) + 20;
    const VW = ketOldal ? 2 * CX : CX + SUG + VIZ + LBL + 8;
    const allas = {};
    L0.forEach((i, n) => {
      const fok = fokok[n], szog = (fok * Math.PI) / 180, irany = [Math.sin(szog), -Math.cos(szog)];
      const pont = (r) => [CX + r * irany[0], CY + r * irany[1]];
      const p = pont(R + 2), k = pont(SUG), lamp = pont(R + 6);
      let oldal = felso.has(n) ? (nL === 9 ? "fent" : n === 4 ? "fbal" : "fjobb") : fok <= 0 && ketOldal ? "bal" : "jobb";
      // vízszintes szakasz: oldalt az oszlop széléig, fölül csak egy rövid kitérő a két név között
      const vegX = oldal === "bal" ? CX - SUG - VIZ : oldal === "jobb" ? CX + SUG + VIZ : oldal === "fbal" ? k[0] - 6 : oldal === "fjobb" ? k[0] + 6 : k[0];
      allas[i] = { oldal, fok, p, k, v: [vegX, k[1]], l: lamp };
    });
    this._forgoSzog = (i) => (allas[i] ? allas[i].fok : 0);
    const f1 = (x) => x.toFixed(1);
    const cimke = (i) => {
      const a = allas[i], hely = a.oldal === "bal" || a.oldal === "fbal" ? `right:${f1(VW - a.v[0] + 2)}px;top:${f1(a.v[1])}px`
        : a.oldal === "fent" ? `left:${f1(a.v[0])}px;top:${f1(a.v[1] - 7)}px` : `left:${f1(a.v[0] + 2)}px;top:${f1(a.v[1])}px`;
      return `<button class="fhsz${a.oldal === "fent" ? " ftop" : ""}" data-i="${i}" style="${hely}"><span class="fn">${ESC(KN(kim[i]))}</span></button>`;
    };
    const forgo = `<div class="kimenet forgo${ketOldal ? " ket" : ""}"><div class="valaszto" style="width:${VW}px;height:${VH}px">
      <svg class="vvonal" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}">${L0.map((i) => { const a = allas[i];
        return `<polyline points="${f1(a.p[0])},${f1(a.p[1])} ${f1(a.k[0])},${f1(a.k[1])} ${f1(a.v[0])},${f1(a.v[1])}"/>`; }).join("")}</svg>
      ${L0.map((i) => `<span class="flamp" data-i="${i}" style="left:${f1(allas[i].l[0])}px;top:${f1(allas[i].l[1])}px"></span>${cimke(i)}`).join("")}
      <div class="vgomb" style="left:${CX}px;top:${CY}px" title="${T("Hangszóró váltása")}"><div class="vsapka"></div></div><small style="left:${CX - 40}px;width:80px">SPEAKERS</small></div></div>`;
    const valto = `<button class="valto" title="${T("Rádió / tape")}"><span class="vr">RADIO</span><span class="kapcs"></span><span class="vm">TAPE</span></button>`;
    let beosztas = "";
    for (let k = 0; k <= 10; k++) {
      const sz = -135 + k * 27;
      beosztas += `<i class="bj" style="transform:rotate(${sz}deg)"></i>`;
      if (k % 2 === 0) beosztas += `<b class="bsz" style="transform:rotate(${sz}deg) translateY(-84px) rotate(${-sz}deg)">${k}</b>`;
    }
    // SIGNAL-műszer a Marantz 2230 mintájára: türkizen világító számlap; a mutató a stream „térerejét” mutatja
    let jo = "";
    for (let k = 0; k <= 10; k++) {
      const a = (-40 + 8 * k) * Math.PI / 180, r1 = 34, r2 = k % 2 ? 37 : 39;
      jo += `<line x1="${(50 + r1 * Math.sin(a)).toFixed(1)}" y1="${(56 - r1 * Math.cos(a)).toFixed(1)}" x2="${(50 + r2 * Math.sin(a)).toFixed(1)}" y2="${(56 - r2 * Math.cos(a)).toFixed(1)}"/>`;
      if (k % 2 === 0) jo += `<text x="${(50 + 44 * Math.sin(a)).toFixed(1)}" y="${(58 - 44 * Math.cos(a)).toFixed(1)}">${k / 2}</text>`;
    }
    const jelmero = `<svg class="jelsvg" viewBox="0 0 100 62"><defs><radialGradient id="jlap" cx=".5" cy=".75" r=".8"><stop offset="0" class="jl1"/><stop offset="1" class="jl2"/></radialGradient></defs>
      <rect x="0" y="0" width="100" height="62" rx="3" fill="url(#jlap)"/>
      <path d="M${(50 - 34 * Math.sin(40 * Math.PI / 180)).toFixed(1)} ${(56 - 34 * Math.cos(40 * Math.PI / 180)).toFixed(1)} A34 34 0 0 1 ${(50 + 34 * Math.sin(40 * Math.PI / 180)).toFixed(1)} ${(56 - 34 * Math.cos(40 * Math.PI / 180)).toFixed(1)}" fill="none" stroke="#062421" stroke-width=".8"/>
      <g stroke="#062421" stroke-width=".8">${jo}</g><text x="50" y="44" class="jcim">SIGNAL</text>
      <g class="jmut" id="jmut"><line x1="50" y1="58" x2="50" y2="17" stroke="#0a0a0a" stroke-width="1.1"/></g>
      <rect x="0" y="54" width="100" height="8" fill="#0b0c0d"/></svg>`;
    const hangero = `<div class="hangero">${beosztas}<div class="gomb"><div class="sapka"></div></div><div class="hcim">VOLUME <span class="hszam"></span></div></div>`;
    // Deprez VU-műszer az Ernst Turner 702 mintájára: fehér számlap, a skála fölött minden dB-felirat, vastag piros ív 0 fölött,
    // írott márkanév, lent adattábla-szöveg ezüst csavarokkal, fekete ívelt mutatóburkolat; forgáspont (85, 128)
    const vu = (n) => {
      const sz = (x) => -42 + 84 * x;   // skálahely → szög (fok)
      const pont = (x, r) => { const a = (sz(x) * Math.PI) / 180; return [85 + r * Math.sin(a), 128 - r * Math.cos(a)]; };
      const f = (v) => v.toFixed(1);
      let t = "";
      for (const [db, x] of VU_JELEK) {
        const [x1, y1] = pont(x, 92), [x2, y2] = pont(x, 99);
        const szin = db > 0 ? "#c4231c" : "#111";
        t += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${szin}" stroke-width="${db === 0 ? 1.3 : 0.9}"/>`;
        const [tx, ty] = pont(x, 105), fok = sz(x);
        t += `<text x="${f(tx)}" y="${f(ty)}" transform="rotate(${f(fok * 0.55)} ${f(tx)} ${f(ty)})" fill="${szin}" class="vsz">${db > 0 ? "+" + db : db}</text>`;
      }
      // köztes rövid osztások
      for (let k = 0; k <= 40; k++) {
        const x = k / 40;
        if (VU_JELEK.some(([, y]) => Math.abs(y - x) < 0.012)) continue;
        const [x1, y1] = pont(x, 92), [x2, y2] = pont(x, 95.5);
        t += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${x > 0.79 ? "#c4231c" : "#111"}" stroke-width=".6"/>`;
      }
      const [a0, b0] = pont(0, 92), [a2, b2] = pont(1, 92);
      const [p1, q1] = pont(0.79, 88.8), [p2, q2] = pont(1, 88.8);
      const csavar = (x, y) => `<circle cx="${x}" cy="${y}" r="3.3" fill="url(#vcsavar)" stroke="#8b8f94" stroke-width=".4"/><path d="M${x - 2.2} ${y + 1}L${x + 2.2} ${y - 1}" stroke="#6a6e73" stroke-width=".7"/>`;
      return `<div class="vu"><svg viewBox="0 0 170 100">
        <defs><radialGradient id="vcsavar" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fafafa"/><stop offset="1" stop-color="#a3a7ab"/></radialGradient>
          <radialGradient id="vfeny" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#d9d6cc" stop-opacity="0"/></radialGradient></defs>
        <rect class="vlap" x="0" y="0" width="170" height="100" rx="6"/>
        <rect x="0" y="0" width="170" height="100" rx="6" fill="url(#vfeny)"/>
        <path d="M${f(a0)} ${f(b0)} A92 92 0 0 1 ${f(a2)} ${f(b2)}" stroke="#111" stroke-width=".9" fill="none"/>
        <path d="M${f(p1)} ${f(q1)} A88.8 88.8 0 0 1 ${f(p2)} ${f(q2)}" stroke="#c4231c" stroke-width="4.6" fill="none"/>
        ${t}
        <text x="14" y="30" class="vfel">VU</text><text x="156" y="30" class="vfel">VU</text>
        <text x="85" y="70" class="vmarka">${ESC(c.marka || "Cantabile")}</text>
        <g class="vapro"><text x="6" y="80">MODEL</text><text x="30" y="80">702</text><text x="6" y="86">RECTIFIER</text><text x="6" y="92">CH. ${n}</text>
          <text x="164" y="80" text-anchor="end">SER. 2026</text><text x="164" y="86" text-anchor="end">0VU = 1.228V</text><text x="164" y="92" text-anchor="end">7500Ω @ 1000~</text></g>
        ${csavar(46, 82)}${csavar(124, 82)}
        <g class="tu" id="tu${n}"><line x1="85" y1="128" x2="85" y2="27" stroke="#0d0d0d" stroke-width="1.15"/></g>
        <path d="M58 100 Q58 84 85 84 Q112 84 112 100 Z" fill="#141414" stroke="#9ea2a7" stroke-width="1.6"/>
        <path d="M63 100 Q63 89 85 89 Q107 89 107 100 Z" fill="#050505"/>
      </svg></div>`;
    };
    // TDK MA-X90 mintájú „kijelző-kazetta”: fekete ház, fent sötét címke (állapotsor, cím, előadó/album/minőség, „A” oldal),
    // középen átlátszó ablaksáv a tekercsekkel és a fehér, áttetsző orsókkal, alatta aranycsík (márka + fájlformátum),
    // eltelt idő + csík + hossz, legalul a fejnyílás a szalaggal és a két ezüst görgő
    let racs = "";
    for (let k = 0; k <= 4; k++) racs += `<line x1="${106 + k * 7}" y1="52" x2="${106 + k * 7}" y2="85"/>`;
    for (let k = 0; k <= 4; k++) racs += `<line x1="106" y1="${52 + k * 8.25}" x2="134" y2="${52 + k * 8.25}"/>`;
    const csavar = (x, y) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#2a2b2e" stroke="#55575c" stroke-width=".6"/><path d="M${x - 2} ${y}H${x + 2}M${x} ${y - 2}V${y + 2}" stroke="#0c0c0d" stroke-width=".8"/>`;
    const gorgo = (x, y) => `<circle cx="${x}" cy="${y}" r="7.5" fill="url(#ezust)" stroke="#6f7278" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="2.6" fill="#2a2b2e"/>`;
    const kazetta = `<div class="kaz" id="kaz">
      <svg viewBox="0 0 240 150" preserveAspectRatio="none">
        <defs>
          <radialGradient id="tekercs" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#4a3020"/><stop offset=".9" stop-color="#2e1c10"/><stop offset="1" stop-color="#5d3f28"/></radialGradient>
          <linearGradient id="ablaksav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd3d6" stop-opacity=".30"/><stop offset=".5" stop-color="#e9ecee" stop-opacity=".16"/><stop offset="1" stop-color="#b7bcc0" stop-opacity=".30"/></linearGradient>
          <radialGradient id="ezust" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f2f3f4"/><stop offset="1" stop-color="#8d9196"/></radialGradient>
          <linearGradient id="hej" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#202125"/><stop offset="1" stop-color="#0e0f11"/></linearGradient>
          <clipPath id="ablakvag"><rect x="20" y="48" width="200" height="41" rx="3"/></clipPath>
        </defs>
        <rect x="1" y="1" width="238" height="148" rx="7" fill="url(#hej)" stroke="#3b3d42"/>
        <!-- címke -->
        <rect x="12" y="17.5" width="216" height="27" rx="2" fill="#17181b" stroke="rgba(255,255,255,.06)"/>
        <rect id="sav" x="12" y="17.5" width="216" height="1.6" fill="#888"/>
        <rect x="211" y="21" width="13" height="13" fill="#3a3b3f"/><text x="217.5" y="31.5" text-anchor="middle" font-family=""Cantabile Sans", Arial, sans-serif" font-size="11" fill="#141416">A</text>
        <!-- átlátszó ablaksáv: tekercsek (az ablakra vágva), középen a rács -->
        <rect x="20" y="48" width="200" height="41" rx="3" fill="#0a0a0b"/>
        <g clip-path="url(#ablakvag)">
          <circle id="pb" cx="75" cy="68.5" r="22" fill="url(#tekercs)"/><circle id="pj" cx="165" cy="68.5" r="14" fill="url(#tekercs)"/>
          <rect x="20" y="48" width="200" height="41" fill="url(#ablaksav)"/>
          <g stroke="rgba(255,255,255,.22)" stroke-width=".5">${racs}</g>
          <path d="M20 51.5H220M20 85.5H220" stroke="rgba(255,255,255,.12)" stroke-width=".6"/>
        </g>
        <rect x="20" y="48" width="200" height="41" rx="3" fill="none" stroke="#2c2d31" stroke-width="1.2"/>
        <g class="orso" id="ob">${this._orso(75, 68.5)}</g><g class="orso" id="oj">${this._orso(165, 68.5)}</g>
        <!-- aranycsík -->
        <path d="M12 92.5H228M12 103.5H228" stroke="#a88b4f" stroke-width=".9"/>
        <text x="16" y="100.6" font-family=""Cantabile Sans", Arial, sans-serif" font-weight="700" font-size="6" letter-spacing="1" fill="#c9ad72">${ESC((c.marka || "Cantabile").toUpperCase())}</text>
        <!-- fejnyílás a szalaggal, görgők, csavarok -->
        <path d="M40 149 L50 121 H190 L200 149" fill="#121315" stroke="#2c2e33"/>
        <path id="szalag" d="M46 146 H194" stroke="#3a2414" stroke-width="1.6"/>
        <g fill="#050506"><rect x="62" y="132" width="9" height="6" rx="2"/><rect x="169" y="132" width="9" height="6" rx="2"/><circle cx="96" cy="140" r="3.2"/><circle cx="144" cy="140" r="3.2"/><rect x="114" y="127" width="12" height="4" rx="1.5"/></g>
        ${gorgo(20, 133)}${gorgo(220, 133)}
        ${csavar(8, 8)}${csavar(232, 8)}${csavar(8, 142)}${csavar(232, 142)}
      </svg>
      <div class="ksav" id="ksav"></div>
      <div class="kcim" id="kcim"></div>
      <div class="ksor" id="ksor"></div>
      <div class="kido"><span id="kel"></span><span id="khossz"></span></div>
      <div class="kcsik"><i id="kcsik"></i></div>
      <div class="kform" id="kform"></div>
    </div>`;
    // fluoreszcens kijelző a Technics RS-TR575 deck mintájára: fekete ablak, két fehér hétszegmenses számláló
    // (bal: szalagszámláló fordulatban, jobb: eltelt idő perc.mp), köztük állapotjel; alatta vékony L/R csúcsjelző,
    // köztük dB-skála, 0 dB fölött piros, csúcstartással
    const VFD_N = 34;
    const szegmensek = () => Array.from({ length: VFD_N }, (_, i) => `<i class="${(i + 0.5) / VFD_N > 0.79 ? "p" : ""}"></i>`).join("");
    const vfdSkala = PK_JELEK.map(([db, x]) => `<span style="left:${(x * 100).toFixed(1)}%" class="${db >= -3 ? "p" : ""}">${db}</span>`).join("");
    // jelzősor a COUNTER és a TIME felirat között: BT · mobilnet · SHUFFLE · REPEAT n · FADE (bekapcsolva világít, különben halvány)
    const vjelzo = `<div class="vjelzo">
        <i data-j="bt"><svg viewBox="0 0 24 24"><path d="M6.5 7l11 10-5.5 5V2l5.5 5-11 10"/></svg><small>BT</small></i>
        <i data-j="mobil"><svg viewBox="0 0 24 24"><path d="M12 10v12M8.5 22h7M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4M5 3a10 10 0 0 0 0 14M19 3a10 10 0 0 1 0 14"/><circle cx="12" cy="10" r="1.6"/></svg></i>
        <i data-j="kever"><svg viewBox="0 0 24 24"><path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.6M13.6 9.6C14.7 7.6 15.9 7 16.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"/></svg><small>SHUFFLE</small></i>
        <i data-j="korok"><svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/></svg><small>REPEAT</small><em></em></i>
        <i data-j="fade"><svg viewBox="0 0 24 24"><path d="M2 6c6 0 10 12 20 12M2 18C12 18 16 6 22 6"/></svg><small>FADE</small></i>
      </div>`;
    const vfd = `<div class="vfd">
      <div class="vszamok">${vjelzo}<div class="vsz"><small>COUNTER</small><span id="vszam">${HETSZEG("0000")}</span></div>
        <div class="vall" id="vall"></div>
        <div class="vsz"><div class="vidosor"><i class="vstop" id="vstop"><svg viewBox="0 0 20 22"><rect x="7.5" y="0.8" width="5" height="2.4" rx="1"/><path d="M10 3.4V5.2M15.6 6.4l1.6-1.6"/><circle cx="10" cy="13.2" r="7.6"/><path d="M10 13.2V8.6M10 13.2l3 2"/></svg></i><span id="vido">${HETSZEG("00.00")}</span></div><small id="vidocim">TIME</small></div></div>
      <div class="vmero">
        <div class="vsor"><b>L</b><div class="szeg" id="vfdL">${szegmensek()}</div><em>PEAK</em></div>
        <div class="vsor"><b>dB</b><div class="vskala">${vfdSkala}</div><em></em></div>
        <div class="vsor"><b>R</b><div class="szeg" id="vfdR">${szegmensek()}</div><em>OVER</em></div>
      </div></div>`;
    // működtetőgombok a Technics RS-M205 mintájára: süllyesztett sávban magas, keskeny billentyűk, fölöttük kis felirat, színes jelölőcsík
    const mgomb = (k, jel, felirat, szin) => `<button class="mg" data-k="${k}"><small>${jel}${felirat}</small><i class="mbill"${szin ? ` style="--j:${szin}"` : ""}></i></button>`;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; font-family: "Cantabile Sans", Arial, sans-serif;
          /* a kártya a saját betűméreteivel készült: a telefon nagyított betűmérete ne tolja szét */
          -webkit-text-size-adjust: none; text-size-adjust: none; }
        button, input, select, textarea { font-family: inherit; }
        /* széles (tablet) elrendezés ott is, ahol a környezet nem ad magasságot (pl. szekciós nézet laptopon): a fali tablet
           arányában; a lapozóban a kapott magasság érvényes, ott ez nem hat */
        /* széles elrendezés: a két előlap egy rácscellában; ahol a környezet magasságot ad (fali tablet lapozója), kitöltik,
           ahol nem (pl. szekciós nézet laptopon), a kártya pontosan a tartalom magasságát veszi fel */
        :host(:not([keskeny])) ha-card { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); padding: 6px 12px; }
        :host(:not([keskeny])) .elo { position: relative; inset: auto; grid-area: 1 / 1; min-height: 0; }
        ha-card { height: 100%; box-sizing: border-box; overflow: hidden; border-radius: 14px; padding: 0 12px; position: relative;
          background: linear-gradient(90deg, #4a2a17, #6b3d20 40%, #4a2a17) ; border: 0; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
        .elo { position: absolute; inset: 6px 12px; border-radius: 6px; display: grid; grid-template-columns: minmax(0, 1fr) 236px; gap: 12px; padding: 12px 14px;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px),
            linear-gradient(180deg, #eef0f2, #c8ccd1 55%, #b9bec4);
          box-shadow: inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #6d7076;
          transition: opacity .35s, transform .35s; }
        .elo.rejt { opacity: 0; transform: translateY(14px) scale(.97); pointer-events: none; }
        .bal { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .fej { display: flex; align-items: baseline; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif;
          letter-spacing: .28em; color: #3d4148; text-transform: uppercase; }
        .fej .hszfej { letter-spacing: .12em; font-weight: 500; color: #5b6068; margin-left: auto; }
        .fej .tipus { margin-left: 12px; font: 400 20px/0 "Great Vibes", "Brush Script MT", cursive; letter-spacing: 0; text-transform: none;
          color: #3d4148; position: relative; top: 9px; text-shadow: 0 1px 0 rgba(255,255,255,.85); }
        /* írott márkanév (10-26 óta 4 px-szel lejjebb, hogy ne érjen a készülék széléig): kilóg a felső margóba, így nem veszi el a helyet a skálától / kazettától */
        .fej .marka { font: 400 30px/0 "Great Vibes", "Brush Script MT", cursive; letter-spacing: 0; text-transform: none; color: #26292e;
          position: relative; top: 9px; text-shadow: 0 1px 0 rgba(255,255,255,.85), 0 -1px 0 rgba(0,0,0,.18); }
        .skala { position: relative; flex: 1; min-height: 120px; border-radius: 5px; overflow: hidden;
          background: linear-gradient(180deg, #0b0c0d, #16181a 60%, #0d0e0f);
          box-shadow: inset 0 2px 6px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.8), 0 0 0 2px #53575d; }
        .feny { position: absolute; inset: 0; opacity: 0; transition: opacity .8s;
          background: radial-gradient(70% 90% at 55% 55%, rgba(70,140,255,.26), rgba(60,120,255,.07) 60%, transparent 80%); }
        .be .feny { opacity: 1; }
        /* Marantz-ablak: SIGNAL-műszer | kéken világító skála | Gyro-Touch lendkerék */
        .skala { display: grid; grid-template-columns: 92px minmax(0, 1fr) 46px; gap: 10px; padding: 8px 10px; box-sizing: border-box; }
        .skkoz { position: relative; min-width: 0; container-type: inline-size; }
        @container (max-width: 420px) { .sz.ptl { display: none; } }
        .jelm { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .jelsvg { width: 100%; height: auto; border-radius: 3px; box-shadow: 0 0 0 1px #2a2d31; }
        .jelsvg .jl1 { stop-color: #1b4f49; transition: stop-color .8s; } .jelsvg .jl2 { stop-color: #0a201e; transition: stop-color .8s; }
        .be .jelsvg .jl1 { stop-color: #7ff2dc; } .be .jelsvg .jl2 { stop-color: #1fa58f; }
        .be .jelsvg { box-shadow: 0 0 0 1px #2a2d31, 0 0 14px rgba(80,230,200,.35); }
        .jelsvg text { font: 700 6px/1 "Cantabile Sans", Arial, sans-serif; fill: #062421; text-anchor: middle; }
        .jelsvg .jcim { font-size: 6.5px; letter-spacing: .12em; }
        .jmut { transform-origin: 50px 58px; transform: rotate(-40deg); transition: transform 1.4s cubic-bezier(.3,1.25,.5,1); }
        .jfel { font: 600 9px/1 "Cantabile Sans", Arial, sans-serif; color: #5f7d79; white-space: nowrap; letter-spacing: .04em; min-height: 9px; }
        .be .jfel { color: #8fe9d6; }
        .jelm .stereo { font: 700 8px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #5a2420; border: 1px solid #3a1714; padding: 2px 5px; border-radius: 2px; display: flex; gap: 4px; align-items: center; }
        .jelm .stereo i { width: 5px; height: 5px; transform: rotate(45deg); background: #5a2420; }
        .be .jelm .stereo { color: #ff4b3a; border-color: #ff4b3a; text-shadow: 0 0 6px rgba(255,75,58,.7); }
        .be .jelm .stereo i { background: #ff4b3a; box-shadow: 0 0 6px #ff4b3a; }
        .giro { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; justify-content: center; touch-action: none; cursor: ew-resize; -webkit-tap-highlight-color: transparent; }
        .kerek { width: 100%; flex: 1; max-height: 74px; border-radius: 3px; box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #3a3d42;
          background: linear-gradient(180deg, rgba(0,0,0,.85), rgba(0,0,0,0) 22%, rgba(255,255,255,.18) 50%, rgba(0,0,0,0) 78%, rgba(0,0,0,.85)),
            repeating-linear-gradient(90deg, #c9ced3 0 2px, #6d7278 2px 3px, #e8ebee 3px 5px, #8b9096 5px 7px); }
        .giro small { font: 700 7px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .16em; color: #6d7179; }
        .be .giro small { color: #8fb8e6; }
        .giro:active .kerek { box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #6fa8ff; }
        .kezi .mutato { transition: none; }
        .sav { position: absolute; left: 22px; right: 22px; top: 0; bottom: 0; }
        .j { position: absolute; top: 34%; width: 1px; height: 9px; background: #6d6a62; transform: translateX(-.5px); transition: background .8s; }
        .j.n { top: calc(34% - 5px); height: 14px; width: 2px; transform: translateX(-1px); }
        .sz { position: absolute; top: calc(34% + 14px); transform: translateX(-50%); font: 600 13px/1 "Cantabile Sans", Arial, sans-serif; color: #77736a; transition: color .8s, text-shadow .8s; }
        .be .j { background: #9fd0ff; box-shadow: 0 0 4px rgba(110,180,255,.8); } .be .sz { color: #cfe7ff; text-shadow: 0 0 6px rgba(90,160,255,.9); }
        .vonal { position: absolute; left: 0; right: 0; top: calc(34% + 9px); height: 1px; background: #4a4842; }
        .be .vonal { background: #6fa8e8; }
        .aj { position: absolute; top: calc(34% - 13px); width: 7px; height: 5px; transform: translateX(-50%); background: #7c5a22; clip-path: polygon(0 0, 100% 0, 50% 100%); }
        .be .aj { background: #ffb347; box-shadow: 0 0 4px #ffb347; }
        .mertek { position: absolute; left: 10px; top: 10px; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em; color: #8a857a; }
        .mertek.j2 { left: auto; right: 10px; }
        .be .mertek { color: #9fd0ff; } .be .mertek:first-child { color: #ff5a3c; text-shadow: 0 0 6px rgba(255,90,60,.7); }
        .mutato { position: absolute; top: 6px; bottom: 6px; width: 3px; margin-left: -1.5px; border-radius: 2px;
          background: linear-gradient(90deg, #a00, #ff2a2a 50%, #a00); box-shadow: 0 0 6px rgba(255,40,40,.75), 0 0 1px #f66;
          transition: left 1.8s cubic-bezier(.45,.05,.15,1); }
        .kiir { position: absolute; left: 12px; right: 12px; bottom: 9px; display: flex; justify-content: space-between; gap: 14px;
          font: 500 13px/1.2 "Cantabile Sans", Arial, sans-serif; color: #6f6b62; white-space: nowrap; }
        .kiir b { color: #8b867b; font-weight: 700; letter-spacing: .04em; }
        .kiir span:last-child { overflow: hidden; text-overflow: ellipsis; }
        .be .kiir { color: #b9d9ff; } .be .kiir b { color: #e6f2ff; }
        .gombsor { display: flex; gap: 7px; height: 64px; flex: none; }
        .nincsado { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 12px; border: 1px dashed #8a8e94; border-radius: 3px; font: 500 12px/1.3 "Cantabile Sans", Arial, sans-serif; color: #4a4e55; }
        .bill { flex: 1; min-width: 0; position: relative; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 14px 2px 4px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          background: linear-gradient(180deg, #fafbfc, #dde0e4 70%, #c9cdd2); box-shadow: 0 5px 0 #80858c, 0 6px 6px rgba(0,0,0,.25);
          transform: translateY(0); transition: transform .12s, box-shadow .12s; -webkit-tap-highlight-color: transparent; color: #2b2e33; }
        .bill b { font: 700 13px/1 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .bill small { font: 500 11px/1 "Cantabile Sans", Arial, sans-serif; color: #636871; }
        .bill .led { position: absolute; top: 6px; left: 50%; width: 14px; height: 4px; margin-left: -7px; border-radius: 2px; background: #6b3a35; box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }
        .bill.akt, .bill:active { transform: translateY(4px); box-shadow: 0 1px 0 #80858c, 0 2px 3px rgba(0,0,0,.25); background: linear-gradient(180deg, #e7e9ec, #cfd3d8); }
        .bill.akt .led { background: #ff3b2f; box-shadow: 0 0 6px #ff3b2f; }
        .msor { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1.6fr 1fr; gap: 8px; padding: 5px 10px 9px; border-radius: 3px; box-sizing: border-box;
          background: linear-gradient(180deg, #b8bcc1, #d9dcdf); box-shadow: inset 0 2px 4px rgba(0,0,0,.35), 0 1px 0 #fff; }
        .mg { display: flex; flex-direction: column; align-items: stretch; gap: 3px; min-width: 0; border: 0; padding: 0; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .mg small { display: flex; justify-content: center; align-items: center; gap: 3px; font: 400 9px/1 "Cantabile Sans", Arial, sans-serif; color: #3c4046; white-space: nowrap; }
        .mg small svg { height: 7px; width: auto; fill: #3c4046; }
        .mbill { flex: 1; min-height: 36px; display: block; border-radius: 2px; position: relative; transition: transform .1s, box-shadow .1s;
          background: linear-gradient(180deg, #f3f4f5 0%, #d2d5d9 55%, #b6babf 100%);
          box-shadow: 0 0 0 1px #6f737a, 0 3px 0 #7d8188, 0 4px 5px rgba(0,0,0,.35), inset 0 1px 0 #fff; }
        .mbill::before { content: ""; position: absolute; left: 22%; right: 22%; top: 5px; height: 2px; border-radius: 1px; background: var(--j, transparent); }
        .mg.akt .mbill, .mg:active .mbill, .mg.lenyomva .mbill { transform: translateY(3px); box-shadow: 0 0 0 1px #6f737a, 0 0 0 #7d8188, 0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 #fff; }
        .mg.akt .mbill::before { box-shadow: 0 0 4px var(--j, transparent); }
        .tilt .mg { opacity: .5; pointer-events: none; }
        /* jobb oszlop: fent a hangerőgomb, alatta a forgó kimenetválasztó és a RÁDIÓ/MAGNÓ kapcsoló (+ POWER / állapot) */
        .jobb, .mjobb { display: grid; grid-template-columns: auto auto; grid-template-areas: "hang hang" "kim kap"; justify-content: center; align-content: space-between; align-items: center; gap: 0 10px; min-height: 0; }
        .jobb > .hangero, .mjobb > .hangero { grid-area: hang; justify-self: center; transform: scale(.84); margin: -14px; }
        .magno .mjobb > .hangero { transform: translateY(var(--hgy, 0px)) scale(.78); }
        :host(:not([keskeny])) .elo.magno { grid-template-columns: minmax(0, 1fr) 260px; }
        :host(:not([keskeny])) .magno .mjobb > .forgo, :host(:not([keskeny])) .magno .mjobb > .kap { transform: translateY(var(--fgy, 0px)); }
        .kimenet { grid-area: kim; }
        .kap { grid-area: kap; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .kap .valto, .rbal .valto { flex-direction: column; gap: 4px; }
        .kap .kapcs, .rbal .kapcs { width: 20px; height: 40px; }
        .kap .kapcs::after, .rbal .kapcs::after { left: 2px; top: 2px; width: 16px; height: 18px; transition: top .2s; }
        .magno .kap .kapcs::after { left: 2px; top: 20px; }
        .sleep, .fgomb { position: relative; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 11px 6px 3px; min-width: 64px; display: flex; gap: 4px; justify-content: center; align-items: baseline;
          font: 700 8px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .18em; color: #2b2e33; background: linear-gradient(180deg, #f6f7f8, #d0d4d9); box-shadow: 0 2px 0 #80858c; -webkit-tap-highlight-color: transparent; }
        .sleep .led, .fgomb .led { position: absolute; top: 4px; left: 50%; width: 10px; height: 3px; margin-left: -5px; border-radius: 2px; background: #6b5a35; }
        .sleep.be .led, .fgomb.be .led { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .sleep .amar, .fgomb .amar { letter-spacing: 0; font-size: 9px; color: #8a5a00; }
        .sleep:active, .fgomb:active { transform: translateY(1px); box-shadow: 0 1px 0 #80858c; }
        .tolok { display: flex; gap: 12px; align-items: flex-start; }
        .toloo { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .toloo small { font: 700 7px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .22em; color: #6d7179; }
        .tolo { display: flex; gap: 5px; align-items: stretch; }
        .tnevek { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; }
        .tnevek button { border: 0; background: none; padding: 1px 0; cursor: pointer; font: 400 9px/1.25 "Cantabile Sans", Arial, sans-serif; color: #5b6068; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
        .tnevek button.akt { font-weight: 700; color: #1f2226; }
        .sin { position: relative; width: 20px; min-height: 46px; border-radius: 2px; cursor: pointer; -webkit-tap-highlight-color: transparent;
          background: linear-gradient(90deg, #d8dbde, #f6f7f8 50%, #c3c6ca); box-shadow: 0 0 0 1px #8a8e94, inset 0 1px 0 #fff; }
        .sin::before { content: ""; position: absolute; left: 8px; right: 8px; top: 5px; bottom: 5px; background: #1a1b1d; border-radius: 1px; }
        .tfog { position: absolute; left: 3px; right: 3px; height: 15px; top: calc(3px + var(--p, 0) * (100% - 21px)); border-radius: 2px; transition: top .2s;
          background: linear-gradient(180deg, #fbfbfb, #c9ccd0 45%, #e8eaec 55%, #a7abb0); box-shadow: 0 0 0 1px #5d6168, 0 2px 3px rgba(0,0,0,.4); }
        .tfog::after { content: ""; position: absolute; left: 2px; right: 2px; top: 6px; height: 2px; background: #6c7076; }
        .thsz .tnevek { min-height: 46px; }
        .bton .thsz .tnevek button.akt { font-weight: 400; color: #8a8e94; }
        .hangero { position: relative; width: 176px; height: 176px; flex: none; }
        .bj { position: absolute; left: 50%; top: 50%; width: 2px; height: 8px; margin: -78px 0 0 -1px; background: #3d4148; transform-origin: 1px 78px; }
        .bsz { position: absolute; left: 50%; top: 50%; width: 16px; margin: -6px 0 0 -8px; text-align: center; font: 700 10px/12px "Cantabile Sans", Arial, sans-serif; color: #3d4148; }
        .gomb { position: absolute; left: 50%; top: 50%; width: 128px; height: 128px; margin: -64px 0 0 -64px; border-radius: 50%;
          background: repeating-conic-gradient(#d8dbdf 0 2.5deg, #7d828a 2.5deg 5deg);
          box-shadow: 0 6px 12px rgba(0,0,0,.45), 0 0 0 2px #50545a; touch-action: none; cursor: grab; }
        .gomb:active { cursor: grabbing; }
        .sapka { position: absolute; inset: 9px; border-radius: 50%; transition: transform .15s;
          background: conic-gradient(from 20deg, #f4f5f6, #a9aeb4 12%, #eceef0 25%, #9da2a8 38%, #f1f2f3 50%, #a2a7ad 62%, #e9ebed 75%, #9ca1a7 88%, #f4f5f6);
          box-shadow: inset 0 2px 2px rgba(255,255,255,.9), inset 0 -3px 5px rgba(0,0,0,.35); }
        .sapka::after { content: ""; position: absolute; left: 50%; top: 9px; width: 5px; height: 22px; margin-left: -2.5px; border-radius: 3px; background: #1d1f22; box-shadow: inset 0 1px 1px rgba(255,255,255,.3); }
        .hcim { position: absolute; left: 0; right: 0; bottom: -1px; text-align: center; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .25em; color: #3d4148; }
        .hcim span { letter-spacing: .05em; color: #5b6068; font-weight: 600; }
        .lent { display: flex; align-items: center; gap: 10px; flex: none; }
        .hszk { display: flex; flex: 1; border-radius: 3px; overflow: hidden; box-shadow: 0 0 0 1px #7c8189, 0 2px 0 #80858c; }
        .hsz { flex: 1; border: 0; border-right: 1px solid #9a9fa6; padding: 6px 4px; cursor: pointer; color: #2b2e33;
          font: 700 11px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: linear-gradient(180deg, #f6f7f8, #d3d7db); -webkit-tap-highlight-color: transparent; }
        .hsz:last-child { border-right: 0; }
        .hsz .lamp { width: 7px; height: 7px; border-radius: 50%; background: #5a5f55; box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }
        .hsz.akt { background: linear-gradient(180deg, #d2d6da, #e6e8eb); box-shadow: inset 0 2px 3px rgba(0,0,0,.25); }
        .hsz.akt .lamp { background: #6ef07a; box-shadow: 0 0 5px #6ef07a; }
        .valto { display: flex; align-items: center; gap: 6px; border: 0; background: none; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent;
          font: 700 9px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #8a8f96; }
        .kapcs { position: relative; width: 40px; height: 18px; border-radius: 3px; background: linear-gradient(180deg, #24262a, #44474d);
          box-shadow: inset 0 2px 3px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.8); }
        .kapcs::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 14px; border-radius: 2px; transition: left .2s;
          background: repeating-linear-gradient(90deg, #f6f7f8 0 2px, #c5c9ce 2px 4px); box-shadow: 0 1px 2px rgba(0,0,0,.5); }
        .magno .kapcs::after { left: 20px; }
        .elo:not(.magno) .vr, .magno .vm { color: #2b2e33; }
        .tap { display: flex; align-items: center; gap: 8px; }
        .tap .stereo { font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .15em; color: #7a7f86; display: flex; align-items: center; gap: 5px; }
        .tap .stereo i { width: 7px; height: 7px; border-radius: 50%; background: #5d4a2a; }
        .be .tap .stereo i { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .be .tap .stereo { color: #3d4148; }
        .power { width: 64px; height: 30px; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; position: relative;
          font: 700 9px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em; color: #2b2e33; padding: 12px 0 0;
          background: linear-gradient(180deg, #f6f7f8, #d0d4d9); box-shadow: 0 3px 0 #80858c; -webkit-tap-highlight-color: transparent; }
        .power::before { content: ""; position: absolute; top: 5px; left: 50%; width: 10px; height: 4px; margin-left: -5px; border-radius: 2px; background: #6b3a35; }
        .be .power { transform: translateY(2px); box-shadow: 0 1px 0 #80858c; }
        .be .power::before { background: #ff3b2f; box-shadow: 0 0 6px #ff3b2f; }
        .pwsor { display: flex; gap: 6px; }
        .pwsor .power { width: 56px; }
        .power.netgomb::before, .be .power.netgomb::before { background: #2f4a63; box-shadow: none; }
        .be .power.netgomb { transform: none; box-shadow: 0 3px 0 #80858c; }
        .net .power.netgomb::before { background: #39b6ff; box-shadow: 0 0 6px #39b6ff; }
        .netlista { display: grid; gap: 3px; }
        .nsor { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; align-items: stretch; }
        .nsor .nado { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 8px; align-items: center; text-align: left; border: 0; border-radius: 3px;
          padding: 5px 8px; cursor: pointer; background: rgba(255,255,255,.05); color: #f3e8d4; min-width: 0; }
        .nsor.akt .nado { background: rgba(255,216,146,.2); box-shadow: inset 3px 0 0 #ffd892; }
        .nlogo { width: 30px; height: 30px; border-radius: 4px; background: rgba(255,255,255,.08); overflow: hidden; display: block; }
        .nlogo img { width: 100%; height: 100%; object-fit: contain; display: block; background: #fff; }
        .nsor .st { display: grid; gap: 2px; min-width: 0; }
        .nsor b { font: 600 12.5px/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nsor small { color: #a88f6b; font: 500 11px/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nsor .ngomb { border: 0; border-radius: 3px; padding: 0 9px; cursor: pointer; background: rgba(255,255,255,.07); color: #cdb995; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; white-space: nowrap; }
        .nado:active, .ngomb:active { background: rgba(255,216,146,.28); }
        .eloadok button small { color: #a88f6b; font-size: 10px; }
        .tilt .bill, .tilt .power { opacity: .5; pointer-events: none; }

        /* magnó */
        .felso { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 10px; align-items: center; }
        /* kazetta-ablak: a kazettánál nagyobb, teljesen átlátszó ajtó, két szélén keskeny krómcsíkkal; mögötte sötét akna, benne a kazetta */
        .ablak { position: relative; width: 100%; max-height: 100%; aspect-ratio: 240 / 150; justify-self: center; border-radius: 3px; overflow: hidden; background: #121315;
          box-shadow: inset 0 0 0 1px #000, inset 0 6px 14px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.8); }
        .ajto { position: absolute; inset: 0; z-index: 2; pointer-events: none; border-radius: 3px;
          background: linear-gradient(118deg, rgba(255,255,255,.2) 0 9%, rgba(255,255,255,.05) 9% 22%, transparent 22% 62%, rgba(255,255,255,.06) 62% 70%, transparent 70%),
                      linear-gradient(180deg, rgba(255,255,255,.09), transparent 30%, transparent 80%, rgba(255,255,255,.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset 0 -1px 0 rgba(255,255,255,.12); }
        .ajto .krom { position: absolute; top: 0; bottom: 0; width: 2.4%; min-width: 5px;
          background: linear-gradient(90deg, #8d9197, #f7f8f9 35%, #b9bdc2 55%, #fdfdfd 75%, #8a8e94); box-shadow: 0 0 2px rgba(0,0,0,.6); }
        .ajto .kb { left: 0; } .ajto .kj { right: 0; }
        .ajto span { position: absolute; left: 0; right: 0; bottom: 2.6%; text-align: center; font: 700 9px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .3em; color: rgba(230,232,235,.5); }
        .kaz { position: absolute; inset: 5.5% 6.5% 10%; container-type: size; filter: drop-shadow(0 4px 6px rgba(0,0,0,.7)); transition: transform .5s cubic-bezier(.3,1.3,.5,1), opacity .4s; color: #ececec;
          font-family: "Cantabile Sans", Arial, sans-serif; }
        .kaz > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .kcim, .ksor, .kido, .kform { text-shadow: 0 1px 2px rgba(0,0,0,.95), 0 0 6px rgba(0,0,0,.7); }
        .tolt .kaz { transform: translateY(-110%); }
        .ures .kcim, .ures .ksor { opacity: .55; }
        .orso { transform-box: fill-box; transform-origin: center; animation: forog 3.2s linear infinite; animation-play-state: paused; }
        .fut .orso { animation-play-state: running; }
        .gyors .orso { animation-duration: .45s; animation-play-state: running; }
        .vissza .orso { animation-direction: reverse; }
        @keyframes forog { to { transform: rotate(-360deg); } }  /* lejátszáskor óramutatóval ellentétes: alul balról jobbra fut a szalag */
        .ksav { position: absolute; left: 3%; right: 3%; top: 1.2%; height: 9.5%; display: flex; align-items: center; justify-content: space-between; gap: 2cqw;
          font-size: 3.6cqw; font-weight: 700; white-space: nowrap; }
        .ksav span { display: inline-flex; align-items: center; gap: .8cqw; min-width: 0; }
        .ksav svg { height: 4.4cqw; fill: currentColor; flex: none; }
        .ksav .lista { flex: 1; justify-content: center; overflow: hidden; text-overflow: ellipsis; letter-spacing: .03em; }
        .ksav .lista b { overflow: hidden; text-overflow: ellipsis; }
        .ksav .doboz { border: 1px solid currentColor; border-radius: 2px; padding: 0 .8cqw; font-size: 2.9cqw; line-height: 1.25; }
        .ksav .kapcsolo { cursor: pointer; }
        .ksav .ki { opacity: .38; }
        .kcim { position: absolute; left: 7%; right: 13%; top: 13.2%; text-align: center; font-size: 5cqw; font-weight: 800; letter-spacing: .02em;
          text-transform: uppercase; }
        .ksor { position: absolute; left: 7%; right: 13%; top: 21.6%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3cqw; font-size: 3.7cqw; font-weight: 600; }
        .ksor .kmin { display: flex; align-items: center; gap: 1cqw; justify-content: flex-end; white-space: nowrap; }
        .ksor .kures { grid-column: 1 / -1; display: flex; justify-content: center; }
        .ksor .kea .gord { align-items: center; gap: 1cqw; }
        .ksor .kea .gord > * { flex: none; }
        .ksor .ksep { display: inline-block; width: 2cqw; flex: none; }
        /* görgetett szöveg: a doboz levágja, a belső sor oda-vissza úszik (csak ha nem fér ki) */
        .gdoboz, .kcim { overflow: hidden; white-space: nowrap; min-width: 0; text-overflow: clip; }
        .gord { display: inline-flex; white-space: nowrap; }
        .kcim .gord { display: inline-block; }
        .tul { text-align: left; }
        .tul > .gord { animation: gord var(--ido, 8s) ease-in-out infinite alternate; }
        @keyframes gord { 0%, 18% { transform: translateX(0); } 82%, 100% { transform: translateX(var(--tav, 0)); } }
        .ksor span { display: flex; align-items: center; gap: 1cqw; min-width: 0; }
        .ksor span:nth-child(2) { justify-content: center; } .ksor span:nth-child(3) { justify-content: flex-end; }
        .ksor em { font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ksor svg { height: 4.2cqw; fill: #cfd3d8; flex: none; }
        .kido { position: absolute; left: 7%; right: 7%; top: 70.2%; display: flex; justify-content: space-between; font-size: 4.3cqw; font-weight: 800; font-variant-numeric: tabular-nums; }
        .kido svg { height: 3.4cqw; fill: #fff; margin-right: .8cqw; }
        .kcsik { position: absolute; left: 30%; right: 25%; top: 74%; height: 1.4%; background: rgba(255,255,255,.2); border-radius: 1px; }
        .kcsik i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #e53935; border-radius: 1px; }
        .kcsik { cursor: pointer; touch-action: none; }
        .kcsik::before { content: ""; position: absolute; left: -3%; right: -3%; top: -700%; bottom: -700%; }
        .kcsik i::after { content: ""; position: absolute; right: -1px; top: -150%; width: 2px; height: 400%; background: #fff; border-radius: 1px; }
        .kform { position: absolute; left: 30%; right: 4%; top: 62.4%; height: 7%; display: flex; justify-content: flex-end; align-items: center; gap: 1.6cqw;
          font-size: 3.1cqw; font-weight: 700; color: #d9c08a; white-space: nowrap; }
        .kform .jel { color: #ce93d8; border: 1px solid #ce93d8; border-radius: 2px; padding: 0 .7cqw; font-size: 2.8cqw; line-height: 1.3; }
        .kform svg { height: 3.8cqw; fill: #ff4f7b; }
        .vuk { display: flex; flex-direction: row; align-items: center; gap: 8px; min-width: 0; min-height: 0; }
        .vu { flex: 1 1 0; min-width: 0; aspect-ratio: 176 / 106; border-radius: 8px; overflow: hidden; box-shadow: inset 0 0 0 1px #3a3b3e, 0 1px 0 rgba(255,255,255,.8), 0 2px 5px rgba(0,0,0,.35); background: #0b0b0c; padding: 3px; }
        .vu svg { width: 100%; height: 100%; display: block; }
        .vfd { display: none; flex: 1 1 0; min-width: 0; aspect-ratio: 320 / 128; box-sizing: border-box; border-radius: 4px; padding: 4% 4.5% 4.5%;
          background: linear-gradient(170deg, rgba(255,255,255,.06), transparent 35%), #050506;
          box-shadow: inset 0 0 0 2px #53575d, inset 0 0 18px rgba(0,0,0,.95), 0 1px 0 rgba(255,255,255,.8);
          flex-direction: column; gap: 6%; font-family: "Cantabile Sans", Arial, sans-serif; color: #e9edf0; }
        .vfdmod .vu { display: none; }
        /* tableten is a telefonos elrendezés: a két mutatós műszer egymás mellett; a kijelző (VFD vagy műszerek) teteje a kazetta tetejével
           egy vonalban, alatta jobbra a SLEEP gomb (a kezelősorban ilyenkor nincs SLEEP); telefonon a SLEEP marad a kezelősorban */
        .magno .felso { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
        /* tableten a kazetta és a gombsor egy tömbben (nincs nagy rés köztük); a maradék hely a tömb fölött és alatt oszlik meg */
        .elo.magno { grid-template-columns: minmax(0, 1fr) 192px; padding: 12px 10px; }
        .magno .felso { flex: 0 1 auto; margin-top: auto; }
        .magno .msor { margin-bottom: auto; }
        :host([keskeny]) .magno .felso { margin-top: 0; }
        :host([keskeny]) .magno .msor { margin-bottom: 0; }
        .mkij { display: flex; flex-direction: column; align-items: stretch; gap: 8px; min-width: 0; }
        .mkij .msleep { align-self: flex-end; }
        /* tableten a kijelző alatt egy sorban: SHUFFLE · REPEAT · FADE · SLEEP; telefonon a kezelősorban a SLEEP mellett */
        .mfunk { display: block; }
        /* öt egyforma funkciógomb (REPEAT · SHUFFLE · FADE · SLEEP · BT), a felirat a gomb alatt */
        .otg { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 6px; }
        .og { display: flex; flex-direction: column; align-items: stretch; gap: 3px; min-width: 0; }
        .og small { text-align: center; font: 700 7.5px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #3d4148; white-space: nowrap; }
        .og small .amar { letter-spacing: 0; color: #8a5a00; font-size: 8.5px; }
        .og.tiltva { opacity: .4; pointer-events: none; }
        .ogomb { position: relative; height: 34px; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 6px 0 0; display: flex; align-items: center; justify-content: center;
          color: #2b2e33; background: linear-gradient(180deg, #f6f7f8, #d0d4d9); box-shadow: 0 2px 0 #80858c; -webkit-tap-highlight-color: transparent; }
        .ogomb .led { position: absolute; top: 4px; left: 50%; width: 10px; height: 3px; margin-left: -5px; border-radius: 2px; background: #6b5a35; }
        .ogomb.be .led { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .ogomb i { display: flex; position: relative; }
        .ogomb .oszam { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 800 9.5px/1 "Cantabile Sans", Arial, sans-serif; color: #2b2e33; padding-top: 1px;
          text-shadow: 0 0 1px #e8eaed, 0 0 2px #e8eaed, 0 0 2px #e8eaed, 1px 0 1px #e8eaed, -1px 0 1px #e8eaed; }
        .ogomb .oszam.vegt { font-size: 12px; }
        .ogomb.be .oszam { color: #8a5a00; } .ogomb svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .ogomb:active { transform: translateY(1px); box-shadow: 0 1px 0 #80858c; }
        .mjobb > .otg { display: none; }
        /* forgó hangszóró-választó (magnó) */
        .valaszto { position: relative; }
        .valaszto .fhsz.ftop { transform: translate(-50%, -50%); }
        .valaszto .vvonal { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
        .valaszto .vvonal polyline { fill: none; stroke: #7d828a; stroke-width: 1; stroke-linejoin: round; }
        .vgomb { position: absolute; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; cursor: pointer;
          background: repeating-conic-gradient(#d8dbdf 0 5deg, #7d828a 5deg 10deg); box-shadow: 0 4px 8px rgba(0,0,0,.4), 0 0 0 1.5px #50545a; -webkit-tap-highlight-color: transparent; }
        .vsapka { position: absolute; inset: 5px; border-radius: 50%; transition: transform .35s cubic-bezier(.3,1.3,.5,1);
          background: conic-gradient(from 20deg, #f4f5f6, #a9aeb4 12%, #eceef0 25%, #9da2a8 38%, #f1f2f3 50%, #a2a7ad 62%, #e9ebed 75%, #9ca1a7 88%, #f4f5f6);
          box-shadow: inset 0 2px 2px rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.35); }
        .vsapka::after { content: ""; position: absolute; left: 50%; top: 4px; width: 3px; height: 11px; margin-left: -1.5px; border-radius: 2px; background: #1d1f22; }
        .valaszto .fhsz { position: absolute; transform: translateY(-50%); border: 0; background: none; padding: 3px 2px; display: flex; align-items: center; gap: 3px;
          white-space: nowrap; cursor: pointer; font: 700 10.4px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #6d7179; -webkit-tap-highlight-color: transparent; }
        .valaszto .fhsz .lamp { width: 5px; height: 5px; border-radius: 50%; background: #9a9fa6; box-shadow: inset 0 1px 1px rgba(0,0,0,.4); }
        .valaszto .fhsz.akt { color: #23262b; }
        .valaszto .fhsz .fn { line-height: 1.3; max-width: 101px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        /* oldalsó állások: a név kifelé nyúlik, a lámpa a gomb felőli oldalon – hosszú név sem csúszik a gomb alá */
        /* a lámpa a jelzővonal külső végén ül (nem a felirat mellett) */
        .valaszto .flamp { position: absolute; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%; pointer-events: none;
          background: #9a9fa6; box-shadow: inset 0 1px 1px rgba(0,0,0,.4); }
        .valaszto .flamp.akt { background: #ffb020; box-shadow: 0 0 5px #ffb020; }
        .magno .mjobb > .forgo .valaszto { zoom: .92; }
        :host([keskeny]) .magno .mjobb > .forgo .valaszto { zoom: .84; }
        .magno .mjobb .mfelirat { max-width: 66px; font-size: 7.5px; letter-spacing: .04em; }
        :host([keskeny]) .magno .mjobb .mfelirat { font-size: 8px; letter-spacing: .08em; }
        .forgo.bton .fhsz.akt { color: #8a8e94; } .forgo.bton .flamp.akt { background: #c9a14a; box-shadow: none; }
        .valaszto small { position: absolute; bottom: -4px; text-align: center; font: 700 7px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .25em; color: #3d4148; }
        .mfunk > button { min-width: 0; padding-inline: 2px; letter-spacing: .08em; }
        .fgomb.tiltva { opacity: .4; pointer-events: none; }
        .magno .kap .fgomb { display: none; }
        :host([keskeny]) .mkij .mfunk { display: none; }
        /* mobil: felül az öt gomb teljes szélességben, alattuk a hangerőgomb és mellette a forgó választó, legalul a RÁDIÓ / TAPE kapcsoló */
        :host([keskeny]) .magno .mjobb { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "otg otg" "hang kim" "kap kap"; justify-content: stretch; align-items: center; gap: 4px 8px; row-gap: 6px; }
        :host([keskeny]) .magno .mjobb > .kap { margin-top: 0; }
        :host([keskeny]) .magno .mjobb > .hangero { transform: translateY(var(--hgy, 0px)) scale(.72); margin: -25px -25px -25px -22px; }
        :host([keskeny]) .magno .mjobb > .otg { display: grid; grid-area: otg; align-self: end; margin-top: 4px; }
        :host([keskeny]) .magno .mjobb > .forgo { justify-self: center; align-self: center; }
        :host([keskeny]) .magno .kap .fgomb { display: flex; min-width: 0; letter-spacing: .1em; }
        .magno .kap .sleep { display: none; }
        :host([keskeny]) .mkij { display: contents; }
        :host([keskeny]) .mkij .msleep { display: none; }
        :host([keskeny]) .magno .kap .sleep { display: flex; }
        .vfdmod .vfd { display: flex; }
        /* a fluoreszcens kijelző mindenhol a telefonos változat kicsinyített/nagyított mása: arány 320:120, a méretek a kijelző
           szélességéhez kötve (cqw, a telefonos 360 px-es kijelzőből átszámolva); tableten a kazettával egyforma széles, mellette középen */
        .vfdmod .vuk { height: auto; }
        .vfdmod .vfd { container-type: inline-size; aspect-ratio: 320 / 120; height: auto; gap: 8%; padding: 5% 5% 6%; }
        .vfdmod .vfd .vszamok { flex: none; height: 13.5cqw; }
        .vfdmod .vfd .vmero { row-gap: 1.11cqw; }
        .vfdmod .vfd .vsor { column-gap: 1.11cqw; }
        .vfdmod .vfd .vsz { gap: .83cqw; }
        .vfdmod .vfd .szeg { height: 1.94cqw; gap: .56cqw; }
        .vfdmod .vfd .vsor b { font-size: 2.5cqw; }
        .vfdmod .vfd .vsor em { font-size: 2.08cqw; }
        .vfdmod .vfd .vskala { height: 2.78cqw; }
        .vfdmod .vfd .vskala span { font-size: 2.22cqw; }
        .vfdmod .vfd small { font-size: 2.22cqw; }
        .vfdmod .vfd .vall { width: 3.61cqw; height: 3.61cqw; }
        .vfdmod .vfd .vstop svg { max-height: 6.67cqw; min-height: 3.33cqw; }
        .vfd .vszamok { position: relative; }
        .vfd .vjelzo { position: absolute; top: .35cqw; left: 21%; right: 17%; height: 2.6cqw; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        .vfd .vjelzo i { display: flex; align-items: center; gap: .8cqw; height: 100%; font-style: normal; color: rgba(220,228,232,.12); }
        .vfd .vjelzo svg { height: 100%; width: auto; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; filter: none; }
        .vfd .vjelzo svg circle { fill: currentColor; stroke: none; }
        .vfd .vjelzo i small, .vfd .vjelzo i em { color: inherit; font: 700 2.1cqw/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; font-style: normal; }
        .vfd .vjelzo i em { font-size: 2.6cqw; letter-spacing: 0; }
        .vfd .vjelzo i.be { color: #eef2f4; filter: drop-shadow(0 0 3px rgba(225,235,240,.6)); }
        :host([keskeny]) .vfdmod .felso { align-items: stretch; }
        /* a számlálók magassága a maradék helyhez igazodik (flex 1 1 0), a szélesség a számjegyek arányából jön – nem lóghatnak a szintjelzőre */
        .vfd .vszamok { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: stretch; column-gap: 5%; overflow: hidden; }
        .vfd .vsz { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; min-height: 0; }
        .vfd .vsz:last-child { align-items: flex-end; }
        .vfd .vsz span { flex: 1 1 0; min-height: 0; display: flex; max-width: 100%; }
        .vfd .vsz:last-child span { order: 2; justify-content: flex-end; }
        /* jobb számláló: alvásidőzítőnél visszaszámlál, előtte stopperóra-ikon */
        .vfd .vsz .vidosor { order: 2; flex: 1 1 0; min-height: 0; max-width: 100%; display: flex; align-items: stretch; justify-content: flex-end; gap: 6%; }
        .vfd .vsz .vidosor span { flex: 1 1 0; min-width: 0; justify-content: flex-end; }
        .vfd .vstop { display: flex; align-items: center; flex: none; height: 100%; }
        .vfd .vstop svg { height: 46%; max-height: 24px; min-height: 12px; width: auto; fill: none; stroke: rgba(220,228,232,.12); stroke-width: 1.7; stroke-linecap: round; }
        /* a stopperóra csak futó alvásidőzítőnél világít, egyébként halvány, mint a nem világító szegmensek */
        .vfd .vstop.be svg { stroke: #eef2f4; filter: drop-shadow(0 0 3px rgba(225,235,240,.6)); }
        .vfd .vsz svg { display: block; height: 100%; width: auto; max-width: 100%; overflow: visible; filter: drop-shadow(0 0 3px rgba(225,235,240,.45)); }
        .vfd .vall { align-self: center; }
        .vfd .vsz svg rect, .vfd .vsz svg circle { fill: rgba(220,228,232,.07); }
        .vfd .vsz svg .be { fill: #eef2f4; }
        .vfd small { font-size: 6.5px; letter-spacing: .18em; color: #7d858b; font-weight: 700; }
        .vfd .vall { width: 10px; height: 10px; }
        .vfd .vall svg { width: 100%; height: 100%; fill: #eef2f4; filter: drop-shadow(0 0 3px rgba(225,235,240,.6)); }
        .vfd .vmero { flex: none; display: grid; row-gap: 2px; }
        .vfd .vsor { display: grid; grid-template-columns: 9% 1fr 11%; align-items: center; column-gap: 4px; }
        .vfd .vsor b { font-size: 7px; font-weight: 700; color: #b9c1c6; letter-spacing: .05em; }
        .vfd .vsor em { font-style: normal; font-size: 6px; font-weight: 700; letter-spacing: .08em; color: #ff4a3d; opacity: .35; }
        .vfd .vsor em.be { opacity: 1; text-shadow: 0 0 4px rgba(255,74,61,.7); }
        .vfd .szeg { display: flex; gap: 1.5px; height: 4px; }
        .vfd .szeg i { flex: 1; background: rgba(220,228,232,.08); }
        .vfd .szeg i.p { background: rgba(255,74,61,.14); }
        .vfd .szeg i.be { background: #eef2f4; box-shadow: 0 0 3px rgba(225,235,240,.7); }
        .vfd .szeg i.p.be { background: #ff4a3d; box-shadow: 0 0 3px rgba(255,74,61,.8); }
        .vfd .vskala { position: relative; height: 8px; }
        .vfd .vskala span { position: absolute; top: 0; transform: translateX(-50%); font-size: 6.5px; font-weight: 600; color: #aeb6bb; }
        .vfd .vskala span.p { color: #ff6a5e; }
        .vfd .vskala span:first-child { transform: none; }
        .vfd .vskala span:last-child { transform: translateX(-100%); }
        .vlap { fill: #e4e1d8; transition: fill .8s; }
        .fut .vlap, .szun .vlap { fill: #fbf8ef; }
        .vu text { font: 500 7.4px/1 "Cantabile Sans", Arial, sans-serif; text-anchor: middle; dominant-baseline: middle; }
        .vu .vfel { font: 500 10px/1 "Cantabile Sans", Arial, sans-serif; fill: #111; }
        .vu .vmarka { font: 400 15px/1 "Great Vibes", "Brush Script MT", cursive; fill: #1a1a1a; }
        .vu .vapro text { font: 600 4.3px/1 "Cantabile Sans", Arial, sans-serif; fill: #222; text-anchor: start; letter-spacing: .02em; }
        .vu .vapro text[text-anchor=end] { text-anchor: end; }
        .tu { transform-origin: 85px 128px; transform: rotate(-42deg); }

        .mjobb .mfelirat { font: 700 8px/1.3 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; color: #5b6068; text-align: center; }
        .mjobb .mfelirat b { display: block; color: #2b2e33; letter-spacing: .1em; font-size: 10px; max-width: 92px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .fogas { margin-left: 8px; border: 0; background: none; padding: 2px; width: 22px; height: 22px; cursor: pointer; border-radius: 50%; align-self: center;
          -webkit-tap-highlight-color: transparent; }
        .fogas svg { width: 16px; height: 16px; fill: #6d7179; display: block; margin: auto; }
        .fogas:active { background: rgba(0,0,0,.08); }

        /* beállítások (űrlap) */
        .beall { position: absolute; inset: 6px 12px; z-index: 8; border-radius: 6px; display: flex; flex-direction: column;
          background: #f4f1ea; color: #2b2622; box-shadow: inset 0 0 0 1px #8a7a62; font: 13px/1.35 "Cantabile Sans", Arial, sans-serif; }
        .beall[hidden] { display: none; }
        .bfej { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #d8cfbd; }
        .bfej b { font: 400 24px/1 "Great Vibes", cursive; color: #6b3d20; }
        .bfej span { flex: 1; color: #6a5f4e; font-size: 12px; }
        .bfej button, .bgomb { border: 1px solid #b9ad97; background: #fffdf8; color: #2b2622; border-radius: 4px; padding: 5px 12px; cursor: pointer; font: 600 12px/1.2 "Cantabile Sans", Arial, sans-serif; }
        .bfej .ment { background: #6b3d20; color: #fff; border-color: #6b3d20; }
        .btest { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 10px 12px 14px; display: grid; gap: 14px; align-content: start; }
        .bresz { display: grid; gap: 6px; }
        .bresz h3 { margin: 0; font: 700 11px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #6a5f4e; display: flex; align-items: center; gap: 8px; }
        .bresz h3 .bgomb { margin-left: auto; letter-spacing: 0; text-transform: none; padding: 3px 9px; }
        .bsor { display: grid; gap: 6px; align-items: center; }
        .bfigy { margin: 0 0 4px; padding: 7px 9px; border-radius: 6px; font-size: 12.5px; line-height: 1.35; color: #5a3a00; background: #fff1d2; border: 1px solid #f0b54a; }
        .bfigy .bgomb { margin-left: 6px; padding: 3px 9px; }
        .btipp { margin: -2px 0 4px; font-size: 12px; line-height: 1.35; color: #7a7064; }
        .bsor.ado { grid-template-columns: 1.3fr .8fr 70px 2.4fr auto auto; }
        .bsor.hsz2 { grid-template-columns: 1fr .7fr 2fr 1fr auto; }
        .bsor.ket { grid-template-columns: 150px 1fr; }
        .bsor input, .bsor select { width: 100%; box-sizing: border-box; border: 1px solid #c9bfa9; border-radius: 4px; padding: 5px 7px; font: 13px/1.2 "Cantabile Sans", Arial, sans-serif;
          background: #fffdf8; color: #2b2622; min-width: 0; }
        .bsor input.rossz { border-color: #c62828; background: #fff1f0; }
        .bsor label { color: #6a5f4e; font-size: 12px; }
        .bfejlec { display: grid; gap: 6px; font: 600 10px/1 "Cantabile Sans", Arial, sans-serif; color: #8a7d68; letter-spacing: .05em; }
        .bfejlec.ado { grid-template-columns: 1.3fr .8fr 70px 2.4fr auto auto; } .bfejlec.hsz2 { grid-template-columns: 1fr .7fr 2fr 1fr auto; }
        .bx { border: 0; background: none; color: #a33; font: 700 16px/1 "Cantabile Sans", Arial; cursor: pointer; padding: 2px 6px; }
        .bproba { border: 1px solid #b9ad97; background: #fffdf8; border-radius: 4px; cursor: pointer; padding: 4px 8px; font: 12px/1 "Cantabile Sans", Arial; color: #2b2622; }
        .bker { display: flex; gap: 6px; }
        .bker input { flex: 1; }
        .btalalat { display: grid; gap: 4px; }
        .btalalat div { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; padding: 4px 6px; background: #fffdf8; border: 1px solid #e3dac8; border-radius: 4px; }
        .btalalat small { color: #8a7d68; white-space: nowrap; }
        .btalalat em { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bmeg { color: #8a7d68; font-size: 12px; margin: 0; }
        .bhiba { color: #b3261e; font-size: 12px; min-height: 1em; }

        /* kazetta-polc */
        .polc { position: absolute; inset: 0; z-index: 5; border-radius: 6px; display: flex; flex-direction: column; padding: 10px 12px; gap: 8px;
          background: linear-gradient(180deg, #4a2c17, #2f1b0d); box-shadow: inset 0 0 0 1px #1d1008; }
        .polc[hidden] { display: none; }
        .kcim.dalos, #cim.dalos { cursor: pointer; }
        #cim.dalos { text-decoration: underline dotted rgba(185,217,255,.55); text-underline-offset: 3px; }
        .dalpolc { z-index: 6; }
        .dalpolc .dlista { flex: 1; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #8a6a45 transparent;
          text-align: center; padding: 10px 4px; mask-image: linear-gradient(180deg, transparent, #000 14%, #000 86%, transparent); }
        .dalpolc .dlista p { margin: 0; padding: 5px 0; color: #cdb995; font: 600 17px/1.35 "Cantabile Sans", Arial, sans-serif; transition: color .3s, transform .3s; }
        .dalpolc .dlista.szinkron p { opacity: .55; }
        .dalpolc .dlista.szinkron p.most { opacity: 1; color: #ffd892; transform: scale(1.06); text-shadow: 0 0 10px rgba(255,190,90,.35); }
        .dalpolc .dlista p.szunet { font-size: 13px; letter-spacing: .3em; }
        .dalpolc .duzenet { margin: auto; color: #cdb995; font: 500 14px/1.4 "Cantabile Sans", Arial, sans-serif; text-align: center; }
        .dalpolc .dlab { display: flex; justify-content: space-between; gap: 10px; color: #8f7a58; font: 500 10.5px/1.2 "Cantabile Sans", Arial, sans-serif; letter-spacing: .04em; }
        :host([keskeny]) .dalpolc .dlista p { font-size: 15px; }
        .pfej { display: flex; align-items: center; gap: 8px; }
        .pful { border: 0; border-radius: 3px; padding: 6px 12px; cursor: pointer; font: 700 11px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .12em;
          color: #e9dcc4; background: rgba(255,255,255,.08); }
        .pful.akt { background: #e9dcc4; color: #2f1b0d; }
        .put { flex: 1; min-width: 0; color: #cdb995; font: 500 12px/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .put button { border: 0; background: none; color: #ffd892; cursor: pointer; font: 700 12px/1 "Cantabile Sans", Arial, sans-serif; padding: 4px 6px 4px 0; }
        .pkeres { width: 100%; box-sizing: border-box; border: 1px solid rgba(233,220,196,.35); border-radius: 15px; padding: 6px 12px; background: rgba(0,0,0,.25);
          color: #f3e8d4; font: 500 13px/1.2 "Cantabile Sans", Arial, sans-serif; outline: none; }
        .pkeres::placeholder { color: #a88f6b; }
        .pkeres:focus { border-color: #ffd892; }
        .kcsop { margin: 10px 0 6px; color: #cdb995; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; display: flex; gap: 8px; }
        .kcsop:first-child { margin-top: 2px; }
        .kcsop span { color: #8a6a45; letter-spacing: 0; }
        :host([keskeny]) .pfej { flex-wrap: wrap; }
        :host([keskeny]) .pfej .put { order: 5; flex: 1 0 100%; }
        .ktalal { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; }
        .ktalal button:not(.sm) { text-align: left; border: 0; border-radius: 3px; padding: 6px 8px; cursor: pointer; background: rgba(255,255,255,.06); color: #f3e8d4;
          display: grid; gap: 2px; min-width: 0; }
        .ktalal button:not(.sm) b { font: 600 12.5px/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ktalal button:not(.sm) small { color: #a88f6b; font: 500 11px/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ktalal button:not(.sm):active, .eloadok button:active { background: rgba(255,216,146,.18); }
        .sorfej { color: #cdb995; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; margin: 2px 0 8px; }
        .sorlista { display: grid; gap: 3px; }
        .sorlista button:not(.sm) { display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: center; gap: 8px; text-align: left; border: 0; border-radius: 3px;
          padding: 5px 8px; cursor: pointer; background: rgba(255,255,255,.05); color: #f3e8d4; }
        .sorlista .sn { color: #a88f6b; font: 600 11px/1 "Cantabile Sans", Arial, sans-serif; text-align: right; font-variant-numeric: tabular-nums; }
        .sorlista .st { display: grid; gap: 2px; min-width: 0; }
        .sorlista b { font: 600 12.5px/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sorlista small { color: #a88f6b; font: 500 11px/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sorlista button:not(.sm).akt { background: rgba(255,216,146,.2); box-shadow: inset 3px 0 0 #ffd892; }
        .sorlista button:not(.sm).akt .sn { color: #ffd892; }
        .sorlista button:not(.sm):active { background: rgba(255,216,146,.28); }
        .sorgomb { cursor: pointer; }
        .sorsor, .ktsor { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px; align-items: stretch; }
        .sorsor > button { width: 100%; }
        .huzhato .sorsor { grid-template-columns: 24px minmax(0, 1fr) auto; position: relative; }
        .sorsor .foga { display: grid; align-content: center; justify-items: center; gap: 3px; cursor: grab; touch-action: none; border-radius: 3px;
          background: rgba(255,255,255,.04); }
        .sorsor .foga i { display: block; width: 12px; height: 2px; border-radius: 1px; background: #a88f6b; }
        .sorsor .foga:active { cursor: grabbing; background: rgba(255,216,146,.2); }
        .sorsor.huz { z-index: 3; box-shadow: 0 0 0 4px #4a2c17, 0 8px 20px rgba(0,0,0,.6); background: #4a2c17; border-radius: 3px; transition: none; }
        .sorsor.ide::before, .sorsor.ideala::after { content: ""; position: absolute; left: 0; right: 0; height: 3px; border-radius: 2px; background: #ffd892; box-shadow: 0 0 6px rgba(255,216,146,.7); }
        .sorsor.ide::before { top: -3px; } .sorsor.ideala::after { bottom: -3px; }
        .sorsor.akt .sorm { display: none; }
        .sorm { display: flex; gap: 3px; }
        .sorm .sm { border: 0; border-radius: 3px; min-width: 34px; padding: 0 8px; cursor: pointer; background: rgba(255,255,255,.07); color: #cdb995;
          font: 700 13px/1 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; }
        .sorm .sm svg { width: 14px; height: 14px; display: block; margin: auto; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
        .sorm .sm.biztos { background: #b8402f; color: #fff; font-size: 10px; letter-spacing: .04em; }
        .sorm .sm:active { background: rgba(255,216,146,.28); }
        .sorfej span { text-transform: none; letter-spacing: 0; color: #a88f6b; font-weight: 500; }
        .pzar { border: 0; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; background: rgba(255,255,255,.1); color: #e9dcc4; font: 400 22px/1 "Cantabile Sans", Arial, sans-serif; padding: 0; }
        .ptest { flex: 1; min-height: 0; display: flex; gap: 8px; }
        .betuk { display: flex; flex-direction: column; flex-wrap: wrap; gap: 1px; align-content: flex-start; width: 46px; }
        .betuk button { width: 22px; height: 15px; border: 0; padding: 0; background: none; color: #cdb995; font: 700 10px/15px "Cantabile Sans", Arial, sans-serif; cursor: pointer; }
        .betuk button:active { color: #ffd892; }
        .plista { flex: 1; min-width: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #8a6a45 transparent; }
        .eloadok { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px; }
        .eloadok button { text-align: left; border: 0; border-radius: 3px; padding: 7px 8px; cursor: pointer; background: rgba(255,255,255,.06);
          color: #f1e6cf; font: 500 12px/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kazettak { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px 8px; }
        .kt { border: 0; padding: 0; background: none; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; }
        .kt .test { position: relative; height: 70px; border-radius: 5px; background: #2d2f33; box-shadow: 0 3px 6px rgba(0,0,0,.5), inset 0 0 0 1px #17181a; overflow: hidden; }
        .kt .cl { position: absolute; left: 6px; right: 6px; top: 5px; bottom: 18px; border-radius: 2px; background: #f3ecdb; overflow: hidden; display: flex; }
        .kt .cl img { width: 47px; height: 100%; object-fit: cover; flex: none; }
        .kt .cl span { flex: 1; min-width: 0; padding: 0 5px; font: 700 10px/1.15 "Cantabile Sans", Arial, sans-serif; color: #2b2622; display: flex; align-items: center;
          border-top: 9px solid var(--szin); overflow: hidden; }
        .kt .ab { position: absolute; left: 34%; right: 34%; bottom: 5px; height: 9px; border-radius: 5px; background: #0d0d0e; }
        .kt:active .test { transform: translateY(2px); }
        .kt small { display: block; margin-top: 4px; color: #cdb995; font: 500 10px/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .puzenet { color: #cdb995; font: 500 13px/1.4 "Cantabile Sans", Arial, sans-serif; padding: 16px 6px; }
        .tel { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
        .tblokk { display: grid; gap: 8px; align-content: start; padding: 10px 12px; border-radius: 5px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
        .tblokk h4 { margin: 0; font: 700 10px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .16em; color: #e9dcc4; }
        .tblokk p { margin: 0; font: 500 12px/1.4 "Cantabile Sans", Arial, sans-serif; color: #cdb995; }
        .tblokk .puzenet { padding: 4px 0; font-size: 12px; }
        .tsor { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .tgomb { border: 0; border-radius: 3px; padding: 8px 14px; cursor: pointer; font: 700 12px/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .04em; background: #e9dcc4; color: #2f1b0d; }
        .tgomb.halk { background: rgba(255,255,255,.08); color: #e9dcc4; font-weight: 600; }
        .tgomb.biztos { background: #b3261e; color: #fff; }
        .tgomb:disabled { opacity: .5; cursor: default; }
        .tall { font: 500 11px/1.3 "Cantabile Sans", Arial, sans-serif; color: #ffd892; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* keskeny (telefon, < 600 px): álló elrendezés, a kártya magassága a tartalomhoz igazodik */
        :host([keskeny]) { height: auto; }
        :host([keskeny]) ha-card { height: auto; padding: 0 8px; }
        :host([keskeny]) .elo { position: relative; inset: auto; margin: 6px 0; display: flex; flex-direction: column; gap: 12px; padding: 16px 12px 14px; }
        :host([keskeny]) .elo.rejt { display: none; }
        :host([keskeny]) .bal { display: contents; }
        :host([keskeny]) .fej { order: 1; flex-wrap: wrap; row-gap: 14px; min-height: 18px; }
        :host([keskeny]) .fej .marka { font-size: 27px; }
        :host([keskeny]) .fej .tipus { font-size: 17px; margin-left: 8px; }
        :host([keskeny]) .fej .hszfej { display: none; }
        :host([keskeny]) .fej .fogas { margin-left: auto; }
        :host([keskeny]) .skala { order: 2; flex: none; height: 132px; min-height: 0; }
        :host([keskeny]) .sav { left: 10px; right: 10px; }
        :host([keskeny]) .skala { grid-template-columns: 70px minmax(0, 1fr) 34px; gap: 6px; padding: 6px; }
        :host([keskeny]) .sz.ptl { display: none; }
        :host([keskeny]) .jfel { font-size: 8px; }
        :host([keskeny]) .sz { font-size: 10px; }
        :host([keskeny]) .kiir { font-size: 12px; }
        :host([keskeny]) .felso { order: 2; flex: none; display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
        :host([keskeny]) .ablak { width: 100%; height: auto; }
        :host([keskeny]) .vfd { aspect-ratio: 320 / 110; }
        :host([keskeny]) .gombsor { order: 3; height: auto; flex-wrap: wrap; gap: 14px 7px; padding-bottom: 5px; }
        :host([keskeny]) .bill { flex: 1 1 calc(33.333% - 5px); height: 58px; }
        :host([keskeny]) .jobb, :host([keskeny]) .mjobb { order: 4; grid-template-areas: "hang kim" "kap kap"; justify-content: space-evenly; gap: 6px 4px; }
        :host([keskeny]) .jobb > .hangero, :host([keskeny]) .mjobb > .hangero { transform: scale(.8); margin: -18px; }
        :host([keskeny]) .kap { flex-direction: row; justify-content: center; align-items: center; gap: 18px; flex-wrap: wrap; }
        :host([keskeny]) .kap .valto { flex-direction: row; gap: 6px; }
        :host([keskeny]) .kap .kapcs { width: 40px; height: 18px; }
        :host([keskeny]) .kap .kapcs::after { left: 2px; top: 2px; width: 18px; height: 14px; transition: left .2s; }
        :host([keskeny]) .magno .kap .kapcs::after { left: 20px; top: 2px; }
        :host([keskeny]) .polc { padding: 10px 8px; }
        :host([keskeny]) .betuk { width: 24px; }
        :host([keskeny]) .eloadok { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
        :host([keskeny]) .kazettak { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        :host([keskeny]) .beall { inset: 6px 0; }
        :host([keskeny]) .bfej span { display: none; }
        :host([keskeny]) .bfej b { flex: 1; }
        :host([keskeny]) .bfejlec { display: none; }
        :host([keskeny]) .bsor.ado { grid-template-columns: 1fr 1fr 74px; padding-bottom: 8px; border-bottom: 1px solid #e3dac8; }
        :host([keskeny]) .bsor.ado input[data-m=url] { grid-column: 1 / -1; }
        :host([keskeny]) .bsor.ado .bproba { justify-self: start; }
        :host([keskeny]) .bsor.ado .bx { grid-column: 3; justify-self: end; }
        :host([keskeny]) .bsor.hsz2 { grid-template-columns: 1fr 1fr 1fr auto; }
        :host([keskeny]) .bsor.hsz2 select[data-m=entity] { grid-column: 1 / -1; grid-row: 2; }
        :host([keskeny]) .bsor.ket { grid-template-columns: 1fr; gap: 3px; }
        :host([keskeny]) .bker { flex-wrap: wrap; }
        :host([keskeny]) .bker input { flex: 1 1 100%; }
        :host([keskeny]) .btalalat div { grid-template-columns: 1fr auto; }
        :host([keskeny]) .btalalat small { grid-column: 1; grid-row: 2; }
        :host([keskeny]) .btalalat .bgomb { grid-row: 1 / 3; grid-column: 2; }
        /* rádió 1.3.0: fél magas állomásgombok 6 × 2 helyen (telefonon 4 × 3), jobb oldalt POWER + RADIO/TAPE balra fent,
           hangerő, alatta BT · NET · SLEEP ikonos gombok, legalul a SPEAKERS forgókapcsoló */
        .elo:not(.magno) .adosor { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); height: 74px; gap: 6px 7px; }
        .adosor .bill { flex: none; height: auto; padding: 7px 3px 1px; flex-direction: column; justify-content: center; align-items: center; gap: 1px; box-shadow: 0 3px 0 #80858c, 0 4px 6px rgba(0,0,0,.25); }
        .adosor .bill .led { top: 3px; width: 12px; height: 3px; margin-left: -6px; }
        .adosor .bill b { font-size: 11.5px; line-height: 1.05; }
        .adosor .bill small { font-size: 9px; line-height: 1; flex: none; }
        .adosor .bill.akt, .adosor .bill:active { transform: translateY(2px); box-shadow: 0 1px 0 #80858c, 0 2px 3px rgba(0,0,0,.25); }
        .adosor .adoures { background: linear-gradient(180deg, #eceef0, #d6dade); border-style: dashed; border-color: #a3a8af; box-shadow: 0 2px 0 #9ca1a8; align-items: center; padding: 0; }
        .adosor .adoures .plusz { font: 300 20px/1 "Cantabile Sans", Arial, sans-serif; color: #8a8f97; }
        .jobb.rjobb { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "rbal hang" "otg otg" "kim kim"; justify-content: stretch; align-content: space-between; align-items: center; gap: 2px 4px; }
        .rjobb > .rbal { grid-area: rbal; display: flex; flex-direction: column; align-items: center; gap: 12px; align-self: start; padding-top: 4px; }
        .rjobb > .hangero { grid-area: hang; justify-self: center; transform: scale(.74); margin: -24px; }
        .rjobb > .rotg { grid-area: otg; }
        .rjobb > .forgo { grid-area: kim; justify-self: center; }
        .rjobb > .forgo .valaszto { zoom: .86; }
        :host([keskeny]) .elo:not(.magno) .adosor { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 39px; height: auto; gap: 9px 6px; order: 3; padding-bottom: 4px; }
        :host([keskeny]) .elo:not(.magno) .adosor .bill { height: 39px; flex-direction: column; align-items: center; gap: 2px; padding: 9px 2px 2px; }
        :host([keskeny]) .elo:not(.magno) .adosor .bill b { font-size: 12px; }
        :host([keskeny]) .jobb.rjobb { order: 4; grid-template-columns: auto auto minmax(0, 1fr); grid-template-areas: "rbal hang otg" "rbal hang kim"; justify-content: stretch; align-content: center; gap: 2px 4px; }
        /* telefonos rádió, kétoldalas választó (ötnél több hangszóró): a választó külön sorba, teljes szélességben */
        :host([keskeny]) .jobb.rjobb:has(> .forgo.ket) { grid-template-areas: "rbal hang otg" "kim kim kim"; }
        :host([keskeny]) .rjobb > .forgo.ket { justify-self: center; }
        :host([keskeny]) .rjobb > .forgo.ket .valaszto { zoom: .95; }
        :host([keskeny]) .magno .mjobb > .forgo.ket .valaszto { zoom: .8; }
        :host([keskeny]) .rjobb > .rbal { align-self: center; padding-top: 0; }
        :host([keskeny]) .rjobb > .hangero { transform: scale(.68); margin: -28px; }
        :host([keskeny]) .rjobb > .rotg { align-self: end; }
        :host([keskeny]) .rjobb > .forgo { align-self: start; }
        :host([keskeny]) .rjobb > .forgo .valaszto { zoom: .78; }
        :host([keskeny]) .rotg .og-net { order: 1; } :host([keskeny]) .rotg .og-sleep { order: 2; } :host([keskeny]) .rotg .og-bt { order: 3; }
        :host([magas]) ha-card { grid-template-rows: auto; align-content: center; }
        :host([magas]) .elo { height: auto; aspect-ratio: 2.3; max-height: 100%; }
        /* üzenetablak: külön réteg a kártya fölött – füstüveg, borostyán szegély, Michroma fejléc, Exo 2 szöveg, fogyó időcsík */
        .uzreteg { position: absolute; left: 0; right: 0; z-index: 60; display: flex; justify-content: center; pointer-events: none; transform: translateY(-50%); }
        .uzablak { pointer-events: none; opacity: 0; transform: translateY(-12px) scale(.97); transition: opacity .35s ease, transform .45s cubic-bezier(.2,1.2,.4,1);
          position: relative; overflow: hidden; box-sizing: border-box; width: min(86%, 440px); padding: 11px 16px 13px; border-radius: 7px; cursor: pointer;
          background: linear-gradient(180deg, rgba(30,32,36,.94), rgba(10,11,13,.96)); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,176,32,.38);
          box-shadow: 0 14px 34px rgba(0,0,0,.55), 0 0 22px rgba(255,160,40,.14), inset 0 1px 0 rgba(255,255,255,.09); -webkit-tap-highlight-color: transparent; }
        .uzablak.lat { opacity: 1; transform: none; pointer-events: auto; }
        .uzablak.zar { opacity: 0; transform: translateY(6px) scale(.98); transition: opacity .6s ease, transform .6s ease; }
        .uzfej { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font: 400 8.5px/1 Michroma, "Cantabile Sans", Arial, sans-serif;
          letter-spacing: .32em; color: rgba(255,190,90,.78); }
        .uzfej i { width: 6px; height: 6px; border-radius: 50%; background: #ffb020; box-shadow: 0 0 6px #ffb020; animation: uzpislog 1.6s ease-in-out infinite; }
        .uzszoveg { font: 500 14.5px/1.4 "Exo 2", "Cantabile Sans", Arial, sans-serif; letter-spacing: .015em; color: #f3ead8; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
        .uzido { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform-origin: left center;
          background: linear-gradient(90deg, rgba(255,176,32,.25), #ffb020); box-shadow: 0 0 6px rgba(255,176,32,.7); }
        @keyframes uzfogy { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes uzpislog { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        :host([keskeny]) .uzszoveg { font-size: 13.5px; }
        /* fekete előlap (finish: black): a 90-es évek fekete, finoman húzott alumínium előlapja – világos feliratok, sötét gombok és tárcsák;
           a kijelzők, a kazetta és a lámpák színe nem változik */
        :host([fekete]) .elo {
          /* húzott fekete: vízszintes, nagyon sűrű és halvány hajszálvonalak (1–2 px-es periódus, egy szabálytalanabb réteggel), mélyfekete alap */
          background:
            repeating-linear-gradient(180deg, rgba(255,255,255,.022) 0 1px, transparent 1px 2px),
            repeating-linear-gradient(180deg, transparent 0 2px, rgba(0,0,0,.28) 2px 3px, transparent 3px 5px, rgba(255,255,255,.012) 5px 6px, transparent 6px 7px),
            linear-gradient(90deg, rgba(255,255,255,.015), transparent 30%, rgba(255,255,255,.025) 60%, transparent),
            linear-gradient(180deg, #161719, #0d0e0f 55%, #09090a);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 -2px 0 rgba(0,0,0,.6), 0 0 0 1px #050506; }
        :host([fekete]) .fej, :host([fekete]) .fej .tipus { color: #c9ccd1; text-shadow: none; }
        :host([fekete]) .fej .marka { color: #eceef1; text-shadow: 0 1px 0 rgba(0,0,0,.8); }
        :host([fekete]) .fej .hszfej, :host([fekete]) .hcim span, :host([fekete]) .tnevek button, :host([fekete]) .mjobb .mfelirat { color: #9a9ea5; }
        :host([fekete]) .giro small, :host([fekete]) .toloo small, :host([fekete]) .valaszto .fhsz { color: #8d9198; }
        :host([fekete]) .bsz, :host([fekete]) .hcim, :host([fekete]) .valaszto small, :host([fekete]) .og small, :host([fekete]) .be .tap .stereo,
        :host([fekete]) .valaszto .fhsz.akt, :host([fekete]) .mjobb .mfelirat b, :host([fekete]) .elo:not(.magno) .vr, :host([fekete]) .magno .vm { color: #e4e6ea; }
        :host([fekete]) .forgo.bton .fhsz.akt, :host([fekete]) .bton .thsz .tnevek button.akt { color: #9a9ea5; }
        :host([fekete]) .bj { background: #9a9ea5; }
        :host([fekete]) .valaszto .vvonal polyline { stroke: #6b6f76; }
        :host([fekete]) .valaszto .flamp:not(.akt) { background: #44474d; box-shadow: inset 0 1px 1px rgba(0,0,0,.7); }
        /* a kazettaajtó két széle és a kijelzők pereme is fekete (az ezüst krómléc és a fehér él helyett) */
        :host([fekete]) .ajto .krom { background: linear-gradient(90deg, #050506, #3a3d42 35%, #16171a 55%, #44474c 75%, #050506); box-shadow: 0 0 2px rgba(0,0,0,.9); }
        :host([fekete]) .ablak { box-shadow: inset 0 0 0 1px #000, inset 0 6px 14px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.07), 0 0 0 2px #050506; }
        :host([fekete]) .vfd { box-shadow: inset 0 0 0 2px #0b0c0d, inset 0 0 18px rgba(0,0,0,.95), 0 1px 0 rgba(255,255,255,.07), 0 0 0 1px #000; }
        :host([fekete]) .skala { box-shadow: inset 0 2px 6px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.08), 0 0 0 2px #000; }
        :host([fekete]) .nincsado { border-color: #5a5e65; color: #9a9ea5; }
        /* nyomógombok: fekete, enyhén domború billentyűk világos felirattal */
        :host([fekete]) .bill, :host([fekete]) .sleep, :host([fekete]) .fgomb, :host([fekete]) .power, :host([fekete]) .ogomb, :host([fekete]) .hsz {
          color: #dfe2e6; border-color: #050506; background: linear-gradient(180deg, #45484e, #2a2c30 55%, #1d1f22); }
        :host([fekete]) .bill { box-shadow: 0 5px 0 #08090a, 0 6px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12); }
        :host([fekete]) .sleep, :host([fekete]) .fgomb, :host([fekete]) .ogomb { box-shadow: 0 2px 0 #08090a, inset 0 1px 0 rgba(255,255,255,.12); }
        :host([fekete]) .power { box-shadow: 0 3px 0 #08090a, inset 0 1px 0 rgba(255,255,255,.12); }
        :host([fekete]) .hsz { border-right-color: #0b0c0d; }
        :host([fekete]) .ogomb .oszam { color: #dfe2e6; }
        :host([fekete]) .mbill { background: linear-gradient(180deg, #3e4146 0%, #26282c 55%, #18191c 100%);
          box-shadow: 0 0 0 1px #050506, 0 3px 0 #08090a, 0 4px 5px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12); }
        :host([fekete]) .mg small { color: #c9ccd1; } :host([fekete]) .mg small svg { fill: #c9ccd1; }
        :host([fekete]) .msor { background: linear-gradient(180deg, #0c0d0f, #1a1b1e); box-shadow: inset 0 2px 4px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.08); }
        :host([fekete]) .bill small { color: #9a9ea5; }
        :host([fekete]) .mg.akt .mbill, :host([fekete]) .mg:active .mbill, :host([fekete]) .mg.lenyomva .mbill { box-shadow: 0 0 0 1px #050506, 0 1px 2px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1); }
        :host([fekete]) .bill.akt, :host([fekete]) .bill:active { box-shadow: 0 1px 0 #08090a, 0 2px 3px rgba(0,0,0,.5); background: linear-gradient(180deg, #34373c, #1c1e21); }
        :host([fekete]) .sleep:active, :host([fekete]) .fgomb:active, :host([fekete]) .ogomb:active { box-shadow: 0 1px 0 #08090a; }
        /* tárcsák: fekete recézés, sötét eloxált sapka, fehér jelölő */
        :host([fekete]) .gomb { background: repeating-conic-gradient(#3a3d42 0 2.5deg, #0e0f11 2.5deg 5deg); box-shadow: 0 6px 12px rgba(0,0,0,.6), 0 0 0 2px #000; }
        :host([fekete]) .vgomb { background: repeating-conic-gradient(#3a3d42 0 5deg, #0e0f11 5deg 10deg); box-shadow: 0 4px 8px rgba(0,0,0,.6), 0 0 0 1.5px #000; }
        :host([fekete]) .sapka, :host([fekete]) .vsapka {
          background: conic-gradient(from 20deg, #4a4d53, #1f2124 12%, #44474c 25%, #1b1d20 38%, #4d5056 50%, #1d1f22 62%, #45484d 75%, #1c1e21 88%, #4a4d53);
          box-shadow: inset 0 2px 2px rgba(255,255,255,.18), inset 0 -3px 5px rgba(0,0,0,.6); }
        :host([fekete]) .sapka::after, :host([fekete]) .vsapka::after { background: #e8eaed; }
        :host([fekete]) .tfog { background: linear-gradient(180deg, #4a4d52, #222427 45%, #3a3d42 55%, #17181b); box-shadow: 0 0 0 1px #000, 0 2px 3px rgba(0,0,0,.6); }
        :host([fekete]) .tfog::after { background: #c9ccd1; }
      </style>
      <ha-card>
        <div class="elo" id="elo">
          <div class="bal">
            <div class="fej"><span class="marka">${ESC(c.marka || "Cantabile")}</span><span class="tipus">Stereophonic Receiver</span><span class="hszfej"></span><button class="fogas" title="${T("Beállítások")}">${IKON.fogas}</button></div>
            <div class="skala">
              <div class="feny"></div>
              <div class="jelm">${jelmero}<span class="jfel" id="jfel"></span><span class="stereo"><i></i>STEREO</span></div>
              <div class="skkoz">
                <span class="mertek">FM</span><span class="mertek j2">MHz</span>
                <div class="sav"><div class="vonal"></div>${jelek}${adojel}<div class="mutato" id="mutato" style="left:${POZ(c.adok[0]?.frekvencia ?? 98)}%"></div></div>
                <div class="kiir"><span id="ado"></span><span id="cim"></span></div>
              </div>
              <div class="giro" id="giro" title="${T("Hangolás: húzd oldalra vagy görgess")}"><div class="kerek" id="kerek"></div><small>TUNING</small></div>
            </div>
            <div class="gombsor adosor">${gombok}</div>
          </div>
          <div class="jobb rjobb">
            <div class="rbal"><button class="power" id="power">POWER</button>${valto}</div>
            ${hangero}
            <div class="otg rotg">${btIdx >= 0 ? og("bt", T("BT: ezen a készüléken szól (újra koppintva vissza a hangszóróra)"), "BT") : ""}${og("net", T("Internetes rádióadók (Radio Browser)"), "NET")}${og("sleep", T("Időzített kikapcsolás: 15 · 30 · 45 · 60 · 90 perc · ki"), "SLEEP")}</div>
            ${forgo}
          </div>
          <div class="polc" id="netpolc" hidden></div>
          <div class="polc dalpolc" id="dalpolc_r" hidden></div>
        </div>
        <div class="elo magno rejt${c.magno?.vu_kijelzo === "fluor" ? " vfdmod" : ""}" id="magno">
          <div class="bal">
            <div class="fej"><span class="marka">${ESC(c.marka || "Cantabile")}</span><span class="tipus">Stereo Cassette Deck</span><span class="hszfej"></span><button class="fogas" title="${T("Beállítások")}">${IKON.fogas}</button></div>
            <div class="felso">
              <div class="ablak" id="ablak">${kazetta}<div class="ajto"><i class="krom kb"></i><i class="krom kj"></i><span>CANTABILE</span></div></div>
              <div class="mkij"><div class="vuk">${vu("L")}${vu("R")}${vfd}</div><div class="mfunk">${otGomb}</div></div>
            </div>
            <div class="gombsor msor">
              ${mgomb("eject", IKON.eject, "eject", "#5aa7e0")}${mgomb("rew", IKON.rew, "rew")}${mgomb("ff", IKON.ff, "ff")}${mgomb("play", IKON.play, "play", "#3cbf5a")}${mgomb("stop", IKON.stop, "stop")}${mgomb("pause", IKON.pause, "pause", "#e8c43a")}
            </div>
          </div>
          <div class="mjobb">
            ${hangero}
            ${otGomb}
            ${forgo}
            <div class="kap">${valto}<div class="mfelirat"><span id="vufajta">TAPE · NORMAL</span><b id="mallapot"></b></div></div>
          </div>
          <div class="polc" id="polc" hidden></div>
          <div class="polc dalpolc" id="dalpolc_m" hidden></div>
        </div>
        <div class="beall" id="beall" hidden></div>
      </ha-card>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll(".ado").forEach((b) => b.addEventListener("click", () => this._hangol(Number(b.dataset.i))));
    sr.querySelectorAll(".hsz").forEach((b) => b.addEventListener("click", () => this._kimenetValt(Number(b.dataset.i))));
    sr.querySelectorAll(".hszv").forEach((b) => b.addEventListener("click", () => this._kimenetValt(Number(b.dataset.i))));
    const hszLep = (d) => { const L = this._hszIdx, k = L.indexOf(this._hangUtolso()); this._kimenetValt(L[(((k + d) % L.length) + L.length) % L.length]); };
    sr.querySelectorAll(".thsz .sin").forEach((g) => {
      g.addEventListener("click", () => hszLep(1));
      g.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); hszLep((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
    });
    const btAllit = (be) => {
      if (be) return this._kimenetValt(this._btIdx);
      if (this._hsz !== this._btIdx) return;
      const vissza = this._kimenetek[this._btElotte] && this._btElotte !== this._btIdx ? this._btElotte : this._hangUtolso();
      this._kimenetValt(vissza);
    };
    sr.querySelectorAll(".btv").forEach((b) => b.addEventListener("click", () => btAllit(b.dataset.b === "1")));
    sr.querySelectorAll(".tbt .sin").forEach((g) => g.addEventListener("click", () => btAllit(this._hsz !== this._btIdx)));
    sr.querySelectorAll(".valto").forEach((b) => b.addEventListener("click", () => {
      this._mod = this._mod === "magno" ? "radio" : "magno"; TAR.ir("tablet-radio-mod", this._mod); this._polcZar(); this._netZar(); this._dalZar(); this._frissit(); this._igazitKesobb();
    }));
    sr.getElementById("power").addEventListener("click", () => this._bekapcs());
    sr.getElementById("kcim").addEventListener("click", (e) => { if (this._kazDal) { e.stopPropagation(); this._dalNyit("m"); } });
    sr.getElementById("cim").addEventListener("click", (e) => { if (this._radioDal) { e.stopPropagation(); this._dalNyit("r"); } });
    sr.querySelectorAll(".adoures").forEach((b) => b.addEventListener("click", () => this._netNyit()));
    this._giroKezel(sr.getElementById("giro"));
    sr.querySelectorAll(".sleep").forEach((b) => b.addEventListener("click", () => this._alvasLep()));
    sr.querySelectorAll(".fgomb").forEach((b) => b.addEventListener("click", () => this._funkGomb(b.dataset.f)));
    sr.querySelectorAll(".ogomb").forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.f;
      if (f === "sleep") return this._alvasLep();
      if (f === "bt") return btAllit(this._hsz !== this._btIdx);
      if (f === "net") return this._net ? this._netZar() : this._netNyit();
      this._funkGomb(f);
    }));
    sr.querySelectorAll(".fhsz").forEach((b) => b.addEventListener("click", () => this._kimenetValt(Number(b.dataset.i))));
    sr.querySelectorAll(".forgo .vgomb").forEach((g) => {
      g.addEventListener("click", () => hszLep(1));
      g.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); hszLep((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: false });
    });
    sr.querySelectorAll(".fogas").forEach((b) => b.addEventListener("click", () => this._beallNyit()));
    sr.querySelectorAll(".mg").forEach((b) => {
      if (b.dataset.k === "rew" || b.dataset.k === "ff") return this._tekerKezel(b);
      b.addEventListener("click", () => this._magnoGomb(b.dataset.k));
    });
    this._csikKezel(sr.querySelector(".kcsik"));
    sr.querySelectorAll(".gomb").forEach((g) => this._gombKezel(g));
    this._frissit();
    this._igazitKesobb(); setTimeout(() => this._igazit(), 600);   // a betűkészlet és a kazetta-kép betöltése után újra
  }

  // orsó (Echo-stílus): fehér gyűrű, piros agy hat küllővel, középen a tengely
  _orso(cx, cy) {
    // TDK-szerű áttetsző, fehér orsó piros jelöléssel (a jelölésen látszik a forgás)
    let fog = "";
    for (let k = 0; k < 6; k++) fog += `<rect x="${cx - 1}" y="${cy - 6.2}" width="2" height="2.6" fill="#f6f7f8" transform="rotate(${k * 60} ${cx} ${cy})"/>`;
    const iv = (r, a1, a2) => { const p = (a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)].map((v) => v.toFixed(2)).join(" "); return `M${p(a1)} A${r} ${r} 0 0 1 ${p(a2)}`; };
    return `<circle cx="${cx}" cy="${cy}" r="12.5" fill="rgba(240,242,244,.78)" stroke="rgba(255,255,255,.9)" stroke-width=".7"/>
      <circle cx="${cx}" cy="${cy}" r="8.6" fill="rgba(255,255,255,.55)" stroke="rgba(160,166,172,.8)" stroke-width=".6"/>
      <path d="${iv(10.6, -70, -10)}" stroke="#e0262b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="4.4" fill="#d9dde0"/>${fog}<circle cx="${cx}" cy="${cy}" r="2.4" fill="#9aa0a6"/>`;
  }

  _hangszoro() { return this._kimenetek[this._hsz ?? 0] || this._kimenetek[0]; }
  _allapot(h) { return h?.entity === HELYI ? this._helyiAllapot() : this._hass?.states[h?.entity]; }
  _hiv(d, s, adat) {
    if (adat?.entity_id === HELYI || adat?.variables?.entity_id === HELYI) return this._helyi(d, s, adat);
    // amit a lejátszó nem tud (pl. egyes DLNA- vagy Cast-vevők), azt nem hívjuk – különben csendben hibát dobna
    if (d === "media_player" && KEPESSEG[s] && adat?.entity_id) {
      const ids = [].concat(adat.entity_id).filter((e) => { const f = this._hass.states[e]?.attributes?.supported_features; return f == null || (f & KEPESSEG[s]); });
      if (!ids.length) { if (s === "shuffle_set") this._uzen(T("Ez a lejátszó nem tud keverni.")); return Promise.resolve(); }
      adat = { ...adat, entity_id: Array.isArray(adat.entity_id) ? ids : ids[0] };
    }
    return this._hass.callService(d, s, adat);
  }

  // ---- BT kimenet: lejátszás ezen a készüléken (<audio>) ----

  // két lejátszó: a sima a rádióadókhoz (idegen szerver – a böngésző nem engedi elemezni), az elemzett a telefonos és a
  // NAS-fájlokhoz (blob / saját szerver): ezt Web Audio elemzőn is átvezetjük, így a VU/VFD a valódi jelet mutatja
  _helyiAudio(elemzett = false) {
    if (elemzett ? this._audioE : this._audio) return elemzett ? this._audioE : this._audio;
    const au = new Audio();
    if (elemzett) this._audioE = au; else this._audio = au;
    au.preload = "none";
    au.volume = this._aktAudio ? this._aktAudio.volume : 0.4;   // fülhallgatóhoz óvatos kezdő hangerő
    if (elemzett) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx(), forras = ctx.createMediaElementSource(au), oszto = ctx.createChannelSplitter(2);
        const an = [ctx.createAnalyser(), ctx.createAnalyser()];
        an.forEach((x, k) => { x.fftSize = 1024; oszto.connect(x, k); });
        forras.connect(ctx.destination); forras.connect(oszto);
        this._elemzo = { ctx, an, buf: new Float32Array(1024) };
      }
    }
    // az események mindig az épp látható kártyát értesítik (újraépítés után az újat)
    const k = () => HELYI_KOZOS.kartya || this;
    const frissit = () => k()._frissit();
    ["playing", "pause", "waiting", "canplay", "loadedmetadata", "volumechange", "error"].forEach((e) => au.addEventListener(e, frissit));
    // a szám vége előtt 20 mp-cel a következő link előre feloldva és letöltve: a váltás így szinte azonnali
    au.addEventListener("timeupdate", () => {
      const l = this._helyiLista;
      if (!l || this._aktAudio !== au || !(l.i + 1 < l.szamok.length) || !(au.duration - au.currentTime < 20)) return;
      const kov = l.szamok[l.i + 1];
      if (this._helyiElore?.id === kov) return;
      this._helyiElore = { id: kov, url: null };
      this._helyiForras(kov).then((url) => {
        if (this._helyiElore?.id !== kov) return;
        this._helyiElore.url = url;
        const m = new Audio(); m.preload = "auto"; m.muted = true; m.src = url; this._helyiElore.meleg = m;
      }).catch(() => { this._helyiElore = null; });
    });
    au.addEventListener("ended", () => {
      const l = this._helyiLista;
      if (l && l.i + 1 < l.szamok.length) k()._helyiSzam(l.i + 1); else { this._helyiId = null; k()._frissit(); }
    });
    au.addEventListener("error", () => {
      // az integráción át nem ment (pl. régebbi integráció): még egyszer közvetlenül
      if (this._aktAudio === au && this._helyiTovabb && this._helyiTovabb === this._helyiId) { const id = this._helyiTovabb; this._helyiTovabb = null; return k()._helyiIndit(id, true); }
      if (this._helyiId && this._aktAudio === au) k()._uzen(T("A BT kimeneten ez nem játszható le (otthoni hálózaton próbáld, vagy válassz másik adót).")); });
    au.addEventListener("loadedmetadata", () => {
      // formátum a kijelző aranycsíkjára: kiterjesztés + átlagos bitráta a fájlméretből (telefonos fájlnál)
      const m = this._helyiMeret?.get(this._helyiId), ext = (m?.ext || FAJLNEV(this._helyiId || "").split(".").pop() || "").toUpperCase();
      if (this._aktAudio === au && this._helyiId) this._formatum = { kodek: /^[A-Z0-9]{2,5}$/.test(ext) ? ext : null, kbps: m && au.duration ? Math.round((m.size * 8) / au.duration / 1000) : null };
    });
    return au;
  }

  // bal/jobb szint VU-dB-ben (0 VU = −12 dBFS, mint az integráció jelelemzőjénél)
  _elemzoSzint() {
    const e = this._elemzo; if (!e) return null;
    const pk = [];
    const db = e.an.map((a) => {
      a.getFloatTimeDomainData(e.buf);
      let o = 0, m = 0; for (let k = 0; k < e.buf.length; k++) { o += e.buf[k] * e.buf[k]; m = Math.max(m, Math.abs(e.buf[k])); }
      pk.push(m > 1e-6 ? 20 * Math.log10(m) : -60);
      return 20 * Math.log10(Math.sqrt(o / e.buf.length) || 1e-9) + 12;
    });
    if (db[1] < -60 && db[0] > -60) { db[1] = db[0]; pk[1] = pk[0]; }   // monó fájl
    return [db[0], db[1], pk[0], pk[1]];
  }

  async _helyiForras(id, kozvetlen = false) {
    if (/^https?:\/\//i.test(id) && !kozvetlen && !this._nincsIntegracio && !String(id).startsWith(location.origin)) {
      try {
        const r = await this._hass.callWS({ type: "auth/sign_path", path: `/api/cantabile/stream?url=${encodeURIComponent(id)}`, expires: 86400 });
        return r.path;
      } catch (e) { return id; }
    }
    if (!String(id).startsWith("media-source://")) return id;
    const r = await this._hass.callWS({ type: "media_source/resolve_media", media_content_id: id });
    return r.url;
  }

  async _helyiSzam(i) {
    const l = this._helyiLista; if (!l) return;
    l.i = Math.max(0, Math.min(l.szamok.length - 1, i));
    await this._helyiIndit(l.szamok[l.i]);
  }

  async _helyiIndit(id, kozvetlen = false) {
    const elore = !kozvetlen && this._helyiElore?.id === id && this._helyiElore.url ? this._helyiElore.url : null;
    this._helyiElore = null;
    const url = elore || await this._helyiForras(id, kozvetlen);
    this._helyiTovabb = url.startsWith("/api/cantabile/stream") ? id : null;
    const elemzett = /^(blob:|\/)/.test(url) || url.startsWith(location.origin);
    const au = this._helyiAudio(elemzett), masik = elemzett ? this._audio : this._audioE;
    if (masik && masik !== au) { masik.pause(); masik.removeAttribute("src"); }
    if (this._aktAudio && this._aktAudio !== au) au.volume = this._aktAudio.volume;
    this._aktAudio = au;
    this._helyiId = id;
    this._formatum = null;
    if (!elemzett) { this._jelAllapot = null; this._jelSor = []; }
    au.src = url;
    if (elemzett) this._elemzo?.ctx.resume().catch(() => {});
    try { await au.play(); } catch (e) { /* hibaüzenet az error eseményből */ }
    this._frissit(); this._animIndit();
  }

  async _helyi(d, s, adat) {
    const au = this._aktAudio || this._helyiAudio();
    if (d === "script" && s === "turn_on") { const v = adat.variables; this._helyiLista = { szamok: v.szamok, i: 0 }; return this._helyiSzam(v.kezdo || 0); }
    if (s === "play_media") { this._helyiLista = null; return this._helyiIndit(adat.media_content_id); }
    if (s === "media_stop") { au.pause(); au.removeAttribute("src"); au.load(); this._helyiId = null; this._helyiLista = null; return this._frissit(); }
    if (s === "media_pause") return au.pause();
    if (s === "media_play") return au.play().catch(() => {});
    if (s === "volume_set") { au.volume = Math.max(0, Math.min(1, adat.volume_level)); return; }
    if (s === "media_seek") { try { au.currentTime = adat.seek_position; } catch (e) { /* még nem töltött be */ } return; }
    if (s === "media_next_track" || s === "media_previous_track") {
      if (this._helyiLista) return this._helyiSzam(this._helyiLista.i + (s === "media_next_track" ? 1 : -1));
      au.currentTime = 0; return;
    }
  }

  // a BT kimenet állapota úgy, ahogy egy media_player-é kinézne (a kártya többi része így változatlanul kezeli)
  _helyiAllapot() {
    const au = this._aktAudio, id = this._helyiId;
    if (!au || !id) return { state: "idle", attributes: { volume_level: au ? au.volume : 0.5 } };
    const l = this._helyiLista, resz = String(id).split("/");
    const nas = String(id).startsWith("media-source://");
    return {
      state: au.paused ? "paused" : au.readyState < 3 ? "buffering" : "playing",
      attributes: {
        volume_level: au.volume, media_content_id: id,
        media_title: nas ? FAJLNEV(id) : this._helyiNevek?.get(id) || null,
        media_artist: nas && resz.length > 3 ? decodeURIComponent(resz[resz.length - 3]) : this._helyiNevek?.has(id) ? T("Telefon") : null,
        media_album_name: nas && resz.length > 2 ? decodeURIComponent(resz[resz.length - 2]) : null,
        media_duration: Number.isFinite(au.duration) ? au.duration : null, media_position: au.currentTime,
        media_position_updated_at: new Date().toISOString(),
        queue_position: l ? l.i + 1 : null, queue_size: l ? l.szamok.length : null,
      },
    };
  }

  // ---- alvásidőzítő ----

  // ismétlésszám: 1–5 kör, 6 = végtelen
  _korok() { const v = Math.round(Number(this._hass?.states[this._ent?.rounds]?.state)); return v >= 1 && v <= 6 ? v : 1; }

  // a Sonos áttűnés-kapcsolói (a hangszóró eszközének „crossfade” kapcsolója) a hangszóróhoz / a „Mindkettő” tagjaihoz
  _fadeKapcsolok(hsz = this._hangszoro()) {
    if (!hsz || hsz.mod !== "sonos") return [];
    const ent = this._hass?.entities || {};
    return (hsz.tagok || [hsz.entity]).map((e) => {
      const dev = ent[e]?.device_id;
      const k = dev && Object.values(ent).find((x) => x.device_id === dev && x.entity_id.startsWith("switch.") && (x.translation_key === "crossfade" || x.entity_id.endsWith("_crossfade")));
      return k ? k.entity_id : `switch.sonos_${e.split(".")[1]}_crossfade`;
    }).filter((x) => this._hass?.states[x]);
  }

  _funkGomb(f) {
    const hsz = this._hangszoro(); if (!hsz || hsz.entity === HELYI) return;
    const s = this._hass?.states[hsz.entity], a = s?.attributes || {};
    // csoportban a vezető állítja a keverést / ismétlést
    const vez = { entity_id: a.group_members?.[0] || hsz.entity };
    if (f === "kever") return this._hiv("media_player", "shuffle_set", { ...vez, shuffle: !a.shuffle });
    if (f === "fade") {
      const k = this._fadeKapcsolok(hsz); if (!k.length) return;
      return this._hiv("switch", k.some((x) => this._hass.states[x].state === "on") ? "turn_off" : "turn_on", { entity_id: k });
    }
    if (f === "korok") {
      const uj = this._korok() >= 6 ? 1 : this._korok() + 1;
      if (!this._ent?.rounds) return this._uzen(T("A Cantabile integráció nincs beállítva (Beállítások → Eszközök és szolgáltatások)."));
      this._hiv("number", "set_value", { entity_id: this._ent.rounds, value: uj });
      // 1 kör: a Sonos a sor végén magától megáll; 2–5: körbe játszik, a HA-automatizálás állítja meg; ∞: körbe játszik
      if (hsz.mod !== "sonos") return;
      const kaz = this._mod === "magno" ? this._kazetta() : null;
      if (kaz && kaz.forras !== "stream" && kaz.szamok?.length === 1 && this._szamIndex(kaz, a) >= 0) return this._egySzamSor(vez, kaz, uj);
      this._hiv("media_player", "repeat_set", { ...vez, repeat: uj === 1 ? "off" : "all" });
    }
  }

  // egyszámos kazetta Sonoson: a szám annyiszor áll a sorban, ahány kör kell, ismétlés nélkül (∞: egyszer, ismétléssel);
  // fölösleges másolatot csak a szóló szám mögül vesz ki
  async _egySzamSor(e, kaz, kor) {
    const a = this._hass?.states[e.entity_id]?.attributes || {};
    const kell = kor >= 2 && kor <= 5 ? kor : 1, van = Number(a.queue_size) || 0, most = Number(a.queue_position) || 1;
    try {
      if (kell > van) {
        const [id] = await this._sonosValtozat(kaz.szamok);
        for (let i = van; i < kell; i++) await this._hiv("media_player", "play_media", { ...e, media_content_id: id, media_content_type: "music", enqueue: "add" });
      } else for (let p = van; p > Math.max(kell, most); p--) await this._hiv("sonos", "remove_from_queue", { ...e, queue_position: p - 1 });
      await this._hiv("media_player", "repeat_set", { ...e, repeat: kor >= 6 ? "all" : "off" });
    } catch (err) { this._uzen(T("Az ismétlés beállítása nem sikerült: {h}", { h: err?.message || err })); }
  }

  _funkRajz() {
    const sr = this.shadowRoot; if (!sr) return;
    const hsz = this._hangszoro(), helyi = !hsz || hsz.entity === HELYI;
    const a = (!helyi && this._hass?.states[hsz.entity]?.attributes) || {};
    const kor = this._korok(), fade = helyi ? [] : this._fadeKapcsolok(hsz);
    const bton = !!hsz && hsz.entity === HELYI;
    sr.querySelectorAll(".ogomb").forEach((b) => {
      const f = b.dataset.f, am = b.parentElement.querySelector(".amar");
      if (f === "sleep" || f === "net") return;
      if (f === "bt") { b.classList.toggle("be", bton); return; }
      b.classList.toggle("tiltva", helyi || (f === "fade" && !fade.length));
      b.parentElement.classList.toggle("tiltva", helyi || (f === "fade" && !fade.length));
      b.classList.toggle("be", !helyi && (f === "kever" ? !!a.shuffle : f === "korok" ? kor !== 1 : fade.some((x) => this._hass.states[x].state === "on")));
      // a körszám a REPEAT jel közepén (mint a Sonos appban az „ismétlés egy szám” jel)
      if (f === "korok") { const sz = b.querySelector(".oszam"); sz.textContent = !helyi && kor !== 1 ? (kor >= 6 ? "∞" : String(kor)) : ""; sz.classList.toggle("vegt", kor >= 6); }
    });
    sr.querySelectorAll(".fgomb").forEach((b) => {
      const f = b.dataset.f;
      b.classList.toggle("tiltva", helyi || (f === "fade" && !fade.length));
      b.classList.toggle("be", !helyi && (f === "kever" ? !!a.shuffle : f === "korok" ? kor !== 1 : fade.some((x) => this._hass.states[x].state === "on")));
      if (f === "korok") b.querySelector(".amar").textContent = kor >= 6 ? "∞" : String(kor);
    });
    // VFD jelzősor; a mobilnetet a böngésző Network Information API-ja mondja meg (Androidon), máshol halvány marad
    const be = { bt: !!hsz && hsz.entity === HELYI, mobil: navigator.connection?.type === "cellular",
      kever: !helyi && !!a.shuffle, korok: !helyi && kor !== 1, fade: fade.some((x) => this._hass.states[x].state === "on") };
    sr.querySelectorAll(".vjelzo i").forEach((x) => x.classList.toggle("be", !!be[x.dataset.j]));
    const em = sr.querySelector('.vjelzo [data-j="korok"] em');
    if (em) em.textContent = kor === 1 || helyi ? "" : kor >= 6 ? "∞" : String(kor);
    if (navigator.connection && !this._halozatFigyel) { this._halozatFigyel = true; navigator.connection.addEventListener("change", () => this._funkRajz()); }
  }

  _alvasTabla() { return this._hass?.states[this._ent?.sleep]?.attributes?.timers || {}; }

  _alvasVege(hsz = this._hangszoro()) {
    const v = hsz?.entity === HELYI ? this._helyiAlvas : this._alvasTabla()[hsz?.entity];
    const t = v ? Date.parse(v) : NaN;
    return Number.isFinite(t) && t > Date.now() ? t : null;
  }

  _alvasRajz() {
    const sr = this.shadowRoot; if (!sr) return;
    const vege = this._alvasVege(), perc = vege ? Math.ceil((vege - Date.now()) / 60000) : 0;
    sr.querySelectorAll(".sleep").forEach((b) => { b.classList.toggle("be", !!vege); b.querySelector(".amar").textContent = vege ? `${perc}′` : ""; });
    sr.querySelectorAll('.ogomb[data-f="sleep"]').forEach((b) => { b.classList.toggle("be", !!vege); b.parentElement.querySelector(".amar").textContent = vege ? ` ${perc}′` : ""; });
    clearTimeout(this._alvasIdo);
    if (vege) this._alvasIdo = setTimeout(() => this._alvasRajz(), this._config.magno?.vu_kijelzo === "fluor" ? 1000 : 20000);
    if (this._magnoAllapot && this._config.magno?.vu_kijelzo === "fluor") this._szalagRajz();
  }

  // SLEEP: ki → 15 → 30 → 45 → 60 → 90 → ki (a hátralévő időnél nagyobb következő lépcső)
  async _alvasLep() {
    const hsz = this._hangszoro(); if (!hsz || !this._hass) return;
    const vege = this._alvasVege(hsz), most = Date.now();
    const maradt = vege ? (vege - most) / 60000 : 0;
    const kov = vege ? ALVAS_LEPES.find((x) => x > maradt + 1) : ALVAS_LEPES[0];
    const ujVege = kov ? new Date(most + kov * 60000) : null;
    const iso = ujVege ? ujVege.toISOString() : null;
    try {
      if (hsz.entity === HELYI) {
        clearTimeout(this._helyiAlvasIdo); this._helyiAlvas = iso;
        if (ujVege) this._helyiAlvasIdo = setTimeout(() => this._helyiElalszik(), Math.max(0, ujVege - most - 30000));
      } else {
        // az integráció tartja: Sonoson a hangszóró saját időzítője, máshol a szerveren fut (lehalkítással)
        if (!this._ent?.sleep) throw new Error(T("A Cantabile integráció nincs beállítva (Beállítások → Eszközök és szolgáltatások)."));
        await this._hass.callService("cantabile", "sleep_timer", { entity_id: hsz.entity, minutes: iso ? kov : 0 });
      }
      this._uzen(iso ? T("Kikapcsol {p} perc múlva ({t}).", { p: kov, t: ujVege.toLocaleTimeString(NYELV(), { hour: "2-digit", minute: "2-digit", ...ORA_OPC(this._hass) }) }) : T("Időzített kikapcsolás törölve."));
    } catch (e) { this._uzen(T("Időzítő: {h}", { h: e?.message || e })); }
    this._alvasRajz();
  }

  // BT: az utolsó 30 mp-ben lehalkít, leállít, visszaállítja a hangerőt
  _helyiElalszik() {
    const au = this._aktAudio; if (!au || !this._helyiAlvas) return;
    const v = au.volume; let k = 0;
    const lep = () => {
      if (!this._helyiAlvas) { au.volume = v; return; }
      k++; au.volume = Math.max(0, v * (1 - k / 10));
      if (k < 10) { this._helyiAlvasIdo = setTimeout(lep, 3000); return; }
      this._helyi("media_player", "media_stop", { entity_id: HELYI });
      au.volume = v; this._helyiAlvas = null; this._alvasRajz();
    };
    lep();
  }

  // az utoljára választott hangszóró (nem BT) – a SPEAKERS kapcsoló ezt mutatja, BT kikapcsolásakor ide tér vissza
  _hangUtolso() {
    const L = this._hszIdx || [];
    if (L.includes(this._hsz)) this._hangUt = this._hsz;
    return L.includes(this._hangUt) ? this._hangUt : (L[0] ?? 0);
  }

  // a közös állás tagjai mind egy csoportban vannak-e (a vezető group_members listája alapján)
  _egyutt(h) {
    const g = this._hass?.states[h.entity]?.attributes?.group_members || [];
    return h.tagok.every((e) => g.includes(e));
  }

  // közös állásra: a tagok beléptetése a vezető mellé; egyetlen Sonosra váltva a többiek kiléptetése (A+B → A)
  _csoportAllit(uj) {
    if (!this._hass || uj.mod !== "sonos") return;
    if (uj.tagok) {
      // a csoport vezetője az a tag, amelyik épp szól (különben a csendes vezető mellé lépve a szóló is elhallgatna)
      if (this._egyutt(uj)) return;
      const szolo = uj.tagok.find((e) => this._hass.states[e]?.state === "playing");
      const vezeto = szolo ? (this._hass.states[szolo].attributes?.group_members?.[0] || szolo) : uj.entity;
      return this._hiv("media_player", "join", { entity_id: vezeto, group_members: uj.tagok.filter((e) => e !== vezeto) }).catch((e) => this._uzen(T("A csoportba kapcsolás nem sikerült: {h}", { h: e.message || e })));
    }
    const g = this._hass.states[uj.entity]?.attributes?.group_members || [];
    const tobbi = g.filter((e) => e !== uj.entity);
    if (tobbi.length) return this._hiv("media_player", "unjoin", { entity_id: tobbi }).catch(() => {});
  }

  // kimenetváltás: ami szól, átkerül az új kimenetre (mint egy igazi hangszóróválasztón); atvisz=false: csak választ
  async _atviszHaKell(regi, uj) {
    if (this._spotifyConnectSzol(regi)) {
      // Spotify Connect: a Spotify maga adja át a lejátszást a másik eszköznek
      const eszk = this._spotifyEszkoz(uj);
      if (!eszk) { this._hsz = this._kimenetek.indexOf(regi); this._hangUtolso(); this._uzen(T("A Spotify Connect-lejátszás csak Spotify Connect-hangszóróra vihető át – a(z) {r} szól tovább.", { r: KN(regi) })); return this._frissit(); }
      return this._hiv("media_player", "select_source", { entity_id: this._stream.spotify_entity, source: eszk });
    }
    const s = this._allapot(regi);
    const fb = this._atvitel && this._atvitel.hova === regi.entity && Date.now() - this._atvitel.ido < 15000 ? this._atvitel : null;
    if (SZOL(s) || fb) return this._atvisz(regi, uj, s, fb);
    if (SZUNETEL(s)) {
      // szünetelő kazetta: a választó csak választ; a következő PLAY az új kimeneten ugyanonnan folytatja
      const f = await this._szoloForras(regi, s);
      this._szunetAtvitel = f ? { ...f, hova: uj.entity } : null;
    }
    return this._csoportAllit(uj);
  }

  async _atvisz(regi, uj, s, fb = null) {
    const szol = SZOL(s);
    const tagok = s?.attributes?.group_members?.length ? s.attributes.group_members : [regi.entity];
    if (regi.mod === "sonos" && uj.mod === "sonos" && szol) {
      // Sonos → Sonos: az új hangszóró belép a szóló csoportba, a többiek kilépnek – a zene megszakítás nélkül megy tovább
      if (uj.tagok) return this._csoportAllit(uj);
      if (!tagok.includes(uj.entity)) await this._hiv("media_player", "join", { entity_id: tagok[0], group_members: [uj.entity] });
      const tobbi = [...new Set([...tagok, ...(regi.tagok || [])])].filter((e) => e !== uj.entity);
      if (tobbi.length) await this._hiv("media_player", "unjoin", { entity_id: tobbi });
      return;
    }
    // más rendszerek között (Sonos ↔ WiiM ↔ BT): a régi szünetel, az újon ugyanaz indul – rádión az adó, magnón a kazetta
    // az épp szóló számtól és ugyanattól a ponttól. A Sonost szüneteltetjük, nem állítjuk le: a STOP a sorát az elejére teszi.
    const a = s?.attributes || {};
    // rádió: bármelyik nézetből átmegy (a rádióadónak nincs kizárólagos kimenete); ha a régi még csak töltött, az épp
    // átvitt adó
    let ado = szol ? this._adoIndex(regi) : -1;
    if (ado === -1 && fb) ado = fb.ado;
    // magnó: a szóló számsor és hely a lejátszótól (a leállítás előtt kell kiolvasni)
    let forras = null;
    if (ado === -1) forras = szol ? await this._szoloForras(regi, s) : fb?.forras || null;
    if (szol && ado === -1 && !forras) {
      // ismeretlen forrás (pl. a lejátszó saját appjából indított zene): nem visszük át, és nem is állítjuk le
      this._hsz = this._kimenetek.indexOf(regi); this._hangUtolso();
      this._uzen(T("Ezt, ami most szól, nem tudom átvinni a(z) {h} hangszóróra – a(z) {r} szól tovább.", { h: KN(uj), r: KN(regi) }));
      return this._frissit();
    }
    if (regi.mod === "url") this._szkriptLeallit(regi);
    await this._hiv("media_player", regi.mod === "sonos" ? "media_pause" : "media_stop", { entity_id: regi.entity });
    // Sonos célnál a csoport mindig a választás szerinti (egyedül, vagy mindkettő) – különben egy korábbi Multiroom-csoport
    // tagja is megszólalna
    await this._csoportAllit(uj);
    if (ado >= 0 || ado === KULSO) this._atvitel = { ado, hova: uj.entity, ido: Date.now() };
    if (ado >= 0) return this._hangol(ado);
    if (ado === KULSO) { const k = this._kulso(); if (k) return this._netIndit({ name: k.nev, url_resolved: k.url, favicon: k.ikon, countrycode: k.orszag, codec: k.kodek, bitrate: k.kbps }, false); }
    if (forras) {
      this._atvitel = { ado: -1, forras, hova: uj.entity, ido: Date.now() };
      if (forras.tel) return this._telAtmenet(forras.kaz, forras.kezdo, forras.poz, uj);
      await this._kazettaFolytat(forras, uj);
    }
  }

  // saját zene (a böngészőben lévő fájlok) nem BT kimeneten: számonként átmenetileg feltölti a HA-ra (24 óra múlva
  // törlődik); az első szám után már szól, a többi a háttérben kerül a sor végére. A kazettán TEMP jelzés.
  async _telAtmenet(kaz, kezdo, poz, uj) {
    const fajlok = this._telFajlok, lista = kaz.szamok.slice(Math.max(0, kezdo));
    if (!lista.length) return;
    const all = this._atmenetiAll = { kesz: 0, db: lista.length };
    const fel = async (u) => {
      const f = fajlok?.get(u);
      if (!f) throw new Error(T("A fájl már nem érhető el – válaszd ki újra."));
      const fd = new FormData(); fd.append("file", f, f.name);
      const v = await this._hass.fetchWithAuth("/api/cantabile/upload", { method: "POST", body: fd });
      const j = await v.json().catch(() => ({}));
      if (!v.ok) throw new Error(j.error || String(v.status));
      return j.media_content_id;
    };
    this._uzen(T("Saját zene a(z) {h} hangszórón: átmeneti feltöltés (24 óra múlva törlődik)…", { h: KN(uj) }));
    this._frissit();
    let elso;
    try { elso = await fel(lista[0]); } catch (e) { this._atmenetiAll = null; this._frissit(); return this._uzen(T("A feltöltés nem sikerült: {h}", { h: e?.message || e })); }
    all.kesz = 1;
    const tkaz = { forras: "nas", atmeneti: true, cim: kaz.cim, alcim: kaz.alcim, id: `tmp:${Date.now()}`, szamok: [elso] };
    await this._kazettaFolytat({ kaz: tkaz, kezdo: 0, poz }, uj);
    const vez = this._hass.states[uj.entity]?.attributes?.group_members?.[0] || uj.entity;
    for (const u of lista.slice(1)) {
      if (this._atmenetiAll !== all) return;          // közben új kazetta került be
      let id;
      try { id = await fel(u); } catch (e) { this._uzen(T("A feltöltés nem sikerült: {h}", { h: e?.message || e })); break; }
      if (this._atmenetiAll !== all) return;
      tkaz.szamok.push(id); all.kesz++;
      TAR.ir("tablet-magno-kazetta", JSON.stringify({ ...tkaz, entity: uj.entity }));
      if (uj.mod === "sonos") await this._hiv("media_player", "play_media", { entity_id: vez, media_content_id: id, media_content_type: "music", enqueue: "add" }).catch(() => {});
      else await this._hiv("cantabile", "add_tracks", { entity_id: uj.entity, tracks: [id] }).catch(() => {});
      this._frissit();
    }
    this._frissit();
  }

  // a kazetta folytatása az új kimeneten: ugyanattól a számtól, ugyanonnan
  async _kazettaFolytat(f, uj) {
    await this._betolt(f.kaz, f.kezdo);
    if (!(f.poz > 3)) return;
    // a tekerés csak akkor hat, ha az új kimenet már ténylegesen az átvitt számot játssza (a Cast / WiiM lassabban tölt be,
    // és előtte még mást is szólhatott)
    const ezSzol = () => {
      const s = this._allapot(uj), a = s?.attributes || {};
      if (s?.state !== "playing") return false;
      if (uj.entity === HELYI) return this._helyiLista?.i === f.kezdo;
      if (uj.mod === "sonos") return (Number(a.queue_position) || 0) - 1 === f.kezdo;
      const i = this._szamIndex(f.kaz, a);
      return i === f.kezdo || i < 0 && !URLSZERU(a.media_title);
    };
    for (let t = 0; t < 24 && !ezSzol(); t++) await new Promise((r) => setTimeout(r, 500));
    // a WiiM / Cast a címet már a betöltéskor kiírja, de tekerni csak kicsivel később tud
    await new Promise((r) => setTimeout(r, uj.mod === "sonos" || uj.entity === HELYI ? 800 : 2500));
    this._hiv("media_player", "media_seek", { entity_id: uj.entity, seek_position: Math.round(f.poz) }).catch(() => {});
  }

  // a szóló (vagy szünetelő) kazetta számsora és helye, magától a lejátszótól: Sonosnál a sorából, WiiM-nél az integráció
  // sorozatából, BT-n a kártya listájából. Csak zenemappás számsort ad (Deezer / kedvenc / telefonos zene: null).
  async _szoloForras(hsz, s) {
    const a = s?.attributes || {};
    let poz = a.media_position != null ? a.media_position + (s.state === "playing" && a.media_position_updated_at ? (Date.now() - Date.parse(a.media_position_updated_at)) / 1000 : 0) : 0;
    let szamok = null, kezdo = 0;
    if (hsz.entity === HELYI) {
      const l = this._helyiLista;
      if (!l?.szamok?.length) return null;
      if (l.tel) return this._telKaz ? { tel: true, kaz: { ...this._telKaz, szamok: [...l.szamok] }, kezdo: l.i, poz: this._aktAudio?.currentTime || 0 } : null;
      szamok = [...l.szamok]; kezdo = l.i; poz = this._aktAudio?.currentTime || 0;
    } else if (hsz.mod === "sonos") {
      const vez = a.group_members?.[0] || hsz.entity;
      try {
        const v = await this._hass.callWS({ type: "call_service", domain: "sonos", service: "get_queue", service_data: { entity_id: vez }, return_response: true });
        const sor = (v?.response?.[vez] || []).map((x) => /\/media\/([^/?#]+)\/([^?#]+)/.exec(x.media_content_id || ""));
        if (sor.length && !sor.some((m) => !m)) szamok = sor.map((m) => `media-source://media_source/${m[1]}/${decodeURIComponent(m[2])}`);
        else {
          // nem helyi zenetár (Jellyfin…): a kazetta emlékezetéből, ha a sor hossza egyezik
          const kt = TAR.json("tablet-magno-kazetta");
          if (kt?.forras === "nas" && kt.szamok?.length && kt.szamok.length === sor.length) szamok = kt.szamok; else return null;
        }
      } catch (e) { return null; }
      kezdo = Math.max(0, (Number(a.queue_position) || 1) - 1);
      // a pozíció közvetlenül a hangszórótól (zenemappás számnál a HA nem mindig jelenti)
      try { const ps = await this._hass.callWS({ type: "cantabile/sonos_position", entity_id: vez }); if (ps?.position >= 0) { poz = ps.position; if (ps.track >= 0) kezdo = ps.track; } } catch (e) { /* régebbi integráció */ }
    } else {
      try {
        const t = await this._hass.callWS({ type: "cantabile/tracks", entity_id: hsz.entity });
        // a ténylegesen szóló szám a címmezőből (a sorozat a következőt már előre megadta a WiiM-nek)
        if (t?.tracks?.length) { szamok = t.tracks; const i2 = this._szamIndex({ szamok }, a); kezdo = i2 >= 0 ? i2 : Math.max(0, t.current); }
      } catch (e) { /* régebbi integráció: a kártya emlékezete */ }
      const k = TAR.json("tablet-magno-kazetta");
      if (!szamok && k?.forras === "nas" && k.szamok?.length && k.entity === hsz.entity) { szamok = k.szamok; kezdo = Math.max(0, this._szamIndex(k, a)); }
      if (!szamok) return null;
    }
    const k = TAR.json("tablet-magno-kazetta"), ugyanaz = k?.forras === "nas" && k.szamok?.length === szamok.length;
    const kaz = { forras: "nas", szamok, cim: ugyanaz ? k.cim : a.media_album_name || FAJLNEV(szamok[0]), alcim: ugyanaz ? k.alcim : a.media_artist || "" };
    if (ugyanaz && k.id) kaz.id = k.id;
    return { kaz, kezdo: Math.min(kezdo, szamok.length - 1), poz };
  }

  // a szóló forrás csak ezen a fajta kimeneten szólhat: Deezer / Sonos-kedvenc a Sonoson, a telefon saját zenéje BT-n
  _kizarolagos(hsz, s) {
    if (!hsz || !SZOL(s) || this._adoIndex(hsz) !== -1) return null;
    const cid = String(s.attributes?.media_content_id || "");
    if (hsz.mod === "sonos" && /^(x-sonos-http|x-sonosapi|x-rincon-cpcontainer|x-sonos-spotify|x-sonosprog-http):/i.test(cid)) return "sonos";
    return null;
  }

  _kimenetValt(i, atvisz = true) {
    const n = this._kimenetek.length, regi = this._hangszoro(), regiAll = this._allapot(regi);
    const cel = this._kimenetek[((i % n) + n) % n], kiz = atvisz ? this._kizarolagos(regi, regiAll) : null;
    const celAll = cel && cel.entity !== HELYI ? this._hass?.states[cel.entity] : null;
    if (celAll && celAll.state !== "unavailable" && !(Number(celAll.attributes?.supported_features) & 512)) {
      // nem tud webcímet / fájlt lejátszani (pl. csak távirányítható lejátszó): nem váltunk rá, ami szól, szól tovább
      this._uzen(T("A(z) {h} nem tud zenét fogadni a Cantabile-tól (nincs lejátszás-indítás funkciója) – válassz másik lejátszót a ⚙ beállításokban.", { h: KN(cel) }));
      this._frissit();
      return;
    }
    const tvPar = cel && this._tvPar(cel.entity);
    if (tvPar) this._uzen(T("A(z) {h} a TV saját lejátszója – csak a hang megy át. A ⚙-ben állítsd át a(z) „{n}” lejátszóra.", { h: KN(cel), n: tvPar.nev }));   // figyelmeztet, de vált
    if (((kiz === "sonos" && !this._spotifyConnectSzol(regi)) && cel?.mod !== "sonos") || (kiz === "bt" && cel?.entity !== HELYI)) {
      // a Deezer / Sonos-kedvenc csak Sonoson, a telefonos zene csak BT-n szól: a választó marad, a zene szól tovább
      this._uzen(kiz === "sonos" ? T("A Deezer és a Sonos-kedvencek csak Sonoson szólnak – a(z) {h} szól tovább.", { h: KN(regi) })
        : T("A telefonról választott zene csak BT-n szól – ott marad."));
      this._frissit();
      return;
    }
    this._hsz = ((i % n) + n) % n;
    this._hangUtolso();
    const uj = this._kimenetek[this._hsz];
    TAR.ir("tablet-radio-hangszoro", uj.kulcs || uj.entity);
    // a BT megjegyzi, kitől vette át a hangot – kikapcsoláskor annak adja vissza
    if (uj.entity === HELYI && regi && regi.entity !== HELYI) this._btElotte = this._kimenetek.indexOf(regi);
    // a választó csak irányít: ami szól (vagy épp átvitel alatt van), az megy át az új kimenetre. A váltások sorban
    // futnak, így gyors kapcsolgatásnál sem indul el két helyen, és nem vész el az adó.
    if (atvisz && regi && regi !== uj) {
      this._valtSor = (this._valtSor || Promise.resolve()).then(() => this._atviszHaKell(regi, uj))
        .catch((e) => this._uzen(T("Az átváltás nem sikerült: {h}", { h: e?.message || e })));
    } else this._csoportAllit(uj);
    this._kezi = null; this._frissit(); this._jelFeliratkozas();
  }

  _hangol(i) {
    const hsz = this._hangszoro(), a = this._config.adok[i];
    if (!this._hass || !hsz) return;
    this._kezi = { i, ido: Date.now() };   // a mutató azonnal indul, nem várja meg az állapotot
    TAR.ir("tablet-radio-ado", a.nev);
    this._szkriptLeallit();
    const cim = hsz.mod === "sonos" ? `x-rincon-mp3radio://${CIM(a.url)}` : a.url;
    const p = this._hiv("media_player", "play_media", { entity_id: hsz.entity, media_content_id: cim, media_content_type: "music" });
    this._frissit();
    return p;
  }

  // SIGNAL: a stream „térereje” – bitrátából (cantabile/signal, ffprobe), él-e az adás, pufferel-e; hangoláskor a legközelebbi adótól mért távolság
  _jelRajz() {
    const sr = this.shadowRoot, ra = this._radioAll;
    if (!sr || !ra) return;
    let v = 0, fel = "";
    if (this._hangolo) {
      const { d } = this._legkozelebbi(this._hangolo.f);
      v = Math.max(0, 1 - d / 0.35) * 0.92; fel = v > 0.5 ? "STATION" : "SEEK";
    } else if (ra.szol) {
      const kbps = Number(this._formatum?.kbps) || 0;
      if (ra.keres) { v = 0.12; fel = "TUNING…"; }
      else if (ra.s?.state === "buffering") { v = 0.25; fel = "BUFFERING"; }
      else if (this._jelAllapot === "nincs" && this._mod !== "magno") { v = 0.08; fel = "NO SIGNAL"; }
      else {
        v = kbps ? Math.min(0.96, 0.35 + 0.61 * Math.log(kbps / 48) / Math.log(320 / 48)) : 0.72;
        v += ((this._szint ?? 0.5) - 0.5) * 0.06;   // a műsor hangosságával finoman rezdül
        fel = kbps ? `${this._formatum?.kodek || ""} ${kbps} kbps`.trim() : "STATION";
      }
    }
    const fok = -40 + 80 * Math.max(0, Math.min(1, v));
    sr.getElementById("jmut").style.transform = `rotate(${fok.toFixed(1)}deg)`;
    sr.getElementById("jfel").textContent = fel;
  }

  _legkozelebbi(f) {
    let i = -1, d = 99;
    this._config.adok.forEach((a, k) => { const x = Math.abs(a.frekvencia - f); if (x < d) { d = x; i = k; } });
    return { i, d };
  }

  // Gyro-Touch lendkerék: oldalra húzva (vagy görgővel) a mutató szabadon jár; adó közelében „fog” a SIGNAL,
  // elengedéskor ±0,25 MHz-en belül az adóra áll és indítja, máshol 2,5 mp múlva visszatér a szóló adóhoz
  _giroKezel(giro) {
    const kerek = giro.querySelector("#kerek");
    let x0 = null, id = null, poz = 0;
    const indul = () => {
      if (!this._hangolo) {
        const c = this._config, i = this._radioAll?.i;
        this._hangolo = { f: c.adok[i >= 0 ? i : this._utolso ?? 0]?.frekvencia ?? 98 };
      }
      clearTimeout(this._hangoloIdo);
      this.shadowRoot.getElementById("elo").classList.add("kezi");
    };
    const lep = (df) => {
      this._hangolo.f = Math.min(MAX_F, Math.max(MIN_F, this._hangolo.f + df));
      poz += df * 60; kerek.style.backgroundPositionX = `${poz.toFixed(1)}px`;
      this._hangoloRajz(); this._jelRajz();
    };
    const vege = () => {
      const { i, d } = this._legkozelebbi(this._hangolo.f);
      if (d <= 0.25) {
        this._hangolo.f = this._config.adok[i].frekvencia; this._hangoloRajz();
        this._hangoloIdo = setTimeout(() => {
          this._hangolo = null; this.shadowRoot.getElementById("elo").classList.remove("kezi");
          if (!(this._radioAll?.szol && this._radioAll.i === i)) this._hangol(i); else this._frissit();
        }, 350);
      } else {
        this._hangoloIdo = setTimeout(() => { this._hangolo = null; this.shadowRoot.getElementById("elo").classList.remove("kezi"); this._frissit(); }, 2500);
      }
    };
    giro.addEventListener("pointerdown", (e) => { e.stopPropagation(); id = e.pointerId; giro.setPointerCapture(id); x0 = e.clientX; indul(); });
    giro.addEventListener("pointermove", (e) => { if (x0 == null || e.pointerId !== id) return; const dx = e.clientX - x0; x0 = e.clientX; lep(dx * 0.025); });
    const fel = (e) => { if (x0 == null || e.pointerId !== id) return; x0 = null; vege(); };
    giro.addEventListener("pointerup", fel); giro.addEventListener("pointercancel", fel);
    giro.addEventListener("wheel", (e) => {
      e.preventDefault(); e.stopPropagation(); indul();
      lep((e.deltaY || e.deltaX) > 0 ? 0.1 : -0.1);
      clearTimeout(this._gorgoIdo); this._gorgoIdo = setTimeout(vege, 700);
    }, { passive: false });
  }

  _hangoloRajz() {
    const sr = this.shadowRoot, f = this._hangolo.f, { i, d } = this._legkozelebbi(f), c = this._config;
    sr.getElementById("mutato").style.left = `${POZ(f)}%`;
    sr.getElementById("ado").innerHTML = d <= 0.25 ? `<b>${ESC(c.adok[i].nev)}</b> · ${MHZ(c.adok[i].frekvencia)} MHz` : `${MHZ(Math.round(f * 10) / 10)} MHz · NO STATION`;
    sr.getElementById("cim").textContent = "";
  }

  _bekapcs() {
    const hsz = this._hangszoro();
    if (!this._hass || !hsz) return;
    if (SZOL(this._allapot(hsz))) {
      this._kezi = null;
      this._szkriptLeallit();
      this._hiv("media_player", "media_stop", { entity_id: hsz.entity });
      return;
    }
    if (!this._config.adok.length) return this._netNyit();
    const nev = TAR.olvas("tablet-radio-ado");
    const i = Math.max(0, this._config.adok.findIndex((a) => a.nev === nev));
    this._hangol(i);
  }

  // ---- beállítások (űrlap a kártyán; Mentés = a vezérlőpult konfigurációjába írja) ----

  _beallNyit() {
    const c = this._config;
    this._szerk = JSON.parse(JSON.stringify({ marka: c.marka || "Cantabile", deezer: c.deezer !== false, felulet: c.felulet === "black" ? "black" : "silver",
      hangszorok: c.hangszorok.map(({ automod, ...h }) => h),
      adok: c.adok.map(({ virt, ...a }) => (virt ? { ...a, frekvencia: "" } : a)), magno: c.magno || {} }));
    this._talalatok = [];
    this._beallRajz();
  }

  _beallZar() {
    this._szerk = null;
    const b = this.shadowRoot.getElementById("beall");
    b.hidden = true; b.innerHTML = "";
  }

  // TV-figyelmeztetés: a választott lejátszó egy TV saját Cast- / DLNA-lejátszója, amelyhez van Cantabile TV-lejátszó
  // (azzal a képernyőn is megjelenik a szám; a saját lejátszón csak a hang megy át)
  _tvPar(entity) {
    if (!entity || !this._hass) return null;
    // az integráció adja a párokat (akkor is, ha a TV épp nem elérhető, és az állapotában nincs cast_entity); tartalék: az állapot
    const tvE = Object.keys(this._tvMap || {}).find((k) => this._tvMap[k] === entity)
      || Object.values(this._hass.states).find((x) => x.entity_id.startsWith("media_player.") && x.attributes?.cast_entity === entity)?.entity_id;
    if (!tvE) return null;
    const st = this._hass.states[tvE];
    return { entity: tvE, nev: st?.attributes?.friendly_name || this._hass.entities?.[tvE]?.name || tvE };
  }

  _tvJelolt(entity) {
    const pl = this._hass?.entities?.[entity]?.platform;
    return (pl === "cast" || pl === "dlna_dmr") && !this._tvPar(entity);
  }

  _beallRajz(uzenet = "") {
    const b = this.shadowRoot.getElementById("beall"), sz = this._szerk;
    if (!sz) return;
    b.hidden = false;
    // csak olyan lejátszó választható, amelyik tud médiát indítani (PLAY_MEDIA); a már beállítottat mindig mutatjuk
    const beallitott = new Set(sz.hangszorok.map((h) => h.entity));
    // a TV-k saját Cast- / DLNA-lejátszója nem választható, ha van hozzá Cantabile TV-lejátszó (azzal a képernyőn is megjelenik a szám)
    const lejatszok = Object.values(this._hass?.states || {}).filter((x) => x.entity_id.startsWith("media_player.")
      && (beallitott.has(x.entity_id) || ((Number(x.attributes?.supported_features) & 512) && !this._tvPar(x.entity_id))))
      .sort((x, y) => (x.attributes.friendly_name || x.entity_id).localeCompare(y.attributes.friendly_name || y.entity_id, NYELV()));
    const opc = (val) => lejatszok.map((x) => `<option value="${x.entity_id}" ${x.entity_id === val ? "selected" : ""}>${ESC(x.attributes.friendly_name || x.entity_id)} (${x.entity_id.slice(13)})</option>`).join("");
    const be = (lista, i, mezo, ertek, extra = "") => `<input data-l="${lista}" data-i="${i}" data-m="${mezo}" value="${ESC(ertek ?? "")}" ${extra}>`;
    b.innerHTML = `
      <div class="bfej"><b>${ESC(sz.marka || "Cantabile")}</b><span>${T("Beállítások – a Mentés minden vezérlőpult Cantabile kártyájába beírja")}</span>
        <button data-a="megse">${T("Mégse")}</button><button class="ment" data-a="ment">${T("Mentés")}</button></div>
      <div class="btest">
        <div class="bhiba">${ESC(uzenet)}</div>
        <section class="bresz"><h3>${T("Általános")}</h3>
          <div class="bsor ket"><label>${T("Márkanév")}</label>${be("_", 0, "marka", sz.marka)}</div>
          <div class="bsor ket"><label>${T("Előlap")}</label><select data-l="_" data-i="0" data-m="felulet"><option value="silver" ${sz.felulet !== "black" ? "selected" : ""}>${T("Ezüst (húzott alumínium)")}</option><option value="black" ${sz.felulet === "black" ? "selected" : ""}>${T("Fekete (90-es évek)")}</option></select></div>
          ${sz.hangszorok.some((h) => h.mod === "sonos") ? `<div class="bsor ket"><label>${T("DEEZER fül")}</label><select data-l="_" data-i="0" data-m="deezer"><option value="1" ${sz.deezer !== false ? "selected" : ""}>${T("Látszik (a Sonos appban bekötött Deezer-fiókkal szól)")}</option><option value="0" ${sz.deezer === false ? "selected" : ""}>${T("Rejtve (nincs Deezer)")}</option></select></div>` : ""}
        </section>
        <section class="bresz"><h3>${T("Rádióadók")} <button class="bgomb" data-a="ujado">${T("+ Új adó")}</button></h3>
          <div class="bfejlec ado"><span>${T("NÉV")}</span><span>${T("GOMBON")}</span><span>MHZ</span><span>${T("STREAM-CÍM")}</span><span></span><span></span></div>
          ${sz.adok.map((a, i) => `<div class="bsor ado">${be("adok", i, "nev", a.nev, `placeholder="${T("Név")}"`)}${be("adok", i, "rovid", a.rovid, `placeholder="${T("(a név)")}"`)}${be("adok", i, "frekvencia", a.frekvencia, 'inputmode="decimal" placeholder="87,5–108"')}${be("adok", i, "url", a.url, 'placeholder="https://…"')}<button class="bproba" data-a="proba" data-i="${i}" title="${T("Lejátszás a választott hangszórón")}">${T("▶ Próba")}</button><button class="bx" data-a="torol" data-l="adok" data-i="${i}" title="${T("Törlés")}">×</button></div>`).join("")}
          <p class="bmeg">${T("A gombok frekvencia szerint rendeződnek, 12 hely van. A frekvencia elhagyható (csak internetes adó: a skálán egyenletesen elosztva, a gombon WEB). Sonosnál a furcsa portos https-cím helyett próbáld http-vel.")}</p>
          <div class="bker"><input id="bkeres" placeholder="${T("Adó keresése név szerint (Radio Browser), pl. Kossuth, Jazzy, Rock FM")}" value="${ESC(this._keresett || "")}"><button class="bgomb" data-a="keres">${T("Keresés")}</button></div>
          <div class="btalalat">${(this._talalatok || []).map((t, i) => `<div><em>${ESC(t.name)}</em><small>${ESC([t.codec, t.bitrate ? t.bitrate + " kbps" : "", t.countrycode].filter(Boolean).join(" · "))}</small><button class="bgomb" data-a="felvesz" data-i="${i}">${T("+ Felvesz")}</button></div>`).join("")}</div>
        </section>
        <section class="bresz"><h3>${T("Hangszórók")} <button class="bgomb" data-a="ujhsz">${T("+ Új hangszóró")}</button></h3>
          <div class="bfejlec hsz2"><span>${T("NÉV")}</span><span>${T("A KÁRTYÁN (MAX. 8)")}</span><span>${T("LEJÁTSZÓ")}</span><span>${T("FAJTA")}</span><span></span></div>
          ${sz.hangszorok.map((h, i) => { const par = this._tvPar(h.entity), figy = par
            ? `<div class="bfigy">⚠ ${ESC(T("Ez a TV saját lejátszója: csak a hang megy át. A képernyőhöz válaszd a(z) „{n}” lejátszót.", { n: par.nev }))} <button class="bgomb" data-a="tvatall" data-i="${i}">${T("Átállítás")}</button></div>`
            : this._tvJelolt(h.entity) ? `<div class="btipp">${ESC(T("Tipp: ha ennek az eszköznek van képernyője, a Cantabile integráció beállításaiban (TV-lejátszók) felvéve a szám a képernyőn is megjelenik."))}</div>` : ""; return `<div class="bsor hsz2">${be("hangszorok", i, "nev", h.nev, `placeholder="${T("Név")}"`)}${be("hangszorok", i, "rovid", h.rovid, `maxlength="${NEV_MAX}" placeholder="${T("max. 8")}"`)}<select data-l="hangszorok" data-i="${i}" data-m="entity">${opc(h.entity)}</select><select data-l="hangszorok" data-i="${i}" data-m="mod"><option value="sonos" ${h.mod === "sonos" ? "selected" : ""}>Sonos</option><option value="url" ${h.mod !== "sonos" ? "selected" : ""}>${T("Egyéb (sor nélkül, pl. WiiM)")}</option></select><button class="bx" data-a="torol" data-l="hangszorok" data-i="${i}" title="${T("Törlés")}">×</button></div>${figy}`; }).join("")}
        </section>
        <section class="bresz"><h3>${T("Tape deck")}</h3>
          <div class="bsor ket"><label>${T("Zenemappa")}</label>${be("magno", 0, "nas", sz.magno.nas, 'placeholder="media-source://media_source/local/Music"')}</div>
          <div class="bsor ket"><label>${T("48 kHz-es másolatok mappája")}</label>${be("magno", 0, "hires", sz.magno.hires, `placeholder="${T("(nincs)")}"`)}</div>
          <div class="bsor ket"><label>${T("Feltöltések mappája")}</label>${be("magno", 0, "feltoltes", sz.magno.feltoltes, `placeholder="${TEL_ALAP}"`)}</div>
          <div class="bsor ket"><label>${T("Saját lejátszó-szkript")}</label>${be("magno", 0, "szkript", sz.magno.szkript, `placeholder="${T("(beépített)")}"`)}</div>
          <div class="bsor ket"><label>${T("Kijelző")}</label><select data-l="magno" data-i="0" data-m="vu_kijelzo"><option value="deprez" ${sz.magno.vu_kijelzo !== "fluor" ? "selected" : ""}>${T("Deprez-műszer (mutatós VU)")}</option><option value="fluor" ${sz.magno.vu_kijelzo === "fluor" ? "selected" : ""}>${T("Fluoreszcens kijelző (VFD)")}</option></select></div>
          <div class="bsor ket"><label>${T("VU-késleltetés (mp)")}</label>${be("magno", 0, "vu_kesleltetes_mp", sz.magno.vu_kesleltetes_mp, 'inputmode="decimal" placeholder="0"')}</div>
        </section>
      </div>`;
    b.querySelectorAll("input[data-l], select[data-l]").forEach((el) => el.addEventListener("input", () => this._beallIr(el)));
    b.querySelectorAll("select[data-l]").forEach((el) => el.addEventListener("change", () => this._beallIr(el)));
    b.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", () => this._beallMuvelet(el)));
    b.querySelector("#bkeres").addEventListener("keydown", (e) => { if (e.key === "Enter") this._keres(); });
  }

  _beallIr(el) {
    const sz = this._szerk, { l, i, m } = el.dataset;
    if (l === "_") sz[m] = m === "deezer" ? el.value === "1" : el.value;
    else if (l === "hangszorok" && m === "entity") {
      // új lejátszó: a típus a platformjából
      sz.hangszorok[Number(i)].entity = el.value;
      sz.hangszorok[Number(i)].mod = this._hass?.entities?.[el.value]?.platform === "sonos" ? "sonos" : "url";
      if (el.tagName === "SELECT") { const t = el.parentElement.querySelector('select[data-m="mod"]'); if (t) t.value = sz.hangszorok[Number(i)].mod; }
      if (el.tagName === "SELECT" && (this._tvPar(el.value) || this._tvJelolt(el.value) || el.parentElement.nextElementSibling?.matches?.(".bfigy, .btipp"))) setTimeout(() => this._beallRajz(), 0);
    }
    else if (l === "magno") sz.magno[m] = el.value;
    else sz[l][Number(i)][m] = el.value;
  }

  async _beallMuvelet(el) {
    const sz = this._szerk, a = el.dataset.a, i = Number(el.dataset.i);
    if (a === "megse") return this._beallZar();
    if (a === "ment") return this._beallMent();
    if (a === "ujado") { sz.adok.push({ nev: "", frekvencia: "", url: "" }); return this._beallRajz(); }
    if (a === "ujhsz") { sz.hangszorok.push({ nev: "", entity: "", mod: "url" }); return this._beallRajz(); }
    if (a === "torol") { sz[el.dataset.l].splice(i, 1); return this._beallRajz(); }
    if (a === "tvatall") { const par = this._tvPar(sz.hangszorok[i].entity); if (par) Object.assign(sz.hangszorok[i], { entity: par.entity, mod: "url" }); return this._beallRajz(); }
    if (a === "keres") return this._keres();
    if (a === "felvesz") {
      const t = this._talalatok[i];
      const f = /(?:^|\D)(8[7-9]|9\d|10[0-8])[.,](\d)(?!\d)/.exec(t.name);
      sz.adok.push({ nev: t.name.trim(), frekvencia: f ? `${f[1]}.${f[2]}` : "", url: t.url_resolved || t.url });
      return this._beallRajz(f ? "" : T("„{n}” felvéve – add meg a frekvenciáját (MHz).", { n: t.name.trim() }));
    }
    if (a === "proba") {
      const ado = sz.adok[i], hsz = this._hangszoro();
      if (!/^https?:\/\//.test(ado.url || "")) return this._beallRajz(T("A próbához adj meg egy http(s):// kezdetű stream-címet."));
      this._szkriptLeallit();
      const cim = hsz.mod === "sonos" ? `x-rincon-mp3radio://${CIM(ado.url)}` : ado.url;
      try { await this._hiv("media_player", "play_media", { entity_id: hsz.entity, media_content_id: cim, media_content_type: "music" }); this._beallRajz(T("Próba: „{n}” a(z) {h} hangszórón.", { n: ado.nev || ado.url, h: KN(hsz) })); }
      catch (err) { this._beallRajz(T("A(z) {h} nem tudta lejátszani: {e}", { h: KN(hsz), e: err?.message || err })); }
    }
  }

  async _keres() {
    const mit = (this.shadowRoot.getElementById("bkeres")?.value || "").trim();
    this._keresett = mit;
    if (mit.length < 2) return this._beallRajz(T("Írj be legalább két betűt."));
    try {
      const v = await this._rb(`/json/stations/search?name=${encodeURIComponent(mit)}&limit=12&hidebroken=true&order=clickcount&reverse=true`);
      this._talalatok = v.filter((t) => t.url_resolved || t.url);
      this._beallRajz(this._talalatok.length ? "" : T("Nincs találat – próbáld másképp írva (ékezet nélkül is)."));
    } catch (err) { this._talalatok = []; this._beallRajz(T("A keresés nem sikerült: {h}", { h: err?.message || err })); }
  }

  // ellenőrzés, majd a vezérlőpult konfigurációjában ennek a kártyának a helyére írja (lovelace/config/save; rendszergazda kell)
  async _beallMent() {
    const sz = this._szerk, hibak = [];
    const adok = sz.adok.map((a) => ({ ...a, nev: String(a.nev || "").trim(), rovid: String(a.rovid || "").trim(), url: String(a.url || "").trim(), frekvencia: String(a.frekvencia ?? "").trim() === "" ? NaN : Number(String(a.frekvencia).replace(",", ".")) }));
    adok.forEach((a, i) => {
      if (!a.nev) hibak.push(T("{n}. adó: hiányzik a név", { n: i + 1 }));
      if (Number.isFinite(a.frekvencia) && !(a.frekvencia >= 87.5 && a.frekvencia <= 108)) hibak.push(T("{n}: a frekvencia 87,5 és 108 közé essen (vagy hagyd üresen)", { n: a.nev || T("{n}. adó", { n: i + 1 }) }));
      if (!/^https?:\/\//.test(a.url)) hibak.push(T("{n}: a stream-cím http:// vagy https:// kezdetű legyen", { n: a.nev || T("{n}. adó", { n: i + 1 }) }));
    });
    const hsz = sz.hangszorok.map((h) => { const o = { nev: String(h.nev || "").trim(), entity: h.entity, mod: h.mod === "sonos" ? "sonos" : "url" }; if (String(h.rovid || "").trim()) o.rovid = String(h.rovid).trim(); return o; });
    hsz.forEach((h, i) => {
      if (!h.nev || !h.entity) hibak.push(T("{n}. hangszóró: név és lejátszó kell", { n: i + 1 }));
      else if ((h.rovid || "").length > NEV_MAX) hibak.push(T("{n}: a kártyán megjelenő név legfeljebb 8 karakter lehet", { n: h.nev }));
      else if (!h.rovid && h.nev.length > NEV_MAX) hibak.push(T("{n}: a név 8 karakternél hosszabb – adj meg rövidebb nevet a kártyára", { n: h.nev }));
    });
    if (!hsz.length) hibak.push(T("Legalább egy hangszóró kell."));
    if (hibak.length) return this._beallRajz(hibak.join(" · "));
    const magno = {};
    for (const [k, v] of Object.entries(sz.magno || {})) {
      const t = String(v ?? "").trim();
      if (t) magno[k] = k === "vu_kesleltetes_mp" ? Number(t.replace(",", ".")) || 0 : t;
    }
    // csak a szerkeszthető kulcsok: a többi (elrendezés stb.) vezérlőpultonként marad
    const uj = { marka: String(sz.marka || "").trim() || "Cantabile", hangszorok: hsz, magno,
      adok: adok.map((a) => { const o = { nev: a.nev, url: a.url }; if (Number.isFinite(a.frekvencia)) o.frekvencia = a.frekvencia; if (a.rovid) o.rovid = a.rovid; return o; }) };
    if (sz.deezer === false) uj.deezer = false;
    if (sz.felulet === "black") uj.felulet = "black";
    try {
      // minden (UI-ban tárolt) vezérlőpult azon kártyái kapják meg, amelyeken eddig ugyanazok a hangszórók és adók voltak
      // (pl. a tablet és a Mobil „Zene” oldala azonos marad); a másképp beállított (pl. szobánkénti) kártyák nem változnak
      const elso = decodeURIComponent(location.pathname.split("/")[1] || "");
      const lista = await this._hass.callWS({ type: "lovelace/dashboards/list" });
      // az alap (Áttekintés) vezérlőpult 2026.2-től „lovelace” néven a listában van, előtte nincs benne, és url_path-ja null
      const alap = lista.some((d) => d.url_path === "lovelace") ? "lovelace" : null;
      const itt = lista.some((d) => d.url_path === elso) ? elso : alap;
      const pultok = [...new Set([itt, alap, ...lista.filter((d) => d.mode === "storage").map((d) => d.url_path)])];
      const sajat = LENYOMAT(this._eredetiCfg);
      const csere = (o) => {
        let db = 0;
        // a beállítás abban a nyelvben (magyar vagy angol kulcsok) kerül vissza, amiben a kártyán volt
        const ir = (y) => {
          const angol = !!(y.speakers || y.stations || y.tape || y.brand);
          const ki = angol ? ATKULCS({ ...uj, magno: { ...uj.magno, ...(uj.magno.vu_kijelzo ? { vu_kijelzo: KIJELZO_KI[uj.magno.vu_kijelzo] || uj.magno.vu_kijelzo } : {}) } }, VISSZA) : uj;
          const regi = Object.fromEntries(Object.entries(y).filter(([k]) => !(k in KULCS) && !(k in VISSZA)));
          return { ...regi, ...ki };
        };
        const bejar = (x) => {
          const egyezik = (y) => KARTYAK.includes(y?.type) && LENYOMAT(y) === sajat;
          if (Array.isArray(x)) x.forEach((y, k) => { if (egyezik(y)) { x[k] = ir(y); db++; } else bejar(y); });
          else if (x && typeof x === "object") for (const k of Object.keys(x)) { if (egyezik(x[k])) { x[k] = ir(x[k]); db++; } else bejar(x[k]); }
        };
        bejar(o);
        return db;
      };
      const mentve = [], hibas = [];
      for (const pult of pultok) {
        let cfg;
        try { cfg = await this._hass.callWS({ type: "lovelace/config", url_path: pult || null }); } catch (e) { if (pult === itt) throw e; continue; }
        if (!csere(cfg)) { if (pult === itt) throw new Error(T("nem találom a kártyát ezen a vezérlőpulton")); continue; }
        try { await this._hass.callWS({ type: "lovelace/config/save", url_path: pult || null, config: cfg }); mentve.push(pult); }
        catch (e) { if (pult === itt) throw e; hibas.push(pult); }
      }
      this._beallZar();
      const nevek = mentve.map((u) => lista.find((d) => d.url_path === u)?.title || u || T("Áttekintés")).join(", ");
      this._uzen(T("Beállítások elmentve: {n}.", { n: nevek }) + (hibas.length ? " " + T("Nem sikerült: {h}.", { h: hibas.join(", ") }) : ""));
    } catch (err) {
      const m = String(err?.message || err?.code || err);
      this._beallRajz(/unauthorized|admin/i.test(m) ? T("A mentéshez rendszergazdai felhasználó kell.") : T("A mentés nem sikerült: {h}", { h: m }));
    }
  }

  // ---- magnó ----

  _kazetta() {
    const k = TAR.json("tablet-magno-kazetta");
    if (!k || k.entity !== this._hangszoro().entity) return null;
    return k.forras === "tel" ? { ...k, szamok: this._telKaz?.szamok } : k;
  }

  // sor nélküli lejátszó (pl. WiiM): a kazetta számai egymás után – a kártyán megadott saját szkripttel, különben az
  // integráció sorozatlejátszójával (cantabile.play_tracks); BT-n a kártya saját lejátszója
  _sorozat(hsz, szamok, kezdo = 0) {
    const sz = this._config.magno?.szkript;
    if (hsz.entity === HELYI || sz) return this._hiv("script", "turn_on", { entity_id: sz || HELYI, variables: { entity_id: hsz.entity, szamok, kezdo } });
    return this._hiv("cantabile", "play_tracks", { entity_id: hsz.entity, tracks: szamok, start: kezdo });
  }

  _szkriptLeallit(hsz = this._hangszoro()) {
    const sz = this._config.magno?.szkript;
    if (!hsz || hsz.mod !== "url") return;
    if (sz) { if (this._hass?.states[sz]?.state === "on") this._hiv("script", "turn_off", { entity_id: sz }); }
    else if (!this._nincsIntegracio) this._hiv("cantabile", "stop_tracks", { entity_id: hsz.entity }).catch(() => {});
  }

  // a nem-Sonos lejátszón a kazetta hányadik száma szól (a WiiM a címbe a fájl URL-jét írja)
  _szamIndex(k, a) {
    if (!k?.szamok) return -1;
    const most = `${a.media_content_id || ""} ${a.media_title || ""}`;
    let dekod = most; try { dekod = decodeURIComponent(most); } catch (e) { /* marad */ }
    return k.szamok.findIndex((id) => { const f = id.split("/").pop(); return most.includes(f) || dekod.includes(f); });
  }

  // HA-újraindítás után a Sonos sorában lévő NAS-számok aláírt linkjei (authSig) érvénytelenek (401): a szóló szám még
  // végigszól, de a következőt a Sonos már nem tudja letölteni. A link kiállítási ideje (iat) az indulás előtti → elavult.
  _elavultSor(hsz) {
    if (hsz?.mod !== "sonos" || !this._haIndult) return false;
    const vez = this._hass?.states[hsz.entity]?.attributes?.group_members?.[0] || hsz.entity;
    const m = /[?&]authSig=([^&\s]+)/.exec(this._hass?.states[vez]?.attributes?.media_content_id || "");
    if (!m) return false;
    try {
      const resz = m[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const iat = JSON.parse(atob(resz + "=".repeat((4 - (resz.length % 4)) % 4))).iat;
      return Number(iat) * 1000 < this._haIndult - 2000;
    } catch (e) { return false; }
  }

  // elavult linkek esetén a kazetta újratöltése friss linkekkel, a kért számnál. A számlista a Sonos saját sorából jön
  // (/media/<mappa>/… → media-source://media_source/<mappa>/…), így akkor is megy, ha másik készülékről töltötték be
  async _ujratoltElavult(hsz, hova) {
    if (!this._elavultSor(hsz)) return false;
    const vez = this._hass.states[hsz.entity]?.attributes?.group_members?.[0] || hsz.entity;
    let sor;
    try {
      const v = await this._hass.callWS({ type: "call_service", domain: "sonos", service: "get_queue", service_data: { entity_id: vez }, return_response: true });
      sor = (v?.response?.[vez] || []).map((x) => /\/media\/([^/?#]+\/[^?#]+)/.exec(x.media_content_id || "")?.[1]);
    } catch (e) { return false; }
    if (!sor.length || sor.some((x) => !x)) return false;
    const szamok = sor.map((x) => { try { return `media-source://media_source/${decodeURIComponent(x)}`; } catch (e) { return null; } });
    if (szamok.some((x) => !x)) return false;
    const regi = this._kazetta(), a = this._hass.states[vez]?.attributes || {};
    const kaz = { ...(regi?.forras === "nas" ? regi : {}), forras: "nas", szamok,
      cim: regi?.forras === "nas" ? regi.cim : a.media_album_name || FAJLNEV(szamok[0]), alcim: regi?.forras === "nas" ? regi.alcim : a.media_artist || "" };
    this._uzen(T("Újraindult a Home Assistant – a kazettát friss linkekkel töltöm újra."));
    await this._betolt(kaz, Math.min(Math.max(0, hova), szamok.length - 1));
    return true;
  }

  async _magnoGomb(k) {
    const hsz = this._hangszoro(), h = this._hass;
    if (!h || !hsz) return;
    const s = this._allapot(hsz), a = s?.attributes || {}, kaz = this._kazetta();
    const szkriptes = hsz.mod !== "sonos" && kaz?.forras === "nas";
    const e = { entity_id: hsz.entity };
    if (k === "eject") return this._polcNyit();
    if (k === "stop") { this._szkriptLeallit(); return this._hiv("media_player", "media_stop", e); }
    if (k === "pause") return this._hiv("media_player", SZUNETEL(s) ? "media_play" : "media_pause", e);
    const sorHely = (Number(a.queue_position) || 1) - 1;
    if ((k === "play" && SZUNETEL(s)) || k === "ff" || k === "rew") {
      if (await this._ujratoltElavult(hsz, k === "ff" ? sorHely + 1 : k === "rew" ? sorHely - 1 : sorHely)) return;
    }
    if (k === "play") {
      if (SZUNETEL(s)) return this._hiv("media_player", "media_play", e);
      const sz = this._szunetAtvitel;
      if (sz && sz.hova === hsz.entity && !SZOL(s)) { this._szunetAtvitel = null; return this._kazettaFolytat(sz, hsz); }
      if (SZOL(s) && this._adoIndex(hsz) < 0) return;
      if (kaz) return this._betolt(kaz);
      return this._polcNyit();
    }
    if (k === "ff" || k === "rew") {
      this._gyors(k === "rew");
      if (szkriptes && !a.cue_tracks) {
        const i = this._szamIndex(kaz, a);
        const uj = Math.min(kaz.szamok.length - 1, Math.max(0, (i < 0 ? 0 : i) + (k === "ff" ? 1 : -1)));
        return this._sorozat(hsz, kaz.szamok, uj);
      }
      return this._hiv("media_player", k === "ff" ? "media_next_track" : "media_previous_track", e);
    }
  }

  // REW / FF: rövid koppintás = előző / következő szám; nyomva tartva = tekerés a számon belül (mint a deckek CUE /
  // REVIEW-ja): a kijelző fél másodpercenként 10 mp-et lép (3 mp után 30-at), közben másfél másodpercenként oda is ugrik,
  // elengedéskor onnan szól
  _tekerKezel(b) {
    const k = b.dataset.k, elore = k === "ff";
    let ido = null, tekert = false;
    const vege = (megszakit = false) => {
      if (ido == null && !tekert) return;
      clearTimeout(ido); ido = null; b.classList.remove("lenyomva");
      if (tekert) { tekert = false; this._tekerVege(); } else if (!megszakit) this._magnoGomb(k);
    };
    b.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* régi böngésző */ }
      b.classList.add("lenyomva"); tekert = false;
      ido = setTimeout(() => { ido = null; tekert = this._tekerIndit(elore); }, 450);
    });
    b.addEventListener("pointerup", () => vege());
    b.addEventListener("pointercancel", () => vege(true));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._magnoGomb(k); } });
  }

  _tekerIndit(elore) {
    const m = this._magnoAllapot;
    if (!(m?.szol || m?.szunet)) return false;
    const { ido, hossz } = this._halad();
    if (!hossz) return false;            // élő adás: nincs mit tekerni
    const t = this._tekeres = { poz: ido, hossz, elore, kezd: Date.now(), ugrott: Date.now() };
    const mag = this.shadowRoot.getElementById("magno");
    mag.classList.add("gyors"); mag.classList.toggle("vissza", !elore);
    const lep = () => {
      if (this._tekeres !== t) return;
      const mennyi = Date.now() - t.kezd > 3000 ? 30 : 10;
      t.poz = Math.max(0, Math.min(t.hossz - 2, t.poz + (elore ? mennyi : -mennyi)));
      if (Date.now() - t.ugrott > 1500) { t.ugrott = Date.now(); this._ugrik(t.poz); }
      this._szalagRajz();
      t.ido = setTimeout(lep, 500);
    };
    lep();
    return true;
  }

  _tekerVege() {
    const t = this._tekeres; this._tekeres = null;
    this.shadowRoot.getElementById("magno").classList.remove("gyors", "vissza");
    if (!t) return;
    clearTimeout(t.ido);
    this._ugrik(t.poz);
  }

  // ugrás a szóló számon belül (mp); a kijelző addig ezt mutatja, amíg a lejátszó vissza nem jelez
  _ugrik(poz) {
    const hsz = this._hangszoro(); if (!hsz) return;
    this._ugras = { poz, mikor: Date.now() };
    this._szalagRajz();
    this._hiv("media_player", "media_seek", { entity_id: hsz.entity, seek_position: Math.round(poz) })
      .catch((e) => this._uzen(T("A tekerés nem sikerült: {h}", { h: e?.message || e })));
  }

  // a kazetta idősávja: koppintásra / húzásra oda ugrik a számban
  _csikKezel(el) {
    if (!el) return;
    const hely = (e) => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    let fog = null;
    el.addEventListener("pointerdown", (e) => {
      const m = this._magnoAllapot, { hossz } = m?.szol || m?.szunet ? this._halad() : { hossz: 0 };
      if (!hossz || e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* régi böngésző */ }
      fog = { hossz };
      this._tekeres = { poz: hely(e) * hossz, hossz, csik: true };
      this._szalagRajz();
    });
    el.addEventListener("pointermove", (e) => { if (fog && this._tekeres?.csik) { this._tekeres.poz = hely(e) * fog.hossz; this._szalagRajz(); } });
    const vege = (e, ugrik) => {
      if (!fog) return;
      const poz = hely(e) * fog.hossz; fog = null; this._tekeres = null;
      if (ugrik) this._ugrik(Math.min(poz, (this._halad().hossz || poz) - 2)); else this._szalagRajz();
    };
    el.addEventListener("pointerup", (e) => vege(e, true));
    el.addEventListener("pointercancel", (e) => vege(e, false));
  }

  _gyors(vissza) {
    const m = this.shadowRoot.getElementById("magno");
    m.classList.add("gyors"); m.classList.toggle("vissza", vissza);
    clearTimeout(this._gyorsIdo);
    this._gyorsIdo = setTimeout(() => m.classList.remove("gyors", "vissza"), 1300);
  }

  // kazetta betöltése: {cim, alcim, forras: stream|nas, id, tipus, szamok?}
  async _betolt(kaz, kezdo = 0) {
    const hsz = this._hangszoro(), h = this._hass, e = { entity_id: hsz.entity };
    if (!kaz.atmeneti) this._atmenetiAll = null;     // új kazetta: a háttérben futó átmeneti feltöltés leáll
    const ablak = this.shadowRoot.getElementById("ablak");
    ablak.classList.add("tolt");
    setTimeout(() => ablak.classList.remove("tolt"), 450);
    try {
      if (kaz.forras === "tel") {
        // a telefonról választott számok: csak a BT kimeneten (ezen a készüléken) szólnak
        if (!kaz.szamok?.length) { this._polc = { ful: "tel", ut: [] }; this._polcRajz(); return; }
        this._telKaz = kaz;
        // nem BT kimenet: átmeneti feltöltéssel a választott hangszórón szól (a régi tartalmát az új kazetta lecseréli)
        if (hsz.entity !== HELYI) return this._telAtmenet(kaz, kezdo, 0, hsz);
        this._helyiLista = { szamok: kaz.szamok, i: 0, tel: true };
        await this._helyiSzam(0);
        TAR.ir("tablet-magno-kazetta", JSON.stringify({ cim: kaz.cim, alcim: kaz.alcim, forras: "tel", id: kaz.id, entity: HELYI }));
        return this._frissit();
      }
      if (kaz.forras === "stream") {
        if (hsz.mod !== "sonos" && kaz.tipus === "spotify" && this._stream?.spotify_entity && hsz.entity !== HELYI) return this._spotifyConnect(kaz, hsz);
        if (hsz.mod !== "sonos") throw new Error(T("A streaming kazetta csak Sonos hangszórón szól."));
        if (kaz.tipus === "spotify" && /^spotify:\/\//.test(kaz.id)) {
          // a HA Spotify-integrációjának könyvtárából (a Sonos-integráció alakítja Spotify-címmé)
          await this._hiv("media_player", "play_media", { ...e, media_content_id: kaz.id, media_content_type: kaz.mtype || "playlist" });
        } else if (["deezer", "spotify", "tidal"].includes(kaz.tipus)) {
          // Deezer-link (album, lista, szám) vagy linkek listája (előadó népszerű számai): a Sonos a Deezer-fiókjával játssza;
          // az első után már szól, a többi utána kerül a sorba
          const ids = kaz.szamok?.length ? kaz.szamok : [kaz.id];
          await this._hiv("media_player", "clear_playlist", e);
          await this._hiv("media_player", "play_media", { ...e, media_content_id: ids[0], media_content_type: "music", enqueue: "add" });
          await this._hiv("sonos", "play_queue", { ...e, queue_position: kezdo });
          await this._hiv("media_player", "repeat_set", { ...e, repeat: this._korok() === 1 ? "off" : "all" });
          for (const id of ids.slice(1)) await this._hiv("media_player", "play_media", { ...e, media_content_id: id, media_content_type: "music", enqueue: "add" });
        } else
        await this._hiv("media_player", "play_media", { ...e, media_content_id: kaz.id, media_content_type: kaz.tipus || "favorite_item_id" });
      } else {
        if (!kaz.szamok?.length) kaz.szamok = await this._albumSzamok(kaz.id);
        if (!kaz.szamok.length) throw new Error(T("Ebben a mappában nincs lejátszható szám."));
        if (hsz.mod === "sonos") {
          const lista = await this._sonosValtozat(kaz.szamok);
          // egyszámos kazettánál a körök másolatként kerülnek a sorba (egy szám ismétlésekor a Sonos nem jelez, nem számolható)
          const kor = this._korok(), egy = lista.length === 1;
          const sor = egy && kor >= 2 && kor <= 5 ? Array(kor).fill(lista[0]) : lista;
          await this._hiv("media_player", "clear_playlist", e);
          for (const id of sor) await this._hiv("media_player", "play_media", { ...e, media_content_id: id, media_content_type: "music", enqueue: "add" });
          await this._hiv("sonos", "play_queue", { ...e, queue_position: Math.min(kezdo, lista.length - 1) });
          await this._hiv("media_player", "repeat_set", { ...e, repeat: kor === 1 || (egy && kor <= 5) ? "off" : "all" });
        } else {
          await this._sorozat(hsz, kaz.szamok, Math.min(kezdo, kaz.szamok.length - 1));
        }
      }
      TAR.ir("tablet-magno-kazetta", JSON.stringify({ ...kaz, entity: hsz.entity }));
      this._frissit();
    } catch (err) {
      const m = err?.message || String(err);
      this._uzen(kaz?.tipus === "deezer" ? T("A Deezer nem indult el ({h}). A Sonos appban kösd be a Deezer-fiókot (Beállítások → Szolgáltatások), vagy a ⚙ beállításokban rejtsd el a DEEZER fület.", { h: m }) : m);
    }
  }

  // Sonosnak a 48 kHz-es másolat, ha van: NAS/<előadó>/<album>/<fájl> → NAS/<magno.hires>/<előadó>/<album [24Bit-48kHz] | album [48kHz]>/<fájl>
  async _sonosValtozat(szamok) {
    const gyoker = this._config.magno?.nas, hires = this._config.magno?.hires;
    if (!gyoker || !hires || !szamok.length || !szamok[0].startsWith(`${gyoker}/`)) return szamok;
    const resz = szamok[0].slice(gyoker.length + 1).split("/");
    if (resz.length !== 3 || resz[0] === hires) return szamok;
    const [eloado, album] = resz;
    const jeloltek = [...new Set([album.replace("[24Bit-192kHz]", "[24Bit-48kHz]"), `${album} [48kHz]`])];
    for (const j of jeloltek) {
      try {
        const r = await this._bongesz(`${gyoker}/${hires}/${eloado}/${j}`);
        const van = new Map((r.children || []).map((x) => [x.media_content_id.split("/").pop(), x.media_content_id]));
        if (van.size) return szamok.map((id) => van.get(id.split("/").pop()) || id);
      } catch (err) { /* nincs ilyen mappa */ }
    }
    return szamok;
  }

  _telMappa() { return this._config.magno?.feltoltes || TEL_ALAP; }

  // üzenet a lejátszón: külön réteg a kártya fölött (az elrendezést nem érinti), a kártya látható részén; becsúszik, majd elhalványul.
  // Ha a kártya épp nem látszik (pl. a lapozó másik lapján), a HA saját értesítője jön.
  _uzen(szoveg) {
    const kartya = this.shadowRoot?.querySelector("ha-card"), r = kartya?.getBoundingClientRect();
    const fent = r ? Math.max(0, -r.top) : 0, lent = r ? Math.min(r.height, innerHeight - r.top) : 0;
    if (!kartya || !r.width || lent - fent < 80) {
      this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: szoveg }, bubbles: true, composed: true }));
      return;
    }
    let reteg = kartya.querySelector(".uzreteg");
    if (!reteg) {
      reteg = document.createElement("div");
      reteg.className = "uzreteg";
      reteg.innerHTML = `<div class="uzablak" role="status" aria-live="polite"><div class="uzfej"><i></i>CANTABILE</div><div class="uzszoveg"></div><div class="uzido"></div></div>`;
      reteg.querySelector(".uzablak").addEventListener("click", () => this._uzenZar());
      kartya.appendChild(reteg);
    }
    const ablak = reteg.querySelector(".uzablak"), ido = Math.min(10000, 4000 + String(szoveg).length * 55);
    reteg.querySelector(".uzszoveg").textContent = szoveg;
    reteg.style.top = `${Math.round(fent + (lent - fent) * 0.3)}px`;
    const csik = reteg.querySelector(".uzido");
    csik.style.animation = "none"; void csik.offsetWidth; csik.style.animation = `uzfogy ${ido}ms linear forwards`;
    ablak.classList.remove("zar"); void ablak.offsetWidth; ablak.classList.add("lat");
    clearTimeout(this._uzenIdo);
    this._uzenIdo = setTimeout(() => this._uzenZar(), ido);
  }

  _uzenZar() {
    clearTimeout(this._uzenIdo);
    const ablak = this.shadowRoot?.querySelector(".uzreteg .uzablak");
    if (ablak?.classList.contains("lat")) { ablak.classList.add("zar"); ablak.classList.remove("lat"); }
  }

  async _bongesz(id) {
    return this._hass.callWS({ type: "media_source/browse_media", media_content_id: id });
  }

  async _albumSzamok(id) {
    const r = await this._bongesz(id);
    return (r.children || []).filter(ZENE)
      .sort((x, y) => x.title.localeCompare(y.title, NYELV(), { numeric: true })).slice(0, 80).map((x) => x.media_content_id);
  }

  // ---- kazetta-polc ----

  _polcNyit() {
    if (this._mod !== "magno") { this._mod = "magno"; this._frissit(); }
    const ful = TAR.olvas("tablet-magno-ful");
    const lehet = ["nas", "tel", ...(this._vanSonos() ? ["stream", ...(this._config.deezer !== false ? ["deezer"] : [])] : []), ...["spotify", "tidal"].filter((x) => this._szolgLatszik(x))];
    this._polc = { ful: lehet.includes(ful) ? ful : this._vanSonos() ? "stream" : "nas", ut: [] };
    this._polcRajz();
  }

  // a STREAMING (Sonos-kedvencek) és a DEEZER fül csak Sonos hangszóró mellett van
  _vanSonos() { return this._config.hangszorok.some((x) => x.mod === "sonos"); }

  // ---- dalszöveg (cantabile/lyrics → LRCLIB): a kazetta címére vagy a rádió dalt mutató műsorinfójára koppintva ----
  // a magnón az időzített szövegből a lejátszással együtt kiemeli és középre görgeti az épp szóló sort; a rádiónál
  // (élő adás, nincs pozíció) kiemelés nélkül; ha közben másik dal jön, magától újra lekéri
  async _dalNyit(hol) {
    const d = hol === "r" ? this._radioDal : this._kazDal;
    if (!d) return;
    this._polcZar(); if (this._net) this._netZar();
    const kulcs = `${d.artist}|${d.title}`;
    this._dal = { hol, d, kulcs, v: null, most: -1, kezi: 0 };
    this._dalRajz(T("Betöltés…"));
    if (!this._dalOra) this._dalOra = setInterval(() => this._dalLep(), 300);
    let v;
    try {
      v = await this._hass.callWS({ type: "cantabile/lyrics", artist: d.artist, title: d.title, album: d.album || null, duration: d.duration || null });
    } catch (e) {
      if (this._dal?.kulcs === kulcs) this._dalRajz(T(e?.code === "unknown_command" ? "A Cantabile integráció nincs telepítve." : "A dalszöveg-szolgáltatás nem érhető el."));
      return;
    }
    if (this._dal?.kulcs !== kulcs) return;
    this._dal.v = v;
    this._dalRajz(!v.found ? T("Nincs dalszöveg ehhez a dalhoz.") : v.instrumental && !v.synced && !v.plain ? T("Instrumentális szám – nincs szövege.") : null);
  }

  _dalRajz(uzenet) {
    const dl = this._dal, sr = this.shadowRoot;
    if (!dl) return;
    const p = sr.getElementById(dl.hol === "r" ? "dalpolc_r" : "dalpolc_m");
    p.hidden = false;
    const v = dl.v, szinkron = dl.hol === "m" && v?.synced?.length;
    let test = `<div class="duzenet">${ESC(uzenet || "")}</div>`;
    if (!uzenet && v) {
      const sorok = szinkron ? v.synced.map(([t, x]) => [t, x]) : (v.plain || (v.synced || []).map((x) => x[1]).join("\n")).split("\n").map((x) => [null, x]);
      test = `<div class="dlista${szinkron ? " szinkron" : ""}">${sorok.map(([t, x]) => `<p${t != null ? ` data-t="${t}"` : ""}${x.trim() ? "" : ' class="szunet"'}>${x.trim() ? ESC(x) : "♪ ♪ ♪"}</p>`).join("")}</div>`;
    }
    p.innerHTML = `
      <div class="pfej"><span class="pful akt">LYRICS</span><div class="put">${ESC(dl.d.artist)} – ${ESC(dl.d.title)}</div><button class="pzar" title="${T("Bezár")}">×</button></div>
      ${test}
      <div class="dlab"><span>${dl.hol === "r" && v?.found ? ESC(T("Rádióadásnál a pontos hely nem ismert, a szöveg kiemelés nélkül látszik.")) : ""}</span><span>lrclib.net</span></div>`;
    p.querySelector(".pzar").addEventListener("click", () => this._dalZar());
    const l = p.querySelector(".dlista");
    if (l) ["wheel", "touchstart", "mousedown"].forEach((e) => l.addEventListener(e, () => { dl.kezi = Date.now(); }, { passive: true }));
    // időzített szövegnél fent-lent fél doboznyi hely, hogy az első és az utolsó sor is középre görgethető legyen
    if (l && szinkron) l.style.paddingBlock = `${Math.round(l.clientHeight * 0.42)}px`;
    dl.most = -1;
    this._dalLep();
  }

  _dalLep() {
    const dl = this._dal;
    if (!dl || !this.isConnected) return this._dalZar();
    // másik dal szól → új szöveg (ha épp semmi, a régi marad)
    const uj = dl.hol === "r" ? this._radioDal : this._kazDal;
    if (uj && `${uj.artist}|${uj.title}` !== dl.kulcs) return this._dalNyit(dl.hol);
    if (dl.hol !== "m" || !dl.v?.synced?.length) return;
    const a = this._magnoAllapot?.s?.attributes || {}, fut = this._magnoAllapot?.szol;
    if (a.media_position == null) return;
    const poz = a.media_position + (fut && a.media_position_updated_at ? (Date.now() - Date.parse(a.media_position_updated_at)) / 1000 : 0);
    const s = dl.v.synced;
    let i = -1;
    for (let k = 0; k < s.length && s[k][0] <= poz + 0.25; k++) i = k;
    if (i === dl.most) return;
    dl.most = i;
    const l = this.shadowRoot.querySelector("#dalpolc_m .dlista");
    if (!l) return;
    l.querySelectorAll("p.most").forEach((x) => x.classList.remove("most"));
    const el = i >= 0 ? l.children[i] : null;
    if (!el) return;
    el.classList.add("most");
    if (Date.now() - dl.kezi > 4000) l.scrollTo({ top: el.offsetTop - l.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }

  _dalZar() {
    this._dal = null;
    if (this._dalOra) { clearInterval(this._dalOra); this._dalOra = null; }
    this.shadowRoot?.querySelectorAll(".dalpolc").forEach((p) => { p.hidden = true; p.innerHTML = ""; });
  }

  _polcZar() {
    this._polc = null;
    const p = this.shadowRoot.getElementById("polc");
    if (p) { p.hidden = true; p.innerHTML = ""; }
  }

  // ---- NET: internetes rádióadók a Radio Browserből (népszerű magyar / világ / műfaj / név szerint), gombra mentés nélkül ----
  async _rb(ut) {
    let hiba;
    for (const sz of await RB_SZERVEREK()) {
      const ctl = new AbortController(), ido = setTimeout(() => ctl.abort(), 8000);
      try {
        const v = await fetch(sz + ut, { signal: ctl.signal });
        if (!v.ok) throw new Error(`HTTP ${v.status}`);
        return await v.json();
      } catch (e) { hiba = e; } finally { clearTimeout(ido); }
    }
    throw hiba;
  }

  // a „hazai” fül: a Home Assistant beállított országa (Beállítások → Rendszer → Általános)
  // (ha nincs megadva: a böngésző nyelvének régiója, pl. en-GB → GB; végül a magyar)
  _orszag() {
    const r = /^[a-z]{2,3}-([A-Z]{2})\b/i.exec(navigator.language || "");
    return String(this._hass?.config?.country || r?.[1] || "HU").toUpperCase();
  }

  _netNyit() {
    const ful = TAR.olvas("tablet-radio-netful");
    this._net = { ful: ["hu", "vilag", "mufaj"].includes(ful) ? ful : "hu", tag: null, keres: "" };
    this._netRajz();
    this._frissit();
  }

  _netZar() {
    this._net = null;
    const p = this.shadowRoot?.getElementById("netpolc");
    if (p) { p.hidden = true; p.innerHTML = ""; }
    this._frissit();
  }

  _netRajz() {
    const p = this.shadowRoot.getElementById("netpolc"), n = this._net;
    if (!p || !n) return;
    p.hidden = false;
    const orszag = this._orszag(), fulek = [["hu", orszag], ["vilag", "WORLD"], ["mufaj", "GENRE"]];
    const ut = n.ful === "mufaj" && n.tag && !n.keres ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(n.tag)}`
      : `<input class="pkeres" id="nkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Adó keresése név szerint…")}" value="${ESC(n.keres || "")}">`;
    p.innerHTML = `
      <div class="pfej">
        ${fulek.map(([k, t]) => `<button class="pful ${n.ful === k ? "akt" : ""}" data-ful="${k}">${t}</button>`).join("")}
        <div class="put">${ut}</div>
        <button class="pzar" title="${T("Bezár")}">×</button>
      </div>
      <div class="ptest"><div class="plista"></div></div>`;
    p.querySelectorAll(".pful").forEach((b) => b.addEventListener("click", () => {
      Object.assign(n, { ful: b.dataset.ful, tag: null, keres: "" }); TAR.ir("tablet-radio-netful", n.ful); this._netRajz();
    }));
    p.querySelector(".pzar").addEventListener("click", () => this._netZar());
    p.querySelector("[data-vissza]")?.addEventListener("click", () => { n.tag = null; this._netRajz(); });
    const lista = p.querySelector(".plista"), inp = p.querySelector("#nkeres");
    inp?.addEventListener("input", () => {
      n.keres = inp.value; clearTimeout(this._netIdo);
      this._netIdo = setTimeout(() => this._netLista(lista), 450);
    });
    inp?.addEventListener("keydown", (e) => { if (e.key === "Enter") inp.blur(); });
    this._netLista(lista);
  }

  async _netLista(lista) {
    const n = this._net; if (!n) return;
    const kulcs = (x) => JSON.stringify([x?.ful, x?.tag, KERES_NORM(x?.keres || "").trim()]), most = kulcs(n);
    const q = "hidebroken=true&order=clickcount&reverse=true&limit=60";
    const nev = (n.keres || "").trim();
    lista.innerHTML = `<div class="puzenet">${T("Betöltés…")}</div>`;
    try {
      let adok;
      if (nev.length >= 2) adok = await this._rb(`/json/stations/search?name=${encodeURIComponent(nev)}&${q}`);
      else if (n.ful === "mufaj" && !n.tag) {
        const tagek = (await this._rb("/json/tags?order=stationcount&reverse=true&limit=60&hidebroken=true")).filter((t) => t.name && /^[\p{L}0-9 &'-]{2,24}$/u.test(t.name));
        if (most !== kulcs(this._net)) return;
        lista.innerHTML = `<div class="eloadok">${tagek.map((t, i) => `<button data-t="${i}">${ESC(t.name)} <small>${t.stationcount}</small></button>`).join("")}</div>`;
        lista.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { n.tag = tagek[Number(b.dataset.t)].name; this._netRajz(); }));
        return;
      } else if (n.ful === "mufaj") adok = await this._rb(`/json/stations/search?tag=${encodeURIComponent(n.tag)}&tagExact=true&${q}`);
      else if (n.ful === "hu") adok = await this._rb(`/json/stations/search?countrycode=${this._orszag()}&${q}`);
      else adok = await this._rb(`/json/stations/search?${q}`);
      if (most !== kulcs(this._net)) return;
      // a HLS (.m3u8) adókat a Sonos nem játssza; az azonos nevű és című ismétlődések kiesnek
      const latott = new Set();
      adok = adok.filter((t) => {
        const u = t.url_resolved || t.url, k = `${(t.name || "").trim().toLowerCase()}|${CIM(u)}`;
        if (!u || t.hls || /\.m3u8(\?|$)/i.test(u) || latott.has(k)) return false;
        latott.add(k); return true;
      }).slice(0, 40);
      if (!adok.length) { lista.innerHTML = `<div class="puzenet">${nev ? T("Nincs találat erre: „{q}”.", { q: ESC(nev) }) : T("Nincs találat.")}</div>`; return; }
      const k = this._radioAll?.i === KULSO ? this._kulso() : null;
      lista.innerHTML = `<div class="netlista">${adok.map((t, i) => {
        const meta = [t.countrycode, [t.codec, t.bitrate ? `${t.bitrate} kbps` : ""].filter(Boolean).join(" "), (t.tags || "").split(",").filter(Boolean).slice(0, 2).join(", ")].filter(Boolean).join(" · ");
        const akt = k && CIM(k.url) === CIM(t.url_resolved || t.url);
        return `<div class="nsor${akt ? " akt" : ""}"><button class="nado" data-i="${i}"><span class="nlogo">${t.favicon ? `<img src="${ESC(t.favicon)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>
          <span class="st"><b>${ESC((t.name || "").trim())}</b><small>${ESC(meta)}</small></span></button>
          <button class="ngomb" data-g="${i}" title="${T("Gombra (⚙ beállításokban)")}">${T("+ gombra")}</button></div>`;
      }).join("")}</div>`;
      lista.querySelectorAll(".nlogo img").forEach((im) => im.addEventListener("error", () => im.remove()));
      lista.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => this._netIndit(adok[Number(b.dataset.i)])));
      lista.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => this._netGombra(adok[Number(b.dataset.g)])));
    } catch (err) {
      if (most === kulcs(this._net)) lista.innerHTML = `<div class="puzenet">${T("A Radio Browser most nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`;
    }
  }

  // NET-adó indítása a kiválasztott hangszórón; a kártya megjegyzi, hogy felismerje (oldalfrissítés után is)
  async _netIndit(t, kattint = true) {
    const hsz = this._hangszoro();
    if (!this._hass || !hsz) return;
    const url = t.url_resolved || t.url;
    const k = { nev: (t.name || "").trim(), url, ikon: t.favicon || "", orszag: t.countrycode || "", kodek: t.codec || "", kbps: t.bitrate || 0 };
    TAR.ir("tablet-radio-kulso", JSON.stringify(k));
    this._kezi = { i: KULSO, ido: Date.now(), elotte: CIM(this._allapot(hsz)?.attributes?.media_content_id || "") };
    this._szkriptLeallit();
    this._netZar();
    const cim = hsz.mod === "sonos" ? `x-rincon-mp3radio://${CIM(url)}` : url;
    try { await this._hiv("media_player", "play_media", { entity_id: hsz.entity, media_content_id: cim, media_content_type: "music" }); }
    catch (err) { this._kezi = null; this._uzen(T("A(z) {h} nem tudta lejátszani: {e}", { h: KN(hsz), e: err?.message || err })); }
    // a Radio Browser népszerűségi számlálója (az adatbázis kéri lejátszáskor)
    if (kattint && t.stationuuid) this._rb(`/json/url/${t.stationuuid}`).catch(() => {});
    this._frissit();
  }

  _netGombra(t) {
    this._netZar(); this._beallNyit();
    const f = /(?:^|\D)(8[7-9]|9\d|10[0-8])[.,](\d)(?!\d)/.exec(t.name || "");
    this._szerk.adok.push({ nev: (t.name || "").trim(), frekvencia: f ? `${f[1]}.${f[2]}` : "", url: t.url_resolved || t.url });
    this._beallRajz(f ? T("„{n}” felvéve – a Mentéssel gombként is megmarad.", { n: (t.name || "").trim() }) : T("„{n}” felvéve – add meg a frekvenciáját (MHz), majd Mentés.", { n: (t.name || "").trim() }));
  }

  // ---- kereső: a NAS teljes listája egyszer jön a szervertől (cantabile/nas_list), a szűrés itt történik ----
  async _nasLista(frissit = false) {
    const nas = this._config.magno?.nas;
    if (!frissit && this._nasTar && this._nasTar.nas === nas && Date.now() - this._nasTar.ido < 30 * 60000) return this._nasTar.l;
    const l = await this._hass.callWS({ type: "cantabile/nas_list", mappa: nas, frissit });
    const nev = (x) => x.split("/").pop();
    l.m = l.mappak.map((x) => ({ rel: x, kulcs: KERES_NORM(x), nev: nev(x) }));
    l.f = l.fajlok.map((x) => ({ rel: x, kulcs: KERES_NORM(x), nev: nev(x).replace(/\.[^.]+$/, "") }));
    this._nasTar = { nas, ido: Date.now(), l };
    return l;
  }

  // nem helyi zenetár (pl. Jellyfin, DLNA-médiaszerver): a HA médiakeresője; ahol nincs ilyen, böngészni kell
  async _kulsoKeresRajz(lista) {
    const pl = this._polc, kerdes = pl.keres || "";
    lista.innerHTML = `<div class="puzenet">${T("Keresés…")}</div>`;
    let r;
    try { r = await this._hass.callWS({ type: "media_source/search_media", media_content_id: this._config.magno.nas, search_query: kerdes }); }
    catch (e) { if (this._polc === pl) lista.innerHTML = `<div class="puzenet">${T("Ebben a zenetárban nincs keresés – böngéssz a mappák között (töröld a keresőt).")}</div>`; return; }
    if (this._polc !== pl || pl.keres !== kerdes) return;
    const elemek = (r?.result || []).slice(0, 80), mappak = elemek.filter((x) => x.can_expand), szamok = elemek.filter(ZENE);
    const sor = (t, i, x) => `<div class="ktsor"><button data-${t}="${i}"><b>${ESC(x.title)}</b>${x.media_class ? `<small>${ESC(x.media_class)}</small>` : ""}</button></div>`;
    lista.innerHTML = !mappak.length && !szamok.length ? `<div class="puzenet">${T("Nincs találat erre: „{q}”.", { q: ESC(kerdes) })}</div>`
      : (mappak.length ? `<h5 class="kcsop">ALBUMS<span>${mappak.length}</span></h5><div class="ktalal">${mappak.map((x, i) => sor("m", i, x)).join("")}</div>` : "")
      + (szamok.length ? `<h5 class="kcsop">TRACKS<span>${szamok.length}</span></h5><div class="ktalal">${szamok.map((x, i) => sor("s", i, x)).join("")}</div>` : "");
    lista.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { const x = mappak[Number(b.dataset.m)]; pl.ut = [{ id: x.media_content_id, cim: x.title }]; pl.keres = ""; this._polcRajz(); }));
    lista.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => {
      const x = szamok[Number(b.dataset.s)]; this._polcZar();
      this._betolt({ cim: x.title, alcim: "", forras: "nas", id: x.media_content_id, szamok: [x.media_content_id] });
    }));
  }

  async _keresRajz(lista) {
    if (!HELYI_TAR(this._config.magno?.nas)) return this._kulsoKeresRajz(lista);
    const pl = this._polc, nas = this._config.magno?.nas; if (!pl || !nas) return;
    const kerdes = pl.keres || "", szavak = KERES_NORM(kerdes).split(/\s+/).filter(Boolean);
    lista.innerHTML = `<div class="puzenet">${T("Keresés…")}</div>`;
    let l;
    try { l = await this._nasLista(); } catch (err) {
      lista.innerHTML = `<div class="puzenet">${T("A keresés nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`; return;
    }
    if (this._polc !== pl || pl.keres !== kerdes) return;
    const illik = (x) => szavak.every((w) => x.kulcs.includes(w));
    const MAX = 30;
    const kihagy = [this._telMappa(), this._config.magno?.hires].filter(Boolean);
    const eloadok = l.m.filter((x) => !x.rel.includes("/") && !kihagy.includes(x.rel) && illik(x)).slice(0, MAX);
    const albumok = l.m.filter((x) => x.rel.includes("/") && illik(x)).slice(0, MAX);
    const szamok = l.f.filter(illik).slice(0, MAX);
    const szulo = (rel) => rel.split("/").slice(0, -1).join(" › ");
    const hsz = this._hangszoro(), hs = this._hass?.states[hsz.entity]?.attributes || {};
    const sorba = hsz.mod === "sonos" && Number(hs.queue_size) > 0 && !hs.shuffle;
    const gombok = (tipus, i) => sorba ? `<span class="sorm"><button class="sm" data-${tipus}n="${i}" title="${T("Következőnek")}">${SI.kov}</button><button class="sm" data-${tipus}v="${i}" title="${T("Sor végére")}">${SI.vegere}</button></span>` : "";
    const csoport = (cim, db, belso) => db ? `<h5 class="kcsop">${cim}<span>${db >= MAX ? `${MAX}+` : db}</span></h5>${belso}` : "";
    lista.innerHTML = (eloadok.length + albumok.length + szamok.length === 0)
      ? `<div class="puzenet">${T("Nincs találat erre: „{q}”.", { q: ESC(kerdes) })}</div>`
      : csoport("ARTISTS", eloadok.length, `<div class="eloadok">${eloadok.map((x, i) => `<button data-e="${i}">${ESC(x.nev)}</button>`).join("")}</div>`)
        + csoport("ALBUMS", albumok.length, `<div class="ktalal">${albumok.map((x, i) => `<div class="ktsor"><button data-a="${i}"><b>${ESC(x.nev)}</b><small>${ESC(szulo(x.rel))}</small></button>${gombok("a", i)}</div>`).join("")}</div>`)
        + csoport("TRACKS", szamok.length, `<div class="ktalal">${szamok.map((x, i) => `<div class="ktsor"><button data-s="${i}"><b>${ESC(x.nev)}</b><small>${ESC(szulo(x.rel) || "NAS")}</small></button>${gombok("s", i)}</div>`).join("")}</div>`)
        + (hsz.mod === "sonos" && Number(hs.queue_size) > 0 && hs.shuffle ? `<div class="puzenet">${T("Keverés közben a „következőnek” és a „sor végére” nem érhető el (a Sonos véletlen helyre tenné).")}</div>` : "");
    lista.scrollTop = 0;
    lista.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => {
      const x = eloadok[Number(b.dataset.e)]; pl.ful = "nas"; pl.ut = [{ id: `${nas}/${x.rel}`, cim: x.nev }]; this._polcRajz();
    }));
    lista.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", async () => {
      const x = albumok[Number(b.dataset.a)], id = `${nas}/${x.rel}`, sz = await this._albumSzamok(id);
      if (!sz.length) { pl.ful = "nas"; pl.ut = x.rel.split("/").map((_, i, t) => ({ id: `${nas}/${t.slice(0, i + 1).join("/")}`, cim: t[i] })); this._polcRajz(); return; }
      this._polcZar();
      this._betolt({ cim: x.nev, alcim: x.rel.split("/")[0], forras: "nas", id, szamok: sz });
    }));
    lista.querySelectorAll("[data-sn], [data-sv]").forEach((b) => b.addEventListener("click", () => {
      const x = szamok[Number(b.dataset.sn ?? b.dataset.sv)]; this._sorbaTesz([`${nas}/${x.rel}`], b.dataset.sn != null ? "next" : "add");
    }));
    lista.querySelectorAll("[data-an], [data-av]").forEach((b) => b.addEventListener("click", async () => {
      const x = albumok[Number(b.dataset.an ?? b.dataset.av)], sz = await this._albumSzamok(`${nas}/${x.rel}`);
      if (!sz.length) return this._uzen(T("Ebben a mappában nincs lejátszható szám."));
      this._sorbaTesz(sz, b.dataset.an != null ? "next" : "add");
    }));
    lista.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", async () => {
      // a szám albuma töltődik be, és ettől a számtól indul
      const x = szamok[Number(b.dataset.s)], mappa = x.rel.split("/").slice(0, -1).join("/");
      const id = mappa ? `${nas}/${mappa}` : nas, sz = await this._albumSzamok(id), fajl = `${nas}/${x.rel}`;
      let kezdo = sz.findIndex((y) => y === fajl || SAFE_DECODE(y) === fajl);
      if (kezdo < 0) kezdo = sz.findIndex((y) => SAFE_DECODE(y).endsWith(`/${x.rel.split("/").pop()}`));
      this._polcZar();
      this._betolt({ cim: mappa ? mappa.split("/").pop() : "NAS", alcim: mappa ? mappa.split("/")[0] : "", forras: "nas", id, szamok: sz.length ? sz : [fajl] }, Math.max(0, kezdo));
    }));
  }

  // ---- DEEZER fül: a teljes Deezer-katalógus (nyilvános API a cantabile/deezer közvetítőn át); a Sonos a saját Deezer-fiókjával
  // játssza a linkeket (album, lista, szám), sorba is tehetők. Üres keresőnél a Deezer toplistája, előadóra koppintva az oldala.
  _dz(ut) { return this._hass.callWS({ type: "cantabile/deezer", ut }); }

  // a SPOTIFY / TIDAL fül akkor látszik, ha a szolgáltatás használható (kulcs vagy HA Spotify-integráció) és van hol szólnia
  _szolgLatszik(szolg) {
    const s = this._stream || {};
    if (szolg === "spotify") return !!s.spotify && (this._vanSonos() || !!s.spotify_entity);
    return !!s.tidal && this._vanSonos();
  }

  // a Spotify Connect-eszköz neve egy hangszóróhoz: a beállított spotify_device, különben név szerint a Spotify forráslistájából;
  // az épp játszó eszköz is jelölt (a Spotify a WiiM-et játszás közben is kihagyhatja a listából, csak azonosítót ad helyette)
  _spotifyEszkoz(hsz) {
    const sp = this._stream?.spotify_entity, a = this._hass?.states[sp]?.attributes || {}, lista = [...new Set([...(a.source_list || []), a.source].filter(Boolean))];
    if (!hsz || hsz.entity === HELYI || !lista.length) return null;
    const norm = (x) => String(x || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const nevek = [hsz.spotify_device, hsz.nev, this._hass.states[hsz.entity]?.attributes?.friendly_name].filter(Boolean).map(norm);
    return lista.find((x) => nevek.includes(norm(x))) || lista.find((x) => nevek.some((n) => n && (norm(x).includes(n) || n.includes(norm(x))))) || null;
  }

  // Spotify Connect: a HA Spotify-integrációja a hangszórót választja lejátszó eszköznek, és ott indít (Premium kell)
  async _spotifyConnect(kaz, hsz) {
    const sp = this._stream?.spotify_entity, eszk = this._spotifyEszkoz(hsz);
    if (!eszk) throw new Error(T("A(z) {h} nem szerepel a Spotify Connect-eszközök között (nyisd meg rajta egyszer a Spotify appot, vagy add meg a nevét: spotify_device).", { h: KN(hsz) }));
    const uri = kaz.uri || kaz.id;
    // ha már ezen az eszközön van a lejátszás, nem kell (és listából hiányzó eszközre nem is lehet) átváltani
    if (this._hass.states[sp]?.attributes?.source !== eszk) await this._hiv("media_player", "select_source", { entity_id: sp, source: eszk });
    await this._hiv("media_player", "play_media", { entity_id: sp, media_content_id: uri, media_content_type: kaz.mtype || (String(uri).split(":")[1] || "playlist") });
    TAR.ir("tablet-magno-kazetta", JSON.stringify({ ...kaz, entity: hsz.entity }));
    this._frissit();
  }

  // szól-e Spotify Connecten ez a hangszóró (akkor a választó a Spotifyval viszi át)
  _spotifyConnectSzol(hsz) {
    const sp = this._stream?.spotify_entity, s = sp && this._hass?.states[sp];
    return !!s && s.state === "playing" && !!s.attributes?.source && s.attributes.source === this._spotifyEszkoz(hsz);
  }

  // SPOTIFY / TIDAL fül (kísérleti): keresés a szerveren át (cantabile/spotify, cantabile/tidal), előadó-oldal,
  // a Spotify saját könyvtára a HA Spotify-integrációján át; kazettaként Sonoson linkkel, Spotify Connecten a Spotifyval
  async _szolgRajz(lista, szolg) {
    const pl = this._polc; if (!pl) return;
    const nev = szolg === "spotify" ? "Spotify" : "Tidal", kerdes = pl.keres || "", hely = pl.ut[pl.ut.length - 1];
    const allapot = JSON.stringify([szolg, kerdes, pl.ut.map((x) => x.id)]), friss = () => this._polc === pl && pl.ful === szolg && allapot === JSON.stringify([szolg, pl.keres || "", pl.ut.map((x) => x.id)]);
    const hsz = this._hangszoro(), connect = szolg === "spotify" && !!this._stream?.spotify_entity;
    const jo = hsz.mod === "sonos" || (connect && hsz.entity !== HELYI);
    const figy = (jo ? "" : `<div class="puzenet">${szolg === "spotify" && connect ? T("A Spotify Sonoson vagy Spotify Connect-hangszórón szól – válts hangszórót.") : T("A(z) {s} Sonoson szól – válts Sonos hangszóróra.", { s: nev })}</div>`)
      + `<div class="puzenet">${T("{s}: kísérleti funkció – élő fiókkal még nincs visszaigazolva.", { s: nev })}</div>`;
    const api = (ut) => this._hass.callWS({ type: `cantabile/${szolg}`, ut });
    const orszag = this._orszag();
    const link = (tip, id) => (szolg === "spotify" ? `https://open.spotify.com/${tip}/${id}` : `https://tidal.com/browse/${tip}/${id}`);
    const kazLista = (kaz) => {
      lista.innerHTML = figy + (kaz.length ? `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : `<div class="puzenet">${T("Nincs találat.")}</div>`);
      lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.i)]); }));
    };
    const kaz = (cim, alcim, tip, id, kep, extra = {}) => ({ cim, alcim, forras: "stream", tipus: szolg, id: link(tip, id), uri: szolg === "spotify" ? `spotify:${tip}:${id}` : undefined, mtype: tip, kep: kep || null, ...extra });
    lista.innerHTML = `<div class="puzenet">${T("Betöltés…")}</div>`;
    try {
      // a Spotify saját könyvtára (HA Spotify-integráció): mappák a HA médiaböngészőjéből
      if (hely?.konyvtar || (!hely && KERES_NORM(kerdes).length < 2 && connect)) {
        let r;
        try {
          r = await this._hass.callWS({ type: "media_player/browse_media", entity_id: this._stream.spotify_entity, ...(hely?.konyvtar ? { media_content_id: hely.id, media_content_type: hely.mtype } : {}) });
        } catch (err) {
          // a HA Spotify-lejátszója csak akkor böngészhető, ha épp szól rajta valami: üres keresőnél ilyenkor a keresés a teendő
          if (hely || err?.code !== "not_supported") throw err;
          if (friss()) lista.innerHTML = figy + `<div class="puzenet">${T("Írd be, mit keresel: előadó, album, szám vagy lista.")}</div>`;
          return;
        }
        if (!friss()) return;
        const elemek = r.children || [], mappak = elemek.filter((x) => x.can_expand && !x.can_play), jatszhato = elemek.filter((x) => x.can_play);
        lista.innerHTML = figy + (mappak.length ? `<div class="eloadok">${mappak.map((x, i) => `<button data-k="${i}">${ESC(x.title)}</button>`).join("")}</div>` : "")
          + (jatszhato.length ? `<div class="kazettak">${jatszhato.map((x, i) => this._kazettaCsempe({ cim: x.title, alcim: x.media_class || "", kep: x.thumbnail }, i)).join("")}</div>` : "")
          + (!mappak.length && !jatszhato.length ? `<div class="puzenet">${T("Nincs találat.")}</div>` : "");
        lista.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { const x = mappak[Number(b.dataset.k)]; pl.ut.push({ id: x.media_content_id, mtype: x.media_content_type, cim: x.title, konyvtar: true }); this._polcRajz(); }));
        lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => {
          const x = jatszhato[Number(b.dataset.i)]; this._polcZar();
          const uri = /^spotify:/.test(x.media_content_id) ? x.media_content_id : undefined;
          this._betolt({ cim: x.title, alcim: x.media_class || "Spotify", forras: "stream", tipus: "spotify", id: x.media_content_id, uri, mtype: x.media_content_type, kep: x.thumbnail || null });
        }));
        return;
      }
      if (hely) {
        // előadó-oldal: népszerű számai egy kazettán (Spotify), alatta az albumai
        const lap = [];
        if (szolg === "spotify") {
          // fejlesztői módban a top-tracks nem érhető el (403), és legfeljebb 10 elem kérhető egyszerre: a népszerű számok
          // egy előadóra szűrt keresésből jönnek, az albumok 10-esével lapozva; egy hibás rész nem viszi el a többit
          const [ker, ...albLap] = await Promise.all([api(`/search?q=${encodeURIComponent(`artist:"${hely.cim}"`)}&type=track&limit=10&market=${orszag}`), ...[0, 10, 20].map((o) => api(`/artists/${hely.id}/albums?include_groups=album,single,compilation&limit=10&offset=${o}&market=${orszag}`))].map((p) => p.catch(() => null)));
          if (!friss()) return;
          const latott = new Set(), top = (ker?.tracks?.items || []).filter((t) => t && (t.artists || []).some((a) => a.id === hely.id) && !latott.has(t.name) && latott.add(t.name));
          if (top.length) lap.push({ cim: T("{e} – népszerű számok", { e: hely.cim }), alcim: T("{n} szám", { n: top.length }), forras: "stream", tipus: "spotify", id: link("track", top[0].id), szamok: top.map((t) => link("track", t.id)), uri: `spotify:artist:${hely.id}`, mtype: "artist", kep: top[0].album?.images?.[1]?.url || null });
          for (const x of albLap.flatMap((a) => a?.items || [])) lap.push(kaz(x.name, `${x.album_type || "album"} · ${String(x.release_date || "").slice(0, 4)}`, "album", x.id, x.images?.[1]?.url || x.images?.[0]?.url));
          if (!lap.length && !ker && !albLap.some(Boolean)) throw new Error(T("az előadó oldala nem tölthető be"));
        } else {
          const alb = await api(`/artists/${hely.id}/relationships/albums?countryCode=${orszag}&include=albums`);
          if (!friss()) return;
          const inc = new Map((alb.included || []).map((x) => [x.id, x.attributes || {}]));
          for (const x of alb.data || []) lap.push(kaz(inc.get(x.id)?.title || x.id, hely.cim, "album", x.id));
        }
        return kazLista(lap);
      }
      if (KERES_NORM(kerdes).length < 2) { lista.innerHTML = figy + `<div class="puzenet">${T("Írd be, mit keresel: előadó, album, szám vagy lista.")}</div>`; return; }
      let eloadok = [], albumok = [], szamok = [], listak = [];
      if (szolg === "spotify") {
        const r = await api(`/search?q=${encodeURIComponent(kerdes.trim())}&type=artist,album,track,playlist&limit=10&market=${orszag}`);
        if (!friss()) return;
        eloadok = (r.artists?.items || []).filter(Boolean).sort((x, y) => (y.popularity || 0) - (x.popularity || 0)).map((x) => ({ id: x.id, nev: x.name }));
        albumok = (r.albums?.items || []).filter(Boolean).map((x) => kaz(x.name, (x.artists || []).map((a) => a.name).join(", "), "album", x.id, x.images?.[1]?.url || x.images?.[0]?.url));
        szamok = (r.tracks?.items || []).filter(Boolean).map((x) => {
          const al = [(x.artists || []).map((a) => a.name).join(", "), x.album?.name].filter(Boolean).join(" · ");
          // a szám az albumával töltődik be, attól a számtól (csak az első lemezen biztos a sorszám)
          return x.album?.id && (x.disc_number || 1) === 1 ? { ...kaz(x.album.name, al, "album", x.album.id, x.album.images?.[1]?.url), cimSor: x.name, kezdo: Math.max(0, (x.track_number || 1) - 1) }
            : { ...kaz(x.name, al, "track", x.id), cimSor: x.name, kezdo: 0 };
        });
        listak = (r.playlists?.items || []).filter(Boolean).map((x) => kaz(x.name, T("lista · {o}", { o: x.owner?.display_name || "Spotify" }), "playlist", x.id, x.images?.[0]?.url));
      } else {
        const r = await api(`/searchResults/${encodeURIComponent(kerdes.trim())}?countryCode=${orszag}&include=artists,albums,tracks,playlists`);
        if (!friss()) return;
        const inc = new Map((r.included || []).map((x) => [`${x.type}:${x.id}`, x.attributes || {}])), rel = r.data?.relationships || {};
        const elem = (k) => (rel[k]?.data || []).map((x) => ({ id: x.id, a: inc.get(`${x.type}:${x.id}`) || {} }));
        eloadok = elem("artists").map((x) => ({ id: x.id, nev: x.a.name || x.id }));
        albumok = elem("albums").map((x) => kaz(x.a.title || x.id, "album", "album", x.id));
        szamok = elem("tracks").map((x) => ({ ...kaz(x.a.title || x.id, "", "track", x.id), cimSor: x.a.title || x.id, kezdo: 0 }));
        listak = elem("playlists").map((x) => kaz(x.a.name || x.a.title || x.id, T("lista"), "playlist", x.id));
      }
      const csoport = (cim, db, belso) => (db ? `<h5 class="kcsop">${cim}<span>${db}</span></h5>${belso}` : "");
      const sor = (t, i, cim, al) => `<div class="ktsor"><button data-${t}="${i}"><b>${ESC(cim)}</b><small>${ESC(al || "")}</small></button></div>`;
      lista.innerHTML = figy + (eloadok.length + albumok.length + szamok.length + listak.length === 0
        ? `<div class="puzenet">${T("Nincs találat ({s}): „{q}”.", { s: nev, q: ESC(kerdes) })}</div>`
        : csoport("ARTISTS", eloadok.length, `<div class="eloadok">${eloadok.map((x, i) => `<button data-e="${i}">${ESC(x.nev)}</button>`).join("")}</div>`)
          + csoport("ALBUMS", albumok.length, `<div class="ktalal">${albumok.map((x, i) => sor("a", i, x.cim, x.alcim)).join("")}</div>`)
          + csoport("TRACKS", szamok.length, `<div class="ktalal">${szamok.map((x, i) => sor("s", i, x.cimSor, x.alcim)).join("")}</div>`)
          + csoport("PLAYLISTS", listak.length, `<div class="ktalal">${listak.map((x, i) => sor("l", i, x.cim, x.alcim)).join("")}</div>`));
      lista.scrollTop = 0;
      lista.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => { const x = eloadok[Number(b.dataset.e)]; pl.ut = [{ id: x.id, cim: x.nev }]; pl.dzKeres = kerdes; pl.keres = ""; this._polcRajz(); }));
      lista.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(albumok[Number(b.dataset.a)]); }));
      lista.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(listak[Number(b.dataset.l)]); }));
      lista.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { const x = szamok[Number(b.dataset.s)]; this._polcZar(); this._betolt(x, x.kezdo || 0); }));
    } catch (err) {
      if (friss()) lista.innerHTML = figy + `<div class="puzenet">${T("A(z) {s} most nem érhető el: {h}", { s: nev, h: ESC(err?.message || err) })}</div>`;
    }
  }

  async _deezerRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const kerdes = pl.keres || "", eloado = pl.ut[pl.ut.length - 1];
    const allapot = JSON.stringify([kerdes, pl.ut.map((x) => x.id)]), friss = () => this._polc === pl && pl.ful === "deezer" && allapot === JSON.stringify([pl.keres || "", pl.ut.map((x) => x.id)]);
    const hsz = this._hangszoro(), hs = this._hass?.states[hsz.entity]?.attributes || {};
    const figy = hsz.mod === "sonos" ? "" : `<div class="puzenet">${T("A Deezer csak Sonos hangszórón szól – válts Sonos hangszóróra.")}</div>`;
    lista.innerHTML = `<div class="puzenet">${eloado ? T("Betöltés…") : KERES_NORM(kerdes).length >= 2 ? T("Keresés a Deezeren…") : T("Deezer toplista…")}</div>`;
    const kazLista = (kaz) => {
      lista.innerHTML = figy + (kaz.length ? `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : `<div class="puzenet">${T("Nincs találat.")}</div>`);
      lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.i)]); }));
    };
    const albumKaz = (x, al) => ({ cim: x.title, alcim: al ?? x.artist?.name ?? "album", forras: "stream", tipus: "deezer", id: x.link, kep: x.cover_medium || null });
    const listaKaz = (x) => ({ cim: x.title, alcim: T("Deezer-lista · {n} szám", { n: x.nb_tracks }), forras: "stream", tipus: "deezer", id: x.link, kep: x.picture_medium || null });
    try {
      if (eloado) {
        // előadó oldala: népszerű számai egy kazettán, alatta az albumai
        const [top, alb] = await Promise.all([this._dz(`/artist/${eloado.id}/top?limit=25`), this._dz(`/artist/${eloado.id}/albums?limit=60`)]);
        if (!friss()) return;
        const kaz = [];
        if (top.data?.length) kaz.push({ cim: T("{e} – népszerű számok", { e: eloado.cim }), alcim: T("{n} szám", { n: top.data.length }), forras: "stream", tipus: "deezer", id: top.data[0].link, szamok: top.data.map((t) => t.link), kep: eloado.kep || null });
        for (const x of alb.data || []) kaz.push(albumKaz(x, `${x.record_type === "single" ? T("kislemez") : x.record_type === "compile" ? T("válogatás") : T("album")} · ${String(x.release_date || "").slice(0, 4)}`));
        return kazLista(kaz);
      }
      if (KERES_NORM(kerdes).length < 2) {
        const c = await this._dz("/chart/0");
        if (!friss()) return;
        return kazLista([...(c.playlists?.data || []).map(listaKaz), ...(c.albums?.data || []).map((x) => albumKaz(x))]);
      }
      const q = encodeURIComponent(kerdes.trim());
      const [ea, aa, sa, la] = await Promise.all(["artist&limit=8", "album&limit=20", "track&limit=25", "playlist&limit=10"].map((t) => this._dz(`/search/${t.split("&")[0]}?q=${q}&${t.split("&")[1]}`)));
      if (!friss()) return;
      // azonos nevű előadók közül a népszerűbb elöl (a Deezer keresője ezt nem mindig teszi)
      const eloadok = (ea.data || []).sort((x, y) => (y.nb_fan || 0) - (x.nb_fan || 0)), albumok = aa.data || [], szamok = sa.data || [], listak = la.data || [];
      const sorba = hsz.mod === "sonos" && Number(hs.queue_size) > 0 && !hs.shuffle;
      const gombok = (tipus, i) => sorba ? `<span class="sorm"><button class="sm" data-${tipus}n="${i}" title="${T("Következőnek")}">${SI.kov}</button><button class="sm" data-${tipus}v="${i}" title="${T("Sor végére")}">${SI.vegere}</button></span>` : "";
      const csoport = (cim, db, belso) => db ? `<h5 class="kcsop">${cim}<span>${db}</span></h5>${belso}` : "";
      const sor = (t, i, cim, al) => `<div class="ktsor"><button data-${t}="${i}"><b>${ESC(cim)}</b><small>${ESC(al)}</small></button>${gombok(t, i)}</div>`;
      lista.innerHTML = figy + ((eloadok.length + albumok.length + szamok.length + listak.length === 0)
        ? `<div class="puzenet">${T("Nincs találat a Deezeren erre: „{q}”.", { q: ESC(kerdes) })}</div>`
        : csoport("ARTISTS", eloadok.length, `<div class="eloadok">${eloadok.map((x, i) => `<button data-e="${i}">${ESC(x.name)}</button>`).join("")}</div>`)
          + csoport("ALBUMS", albumok.length, `<div class="ktalal">${albumok.map((x, i) => sor("a", i, x.title, x.artist?.name || "")).join("")}</div>`)
          + csoport("TRACKS", szamok.length, `<div class="ktalal">${szamok.map((x, i) => sor("s", i, x.title, [x.artist?.name, x.album?.title].filter(Boolean).join(" · "))).join("")}</div>`)
          + csoport("PLAYLISTS", listak.length, `<div class="ktalal">${listak.map((x, i) => sor("l", i, x.title, `${T("{n} szám", { n: x.nb_tracks })} · ${x.user?.name || "Deezer"}`)).join("")}</div>`)
          + (hsz.mod === "sonos" && Number(hs.queue_size) > 0 && hs.shuffle ? `<div class="puzenet">${T("Keverés közben a „következőnek” és a „sor végére” nem érhető el (a Sonos véletlen helyre tenné).")}</div>` : ""));
      lista.scrollTop = 0;
      const elem = { a: albumok, s: szamok, l: listak };
      lista.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => {
        const x = eloadok[Number(b.dataset.e)]; pl.ut = [{ id: String(x.id), cim: x.name, kep: x.picture_medium }]; pl.dzKeres = kerdes; pl.keres = ""; this._polcRajz();
      }));
      lista.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(albumKaz(albumok[Number(b.dataset.a)])); }));
      lista.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(listaKaz(listak[Number(b.dataset.l)])); }));
      lista.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", async () => {
        // a szám albuma töltődik be, és ettől a számtól indul
        const x = szamok[Number(b.dataset.s)];
        let kezdo = 0;
        try { kezdo = Math.max(0, ((await this._dz(`/album/${x.album.id}/tracks?limit=200`)).data || []).findIndex((t) => t.id === x.id)); } catch (err) { /* az album elejéről */ }
        this._polcZar();
        this._betolt({ cim: x.album?.title || x.title, alcim: x.artist?.name || "", forras: "stream", tipus: "deezer", id: `https://www.deezer.com/album/${x.album.id}`, kep: x.album?.cover_medium || null }, kezdo);
      }));
      lista.querySelectorAll("[data-an], [data-av], [data-sn], [data-sv], [data-ln], [data-lv]").forEach((b) => b.addEventListener("click", () => {
        const [k, v] = Object.entries(b.dataset)[0], x = elem[k[0]][Number(v)];
        this._sorbaTesz([x.link], k[1] === "n" ? "next" : "add");
      }));
    } catch (err) {
      if (friss()) lista.innerHTML = `<div class="puzenet">${T("A Deezer most nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`;
    }
  }

  // ---- lejátszási sor (SOR fül): Sonoson a hangszóró saját sora, WiiM-en a kazetta számai, BT-n a kártya listája ----
  _sorForras() {
    const hsz = this._hangszoro();
    if (hsz.entity === HELYI) {
      const l = this._helyiLista;
      if (l?.szamok?.length) return { mod: "helyi", hsz, kulcs: `helyi|${l.szamok.length}|${l.szamok[0]}`, akt: l.i };
      return { mod: "nincs", hsz };
    }
    const vez = this._hass?.states[hsz.entity]?.attributes?.group_members?.[0] || hsz.entity;
    const a = this._hass?.states[vez]?.attributes || {}, cid = a.media_content_id || "";
    if (/^x-rincon-mp3radio|^x-sonosapi-stream|^x-sonosapi-radio/.test(cid) || (this._mod === "radio" && SZOL(this._allapot(hsz)))) return { mod: "radio", hsz };
    if (hsz.mod === "sonos") return { mod: "sonos", hsz, vez, kulcs: `sonos|${vez}|${a.queue_size}`, akt: a.queue_size ? (Number(a.queue_position) || 1) - 1 : -1 };
    const kaz = this._kazetta();
    if (kaz?.szamok?.length) return { mod: "wiim", hsz, kaz, kulcs: `wiim|${kaz.id}`, akt: this._szamIndex(kaz, a) };
    return { mod: "nincs", hsz };
  }

  async _sorRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const f = this._sorForras();
    if (f.mod === "radio") { lista.innerHTML = `<div class="puzenet">${T("Rádióadó szól – ott nincs lejátszási sor.")}</div>`; return; }
    if (f.mod === "nincs") { lista.innerHTML = `<div class="puzenet">${T("A(z) {h} hangszórón most nincs lejátszási sor. Tegyél be egy kazettát.", { h: ESC(KN(f.hsz)) })}</div>`; return; }
    lista.innerHTML = `<div class="puzenet">${T("Betöltés…")}</div>`;
    let elemek;
    try {
      if (f.mod === "sonos") {
        const v = await this._hass.callWS({ type: "call_service", domain: "sonos", service: "get_queue", target: { entity_id: f.vez }, return_response: true });
        elemek = (v?.response?.[f.vez] || []).map((x) => ({
          cim: x.media_title && !/[?&]authSig=|^[a-z0-9+.-]+:\/\//i.test(x.media_title) ? x.media_title
            : /^https?:/i.test(x.media_content_id || "") ? FAJLNEV(x.media_content_id) || T("(cím nélkül)") : /^x-sonos-http:/i.test(x.media_content_id || "") ? T("(cím nélkül – Deezer)") : T("(cím nélkül)"),
          al: [x.media_artist, x.media_album_name].filter(Boolean).join(" · "),
          id: x.media_content_id, nas: /^https?:\/\/[^/]+\/media\/local\//i.test(x.media_content_id || "") }));
      } else {
        const szamok = f.mod === "helyi" ? this._helyiLista.szamok : f.kaz.szamok;
        const kiir = (id) => this._helyiNevek?.get(id) || FAJLNEV(id);
        elemek = szamok.map((id) => ({ cim: kiir(id), al: f.mod === "wiim" ? f.kaz.cim || "" : "" }));
      }
    } catch (err) {
      lista.innerHTML = `<div class="puzenet">${T("A sor nem olvasható: {h}", { h: ESC(err?.message || err) })}</div>`; return;
    }
    if (this._polc !== pl || pl.ful !== "sor") return;
    pl.sor = { kulcs: f.kulcs, db: elemek.length, elemek };
    const kevert = !!this._hass?.states[f.vez || ""]?.attributes?.shuffle, szerk = f.mod === "sonos";
    // húzással átrendezhető: Sonoson (keverés nélkül – ott a sor sorrendje nem a lejátszásé), WiiM-en és BT-n
    const huz = elemek.length > 1 && !(szerk && kevert);
    lista.innerHTML = `<div class="sorfej">${ESC(KN(f.hsz))} · ${T("{n} szám", { n: elemek.length })}${kevert ? ` · ${T("keverve")}` : ""}${szerk && kevert ? `<span> – ${T("keverés közben a „következőnek” nem érhető el")}</span>` : ""}</div>
      <div class="sorlista${huz ? " huzhato" : ""}">${elemek.map((e, i) => `<div class="sorsor">${huz ? `<span class="foga" title="${T("Húzd az átrendezéshez")}"><i></i><i></i><i></i></span>` : ""}<button data-q="${i}"><span class="sn">${i + 1}</span><span class="st"><b>${ESC(e.cim)}</b>${e.al ? `<small>${ESC(e.al)}</small>` : ""}</span></button>${szerk
        ? `<span class="sorm">${e.nas && !kevert ? `<button class="sm" data-kov="${i}" title="${T("Következőnek")}">${SI.kov}</button>` : ""}<button class="sm" data-tor="${i}" title="${T("Törlés a sorból")}">${SI.torol}</button></span>` : ""}</div>`).join("")}</div>`;
    lista.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => this._sorUgrik(Number(b.dataset.q))));
    if (huz) this._sorHuzas(lista, f);
    lista.querySelectorAll("[data-kov]").forEach((b) => b.addEventListener("click", () => this._sorKovetkezo(f, Number(b.dataset.kov))));
    lista.querySelectorAll("[data-tor]").forEach((b) => b.addEventListener("click", () => {
      // kétlépcsős: első koppintás „Biztos?”, a 3 mp-en belüli második töröl
      if (!b.classList.contains("biztos")) { b.classList.add("biztos"); b.textContent = T("Biztos?"); setTimeout(() => { b.classList.remove("biztos"); b.innerHTML = SI.torol; }, 3000); return; }
      this._sorTorol(f, Number(b.dataset.tor));
    }));
    this._sorKiemel(true);
  }

  // a szóló szám kiemelése; ha közben más lett a sor (új kazetta), újrarajzol
  _sorKiemel(gorget = false) {
    const pl = this._polc; if (pl?.ful !== "sor" || !pl.sor) return;
    const lista = this.shadowRoot.querySelector(".plista"), f = this._sorForras();
    if (f.kulcs !== pl.sor.kulcs) { pl.sor = null; this._sorRajz(lista); return; }
    let ujra = false;
    lista.querySelectorAll(".sorlista [data-q]").forEach((b, i) => {
      const akt = i === f.akt;
      b.parentElement.classList.toggle("akt", akt);
      if (akt !== b.classList.contains("akt")) { b.classList.toggle("akt", akt); b.querySelector(".sn").textContent = akt ? "▶" : String(i + 1); ujra = ujra || akt; }
    });
    const el = lista.querySelector(".sorlista .akt");
    if (el && (gorget || ujra)) lista.scrollTop = Math.max(0, el.offsetTop - lista.offsetTop - lista.clientHeight / 3);
  }

  // húzás a fogantyúnál (egér és érintés): a sor az ujjal mozog, a beszúrás helyét vonal jelzi; a lista széléhez érve
  // görget; elengedéskor áthelyez
  _sorHuzas(lista, f) {
    lista.querySelectorAll(".sorlista .foga").forEach((h) => h.addEventListener("pointerdown", (ev) => {
      if (ev.button > 0) return;
      ev.preventDefault();
      const sor = h.closest(".sorsor"), sorok = [...lista.querySelectorAll(".sorlista .sorsor")], honnan = sorok.indexOf(sor);
      const kezdY = ev.clientY, kezdG = lista.scrollTop;
      let hova = honnan, y = ev.clientY, gorgeto = null;
      try { h.setPointerCapture(ev.pointerId); } catch (e) { /* régi böngésző */ }
      sor.classList.add("huz");
      const jelol = () => {
        sor.style.transform = `translateY(${y - kezdY + lista.scrollTop - kezdG}px)`;
        let k = sorok.length;
        for (let j = 0; j < sorok.length; j++) {
          if (sorok[j] === sor) continue;
          const t = sorok[j].getBoundingClientRect();
          if (y < t.top + t.height / 2) { k = j; break; }
        }
        hova = k > honnan ? k - 1 : k;
        sorok.forEach((x, j) => { x.classList.toggle("ide", j === k && k !== honnan && k !== honnan + 1); x.classList.toggle("ideala", k === sorok.length && j === sorok.length - 1 && honnan !== sorok.length - 1); });
      };
      const mozog = (e) => {
        y = e.clientY; jelol();
        const t = lista.getBoundingClientRect(), szel = 36;
        const seb = y < t.top + szel ? -8 : y > t.bottom - szel ? 8 : 0;
        if (seb && !gorgeto) gorgeto = setInterval(() => { lista.scrollTop += seb; jelol(); }, 16);
        if (!seb && gorgeto) { clearInterval(gorgeto); gorgeto = null; }
        if (seb && gorgeto) { clearInterval(gorgeto); gorgeto = setInterval(() => { lista.scrollTop += seb; jelol(); }, 16); }
      };
      const vege = () => {
        h.removeEventListener("pointermove", mozog); h.removeEventListener("pointerup", vege); h.removeEventListener("pointercancel", vege);
        if (gorgeto) clearInterval(gorgeto);
        sor.classList.remove("huz"); sor.style.transform = "";
        sorok.forEach((x) => x.classList.remove("ide", "ideala"));
        if (hova !== honnan) {
          // azonnal a helyére (a valódi sorrendet a frissítés hozza)
          const sl = sor.parentElement;
          sl.insertBefore(sor, hova > honnan ? sorok[hova].nextSibling : sorok[hova]);
          this._sorAthelyez(f, honnan, hova);
        }
      };
      h.addEventListener("pointermove", mozog); h.addEventListener("pointerup", vege); h.addEventListener("pointercancel", vege);
    }));
  }

  async _sorAthelyez(f, honnan, hova) {
    const mozgat = (t) => { const x = [...t]; x.splice(hova, 0, x.splice(honnan, 1)[0]); return x; };
    try {
      if (f.mod === "sonos") await this._hiv("cantabile", "move_queue_item", { entity_id: f.vez, from: honnan, to: hova });
      else if (f.mod === "wiim") {
        const kaz = { ...f.kaz, szamok: mozgat(f.kaz.szamok) };
        TAR.ir("tablet-magno-kazetta", JSON.stringify({ ...kaz, entity: f.hsz.entity }));
        if (!this._config.magno?.szkript && !this._nincsIntegracio) await this._hiv("cantabile", "set_order", { entity_id: f.hsz.entity, tracks: kaz.szamok });
      } else if (f.mod === "helyi") {
        const l = this._helyiLista, most = l.szamok[l.i];
        l.szamok = mozgat(l.szamok); l.i = l.szamok.indexOf(most);
        this._helyiElore = null;
      }
    } catch (err) { this._uzen(T("Az áthelyezés nem sikerült: {h}", { h: err?.message || err })); }
    this._sorFrissitKesobb();
  }

  async _sorTorol(f, i) {
    try {
      await this._hiv("sonos", "remove_from_queue", { entity_id: f.vez, queue_position: i });
      this._sorFrissitKesobb();
    } catch (err) { this._uzen(T("A törlés nem sikerült: {h}", { h: err?.message || err })); }
  }

  // „következőnek”: a szám a szóló után kerül (Sonos enqueue: next), a régi helyéről törlődik (csak NAS-számnál: a
  // Deezer-elem újra beszúrva elveszti a címét; keverés közben a Sonos véletlen helyre szúr, ezért ott nem kínáljuk)
  async _sorKovetkezo(f, i) {
    const e = this._polc?.sor?.elemek?.[i], akt = f.akt;
    if (!e?.id || i === akt) return;
    try {
      await this._hiv("media_player", "play_media", { entity_id: f.vez, media_content_id: e.id, media_content_type: "music", enqueue: "next" });
      await this._hiv("sonos", "remove_from_queue", { entity_id: f.vez, queue_position: i > akt ? i + 1 : i });
      this._sorFrissitKesobb();
    } catch (err) { this._uzen(T("Az áthelyezés nem sikerült: {h}", { h: err?.message || err })); }
  }

  // NAS-számok (kazetta vagy kereső) a szóló Sonos sorába: „next” = a szóló után (fordított sorrendben, hogy egymás után
  // jöjjenek), „add” = a végére
  async _sorbaTesz(szamok, mod) {
    const hsz = this._hangszoro(), s = this._hass?.states[hsz.entity];
    const vez = s?.attributes?.group_members?.[0] || hsz.entity;
    if (hsz.mod !== "sonos") return this._uzen(T("Sorba tenni csak Sonos hangszórón lehet."));
    if (this._hass.states[vez]?.attributes?.shuffle) return this._uzen(T("Keverés közben a Sonos véletlen helyre teszi – kapcsold ki a SHUFFLE-t."));
    const lista = await this._sonosValtozat(szamok);
    try {
      for (const id of mod === "next" ? [...lista].reverse() : lista)
        await this._hiv("media_player", "play_media", { entity_id: vez, media_content_id: id, media_content_type: "music", enqueue: mod });
      this._uzen(T(mod === "next" ? "{m} a szóló után következik." : "{m} a sor végére került.", { m: lista.length === 1 ? T("A szám") : T("{n} szám", { n: lista.length }) }));
      if (this._polc?.ful === "sor") this._sorFrissitKesobb();
    } catch (err) { this._uzen(T("A sorba tétel nem sikerült: {h}", { h: err?.message || err })); }
  }

  _sorFrissitKesobb() {
    clearTimeout(this._sorIdo);
    this._sorIdo = setTimeout(() => { if (this._polc?.ful === "sor") { this._polc.sor = null; this._sorRajz(this.shadowRoot.querySelector(".plista")); } }, 900);
  }

  async _sorUgrik(i) {
    const f = this._sorForras();
    try {
      if (f.mod === "sonos" && await this._ujratoltElavult(f.hsz, i)) return;
      if (f.mod === "sonos") await this._hiv("sonos", "play_queue", { entity_id: f.vez, queue_position: i });
      else if (f.mod === "helyi") await this._helyiSzam(i);
      else if (f.mod === "wiim") await this._sorozat(f.hsz, f.kaz.szamok, i);
    } catch (err) { this._uzen(T("Nem sikerült a számra ugrani: {h}", { h: err?.message || err })); }
  }

  async _polcRajz() {
    const p = this.shadowRoot.getElementById("polc"), pl = this._polc;
    if (!pl) return;
    p.hidden = false;
    const nasGyoker = this._config.magno?.nas;
    const szolg = ["spotify", "tidal"].includes(pl.ful), szolgNev = pl.ful === "spotify" ? "Spotify" : "Tidal";
    const ut = (pl.ful === "nas" || pl.ful === "deezer" || szolg) && pl.ut.length
      ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut.map((x) => x.cim).join(" › "))}`
      : pl.ful === "sor" ? ""
      : pl.ful === "deezer" ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés a Deezeren…")}" value="${ESC(pl.keres || "")}">`
      : szolg ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés: {s}…", { s: szolgNev })}" value="${ESC(pl.keres || "")}">`
      : nasGyoker ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés a zenemappában…")}" value="${ESC(pl.keres || "")}">`
      : (pl.ful === "tel" ? T("Saját zene") : pl.ful === "nas" ? T("Zenemappa") : T("Sonos kedvencek"));
    p.innerHTML = `
      <div class="pfej">
        ${this._vanSonos() ? `<button class="pful ${pl.ful === "stream" ? "akt" : ""}" data-ful="stream">STREAMING</button>` : ""}
        ${this._config.deezer !== false && this._vanSonos() ? `<button class="pful ${pl.ful === "deezer" ? "akt" : ""}" data-ful="deezer">DEEZER</button>` : ""}
        ${this._szolgLatszik("spotify") ? `<button class="pful ${pl.ful === "spotify" ? "akt" : ""}" data-ful="spotify" title="${T("kísérleti")}">SPOTIFY<sup>β</sup></button>` : ""}
        ${this._szolgLatszik("tidal") ? `<button class="pful ${pl.ful === "tidal" ? "akt" : ""}" data-ful="tidal" title="${T("kísérleti")}">TIDAL<sup>β</sup></button>` : ""}
        <button class="pful ${pl.ful === "nas" ? "akt" : ""}" data-ful="nas">NAS</button>
        <button class="pful ${pl.ful === "tel" ? "akt" : ""}" data-ful="tel">PHONE</button>
        <button class="pful ${pl.ful === "sor" ? "akt" : ""}" data-ful="sor">QUEUE</button>
        <div class="put">${ut}</div>
        <button class="pzar" title="${T("Bezár")}">×</button>
      </div>
      <div class="ptest"><div class="plista"><div class="puzenet">${T("Betöltés…")}</div></div></div>`;
    p.querySelectorAll(".pful").forEach((b) => b.addEventListener("click", () => {
      pl.ful = b.dataset.ful; pl.ut = []; pl.keres = ""; if (pl.ful !== "sor") TAR.ir("tablet-magno-ful", pl.ful); this._polcRajz();
    }));
    p.querySelector(".pzar").addEventListener("click", () => this._polcZar());
    p.querySelector("[data-vissza]")?.addEventListener("click", () => { pl.ut.pop(); if ((pl.ful === "deezer" || szolg) && !pl.ut.length) pl.keres = pl.dzKeres || ""; this._polcRajz(); });
    const lista = p.querySelector(".plista");
    const kereso = p.querySelector("#pkeres");
    if (kereso) {
      // gépelés közben csak a találati lista frissül (a mező és a billentyűzet marad)
      kereso.addEventListener("input", () => {
        pl.keres = kereso.value; clearTimeout(this._keresIdo);
        this._keresIdo = setTimeout(() => (KERES_NORM(pl.keres).length >= 2 ? (pl.ful === "deezer" ? this._deezerRajz(lista) : szolg ? this._szolgRajz(lista, pl.ful) : this._keresRajz(lista)) : this._polcRajz()), pl.ful === "deezer" || szolg ? 450 : 180);
      });
      kereso.addEventListener("keydown", (e) => { if (e.key === "Enter") kereso.blur(); });
    }
    if (pl.ful === "deezer") return this._deezerRajz(lista);
    if (szolg) return this._szolgRajz(lista, pl.ful);
    if (KERES_NORM(pl.keres || "").length >= 2 && !(pl.ful === "nas" && pl.ut.length)) return this._keresRajz(lista);
    const kulcs = (x) => JSON.stringify([x?.ful, x?.ut.map((y) => y.id), KERES_NORM(x?.keres || "").length >= 2 && !x?.ut.length]);
    const allapot = kulcs(pl);
    try {
      if (pl.ful === "tel") return this._telRajz(lista);
      if (pl.ful === "sor") return this._sorRajz(lista);
      if (pl.ful === "stream") {
        const kaz = await this._streamKazettak();
        if (allapot !== kulcs(this._polc)) return;
        const sonos = this._hangszoro().mod === "sonos";
        lista.innerHTML = (sonos ? "" : `<div class="puzenet">${T("A streaming kazetták csak Sonos hangszórón szólnak – válts Sonos hangszóróra.")}</div>`)
          + (kaz.length ? `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : `<div class="puzenet">${T("Nincs Sonos-kedvenc lista vagy album.")}</div>`);
        lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.i)]); }));
        return;
      }
      if (!nasGyoker) { lista.innerHTML = `<div class="puzenet">${T("Nincs megadva zenemappa (⚙ → Tape deck → Zenemappa).")}</div>`; return; }
      const hol = pl.ut.length ? pl.ut[pl.ut.length - 1] : { id: nasGyoker, cim: "NAS" };
      const r = await this._bongesz(hol.id);
      if (allapot !== kulcs(this._polc)) return;
      const mappak = (r.children || []).filter((x) => x.can_expand && !(!pl.ut.length && [this._telMappa(), this._config.magno?.hires].includes(x.title))).sort((x, y) => x.title.localeCompare(y.title, NYELV(), { numeric: true }));
      const szamok = (r.children || []).filter(ZENE);
      if (!pl.ut.length) {
        // előadók betűrenddel, bal oldalt betű-ugró
        const betu = (t) => { const b = t.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase(); return /[A-Z]/.test(b) ? b : "#"; };
        const betuk = [...new Set(mappak.map((m) => betu(m.title)))];
        p.querySelector(".ptest").insertAdjacentHTML("afterbegin", `<div class="betuk">${betuk.map((b) => `<button data-b="${b}">${b}</button>`).join("")}</div>`);
        lista.innerHTML = `<div class="eloadok">${mappak.map((m, i) => `<button data-i="${i}" data-b="${betu(m.title)}">${ESC(m.title)}</button>`).join("")}</div>`;
        p.querySelectorAll(".betuk button").forEach((b) => b.addEventListener("click", () => {
          const cel = lista.querySelector(`.eloadok button[data-b="${b.dataset.b}"]`);
          if (cel) lista.scrollTop = cel.offsetTop - lista.offsetTop;
        }));
        lista.querySelectorAll(".eloadok button").forEach((b) => b.addEventListener("click", () => {
          const m = mappak[Number(b.dataset.i)]; pl.ut.push({ id: m.media_content_id, cim: m.title }); this._polcRajz();
        }));
        return;
      }
      // album-szint: almappák kazettaként; ha maga a mappa is tartalmaz számokat, az is egy kazetta
      const eloado = pl.ut[0].cim;
      const kaz = mappak.map((m) => ({ cim: m.title, alcim: eloado, forras: "nas", id: m.media_content_id, mappa: true }));
      if (szamok.length) kaz.unshift({ cim: hol.cim, alcim: T("{n} szám", { n: szamok.length }), forras: "nas", id: hol.id });
      lista.innerHTML = kaz.length ? `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : `<div class="puzenet">${T("Üres mappa.")}</div>`;
      lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", async () => {
        const k = kaz[Number(b.dataset.i)];
        if (k.mappa) {
          // ha az albummappában nincs szám, csak további mappák (pl. CD1, CD2), akkor belépünk
          const sz = await this._albumSzamok(k.id);
          if (!sz.length) { pl.ut.push({ id: k.id, cim: k.cim }); this._polcRajz(); return; }
          k.szamok = sz;
        }
        this._polcZar();
        this._betolt({ cim: k.cim, alcim: k.alcim, forras: "nas", id: k.id, szamok: k.szamok });
      }));
    } catch (err) {
      lista.innerHTML = `<div class="puzenet">${T("Hiba: {h}", { h: ESC(err?.message || err) })}</div>`;
    }
  }

  // TELEFON fül: (1) zene választása erről a készülékről → azonnal szól a BT kimeneten, feltöltés nélkül;
  // (2) feltöltés a NAS „Telefonrol” mappájába → kazettaként bármelyik hangszórón szól (törölhető)
  async _telRajz(lista) {
    const nas = this._config.magno?.nas, cel = nas ? `${nas}/${this._telMappa()}` : null;
    let fel = [];
    if (cel) { try { fel = await this._albumSzamok(cel); } catch (e) { /* még nincs mappa */ } }
    if (this._polc?.ful !== "tel" || KERES_NORM(this._polc?.keres || "").length >= 2) return;
    const tk = this._telKaz;
    lista.innerHTML = `<div class="tel">
      <section class="tblokk"><h4>${T("EZEN A KÉSZÜLÉKEN · BÁRMELYIK HANGSZÓRÓN")}</h4>
        <p>${T("Válassz zenét erről a készülékről: a BT kimeneten közvetlenül szól; más hangszórón átmenetileg feltöltődik a Home Assistantra (a kazettán TEMP jelzés), és 24 óra múlva magától törlődik.")}</p>
        <div class="tsor"><button class="tgomb" data-t="helyi">${T("♪ Zene választása…")}</button></div>
        ${tk ? `<div class="kazettak">${this._kazettaCsempe({ cim: tk.cim, alcim: tk.alcim }, "tk")}</div>` : ""}
      </section>
      <section class="tblokk"><h4>${T("FELTÖLTVE · BÁRMELYIK HANGSZÓRÓN")}</h4>
        <p>${T("A kiválasztott számok a zenemappa „{m}” mappájába kerülnek (fájlonként legfeljebb 20 MB), utána bármelyik hangszóró és a BT is lejátssza.", { m: ESC(this._telMappa()) })}</p>
        <div class="tsor"><button class="tgomb" data-t="fel" ${cel ? "" : "disabled"}>${T("↑ Feltöltés…")}</button><span class="tall" id="tall"></span></div>
        ${fel.length ? `<div class="kazettak">${this._kazettaCsempe({ cim: T("Telefonról"), alcim: T("{n} szám a zenemappában", { n: fel.length }) }, "fel")}</div>
          <div class="tsor"><button class="tgomb halk" data-t="urit">${T("Ürítés ({n} szám törlése)", { n: fel.length })}</button></div>` : `<div class="puzenet">${T("Még nincs feltöltött szám.")}</div>`}
      </section>
      <input type="file" id="tfajl" accept="audio/*" multiple hidden></div>`;
    const input = lista.querySelector("#tfajl");
    let mod = null;
    input.addEventListener("change", () => { const f = [...input.files]; input.value = ""; if (f.length) (mod === "fel" ? this._telFeltolt(f, cel) : this._telHelyi(f)); });
    lista.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", async () => {
      const t = b.dataset.t;
      if (t === "helyi" || t === "fel") { mod = t; input.click(); return; }
      if (t === "urit") {
        if (!b.classList.contains("biztos")) { b.classList.add("biztos"); b.textContent = T("Biztos? Koppints újra a törléshez"); return; }
        b.disabled = true; b.textContent = T("Törlés…");
        try { for (const id of fel) await this._hass.callWS({ type: "media_source/local_source/remove", media_content_id: id }); }
        catch (e) { this._uzen(/unauthorized|admin/i.test(String(e?.message || e?.code)) ? T("A törléshez rendszergazdai felhasználó kell.") : T("Törlés: {h}", { h: e?.message || e })); }
        this._polcRajz();
      }
    }));
    lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => {
      this._polcZar();
      if (b.dataset.i === "tk") this._betolt(this._telKaz);
      else this._betolt({ cim: T("Telefonról"), alcim: T("{n} szám", { n: fel.length }), forras: "nas", id: cel, szamok: fel });
    }));
  }

  _telHelyi(fajlok) {
    fajlok.sort((a, b) => a.name.localeCompare(b.name, NYELV(), { numeric: true }));
    this._telKaz?.szamok?.forEach((u) => URL.revokeObjectURL(u));
    this._helyiNevek = new Map();
    this._helyiMeret = new Map();
    this._telFajlok = new Map();          // a fájlok maguk is kellenek: más hangszórón átmeneti feltöltéssel szólnak
    const szamok = fajlok.map((f) => {
      const u = URL.createObjectURL(f);
      this._telFajlok.set(u, f);
      this._helyiNevek.set(u, f.name.replace(/\.[^.]+$/, ""));
      this._helyiMeret.set(u, { size: f.size, ext: (f.name.match(/\.([^.]+)$/) || [])[1] || "" });
      return u;
    });
    this._polcZar();
    this._betolt({ cim: fajlok.length === 1 ? fajlok[0].name.replace(/\.[^.]+$/, "") : T("Saját válogatás"), alcim: T("{n} szám a telefonról", { n: fajlok.length }), forras: "tel", id: `tel:${Date.now()}`, szamok });
  }

  async _telFeltolt(fajlok, cel) {
    const all = () => this.shadowRoot.getElementById("tall");
    const kihagy = [], hibas = [];
    let kesz = 0;
    for (const [k, f] of fajlok.entries()) {
      if (f.size > FEL_MAX) { kihagy.push(f.name); continue; }
      if (all()) all().textContent = `${k + 1}/${fajlok.length}: ${f.name}`;
      const fd = new FormData();
      fd.append("media_content_id", cel);
      fd.append("file", f, f.name);
      try {
        const v = await this._hass.fetchWithAuth("/api/media_source/local_source/upload", { method: "POST", body: fd });
        if (v.status === 401 || v.status === 403) { this._uzen(T("A feltöltéshez rendszergazdai felhasználó kell.")); return this._polcRajz(); }
        if (!v.ok) throw new Error(String(v.status));
        kesz++;
      } catch (e) { hibas.push(f.name); }
    }
    this._uzen([T("Feltöltve: {n} szám.", { n: kesz }), kihagy.length ? T("20 MB fölött, kihagyva: {h}.", { h: kihagy.join(", ") }) : "", hibas.length ? T("Nem sikerült: {h}.", { h: hibas.join(", ") }) : ""].filter(Boolean).join(" "));
    this._polcRajz();
  }

  _kazettaCsempe(k, i) {
    return `<button class="kt" data-i="${i}"><div class="test"><div class="cl" style="--szin:${SZIN(k.cim)}">${k.kep ? `<img src="${ESC(k.kep)}" alt="">` : ""}<span>${ESC(ROVID(k.cim, 46))}</span></div><div class="ab"></div></div><small>${ESC(k.alcim || "")}</small></button>`;
  }

  // a Sonos-kedvencek listái és albumai (a háztartás közös kedvencei, bármelyik Sonos-on át olvasható)
  async _streamKazettak() {
    if (this._streamCache && Date.now() - this._streamCache.ido < 600000) return this._streamCache.lista;
    const sonos = this._config.hangszorok.find((x) => x.mod === "sonos");
    if (!sonos) return [];
    const lista = [];
    for (const [mappa, fajta] of [["object.container.playlistContainer", "lista"], ["object.container.album.musicAlbum", "album"]]) {
      const r = await this._hass.callWS({ type: "media_player/browse_media", entity_id: sonos.entity, media_content_type: "favorites_folder", media_content_id: mappa });
      for (const x of r.children || []) {
        if (!x.can_play) continue;
        lista.push({ cim: x.title, alcim: fajta === "lista" ? T("lejátszási lista") : T("album"), forras: "stream", id: x.media_content_id, tipus: x.media_content_type, kep: x.thumbnail || null });
      }
    }
    this._streamCache = { ido: Date.now(), lista };
    return lista;
  }

  // ---- hangerő ----

  // hangerő: húzás a gomb körül (−135°…+135° = 0…100%), görgő ±2%; legfeljebb 300 ms-onként hívja a szolgáltatást
  _gombKezel(gomb) {
    const kuld = (v) => {
      this._hangero = v; this._rajzHangero(v);
      this._kuldendo = v;
      if (this._kuldIdo) return;
      this._kuldIdo = setTimeout(() => {
        this._kuldIdo = null;
        const hsz = this._hangszoro();
        if (this._hass && hsz && this._kuldendo != null) this._hiv("media_player", "volume_set", { entity_id: hsz.tagok || hsz.entity, volume_level: Math.round(this._kuldendo * 100) / 100 });
        this._kuldendo = null;
      }, 300);
    };
    const szog = (e) => {
      const r = gomb.getBoundingClientRect();
      let a = (Math.atan2(e.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - e.clientY) * 180) / Math.PI;
      if (a > 135 || a < -135) a = (this._hangero ?? 0) > 0.5 ? 135 : -135;
      return (a + 135) / 270;
    };
    let id = null;
    gomb.addEventListener("pointerdown", (e) => { e.stopPropagation(); id = e.pointerId; gomb.setPointerCapture(id); this._forgat = true; kuld(szog(e)); });
    gomb.addEventListener("pointermove", (e) => { e.stopPropagation(); if (e.pointerId === id) kuld(szog(e)); });
    const vege = (e) => { e.stopPropagation(); if (e.pointerId !== id) return; id = null; setTimeout(() => { this._forgat = false; }, 1500); };
    gomb.addEventListener("pointerup", vege);
    gomb.addEventListener("pointercancel", vege);
    gomb.addEventListener("click", (e) => e.stopPropagation());
    gomb.addEventListener("wheel", (e) => {
      e.preventDefault(); e.stopPropagation();
      this._forgat = true; clearTimeout(this._gorgoVege); this._gorgoVege = setTimeout(() => { this._forgat = false; }, 1500);
      kuld(Math.min(1, Math.max(0, (this._hangero ?? 0) + (e.deltaY < 0 ? 0.02 : -0.02))));
    }, { passive: false });
  }

  _rajzHangero(v) {
    const sr = this.shadowRoot;
    sr.querySelectorAll(".sapka").forEach((x) => { x.style.transform = `rotate(${-135 + 270 * v}deg)`; });
    sr.querySelectorAll(".hszam").forEach((x) => { x.textContent = v == null ? "" : Math.round(v * 100); });
  }

  // ---- állapot ----

  _frissit() {
    const sr = this.shadowRoot, h = this._hass, c = this._config;
    if (!sr || !h) return;
    const hsz = this._hangszoro(), s = this._allapot(hsz);
    const elerheto = s && s.state !== "unavailable";
    // NET-adó indítása után a hangszóró gyakran az átirányított címet jelenti vissza: ezt is megjegyezzük (alias)
    if (this._kezi?.i === KULSO && SZOL(s) && Date.now() - this._kezi.ido < 15000) {
      const cid = String(s.attributes?.media_content_id || ""), c0 = CIM(cid), k0 = this._kulso();
      const radioszeru = hsz.mod !== "sonos" || /^x-rincon-mp3radio:/i.test(cid);
      if (k0 && c0 && radioszeru && c0 !== this._kezi.elotte && c0 !== CIM(k0.url) && c0 !== k0.alias && this._config.adok.every((x) => CIM(x.url) !== c0)) {
        k0.alias = c0; TAR.ir("tablet-radio-kulso", JSON.stringify(k0));
      }
    }
    let i = this._adoIndex(hsz);
    // kézi hangolás után 15 mp-ig a választott adót mutatja, amíg a lejátszó át nem vált
    if (this._kezi && (i === this._kezi.i || Date.now() - this._kezi.ido > 15000)) this._kezi = null;
    if (this._kezi) i = this._kezi.i;
    const radioSzol = (i >= 0 || i === KULSO) && (SZOL(s) || !!this._kezi);
    // ugyanazon a hangszórón új adó indult (hangparancs, másik kártya, a hangszóró appja): a magnóról magától a rádióra vált;
    // hangszóróváltáskor nem (a kazetta átvitele előtt a cél még a régi adót szólhatja)
    const radioKulcs = radioSzol ? String(i) : "";
    if (this._radioKulcs?.e === hsz.entity && radioKulcs && radioKulcs !== this._radioKulcs.k && this._mod === "magno" && !this._polc && !this._szerk) {
      this._mod = "radio"; TAR.ir("tablet-radio-mod", this._mod); this._netZar(); this._dalZar(); this._igazitKesobb();
    }
    this._radioKulcs = { e: hsz.entity, k: radioKulcs };
    const kulso = i === KULSO ? this._kulso() : null;
    if (i >= 0) this._utolso = i;
    const mutat = i >= 0 ? i : this._utolso ?? Math.max(0, c.adok.findIndex((a) => a.nev === TAR.olvas("tablet-radio-ado")));
    const a = s?.attributes || {};
    const elo = sr.getElementById("elo"), magno = sr.getElementById("magno");
    elo.classList.toggle("rejt", this._mod === "magno");
    magno.classList.toggle("rejt", this._mod !== "magno");
    elo.classList.toggle("be", radioSzol);
    elo.classList.toggle("net", radioSzol && !!kulso);
    sr.querySelectorAll('.ogomb[data-f="net"]').forEach((b) => b.classList.toggle("be", !!this._net || (radioSzol && !!kulso)));
    elo.classList.toggle("tilt", !elerheto);
    magno.classList.toggle("tilt", !elerheto);
    sr.getElementById("mutato").style.left = `${POZ(c.adok[mutat]?.frekvencia ?? 98)}%`;
    sr.querySelectorAll(".ado").forEach((b) => b.classList.toggle("akt", radioSzol && Number(b.dataset.i) === i));
    sr.querySelectorAll(".hsz").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === this._hsz));
    const hu = this._hangUtolso(), L = this._hszIdx, bton = this._hsz === this._btIdx;
    sr.querySelectorAll(".hszv").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === hu));
    sr.querySelectorAll(".fhsz, .flamp").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === hu));
    sr.querySelectorAll(".forgo").forEach((x) => x.classList.toggle("bton", bton));
    sr.querySelectorAll(".forgo .vsapka").forEach((x) => { x.style.transform = `rotate(${this._forgoSzog(hu)}deg)`; });
    sr.querySelectorAll(".thsz .tfog").forEach((x) => x.style.setProperty("--p", L.length > 1 ? L.indexOf(hu) / (L.length - 1) : 0));
    sr.querySelectorAll(".btv").forEach((b) => b.classList.toggle("akt", (b.dataset.b === "1") === bton));
    sr.querySelectorAll(".tbt .tfog").forEach((x) => x.style.setProperty("--p", bton ? 0 : 1));
    sr.querySelectorAll(".tolok").forEach((x) => x.classList.toggle("bton", bton));
    sr.querySelectorAll(".hszfej").forEach((x) => { x.textContent = elerheto ? KN(hsz) : `${KN(hsz)} · UNAVAILABLE`; });
    const adoNev = kulso ? kulso.nev : c.adok[i]?.nev;
    const dal = [a.media_artist, a.media_title].filter((x) => x && x !== adoNev && !URLSZERU(x)).join(" – ");
    sr.getElementById("ado").innerHTML = radioSzol && kulso ? `<b>${ESC(kulso.nev)}</b> · NET${kulso.orszag ? ` · ${ESC(kulso.orszag)}` : ""}`
      : radioSzol ? `<b>${ESC(c.adok[i].nev)}</b> · ${c.adok[i].virt ? "WEB" : `${MHZ(c.adok[i].frekvencia)} MHz`}`
      : SZOL(s) ? `<b>TAPE DECK PLAYING</b>` : "OFF";
    sr.getElementById("cim").textContent = radioSzol ? dal : "";
    {
      // dalszöveghez előadó + cím kell: külön mezőben, vagy „Előadó - Cím” alakban a címben
      let ea = a.media_artist && a.media_artist !== adoNev && !URLSZERU(a.media_artist) ? a.media_artist : "", dc = a.media_title && a.media_title !== adoNev && !URLSZERU(a.media_title) ? a.media_title : "";
      if (!ea && / [-–] /.test(dc)) [ea, dc] = dc.split(/ [-–] /, 2);
      this._radioDal = radioSzol && ea && dc ? { artist: ea.trim(), title: dc.trim() } : null;
      sr.getElementById("cim").classList.toggle("dalos", !!this._radioDal);
    }
    if (!this._forgat && a.volume_level != null) { this._hangero = a.volume_level; this._rajzHangero(a.volume_level); }
    this._radioAll = { szol: radioSzol, keres: !!this._kezi, s, i };
    this._alvasRajz();
    this._jelRajz();
    if (this._hangolo) this._hangoloRajz();

    // magnó
    const kaz = this._kazetta();
    const szalagSzol = SZOL(s) && i === -1, szunet = SZUNETEL(s) && i === -1;
    this._magnoAllapot = { szol: szalagSzol, szunet, s, kaz };
    magno.classList.toggle("fut", szalagSzol);
    magno.classList.toggle("szun", szunet);
    this._funkRajz();
    if (this._polc?.ful === "sor") this._sorKiemel();
    sr.querySelectorAll(".mg").forEach((b) => b.classList.toggle("akt", (b.dataset.k === "play" && szalagSzol) || (b.dataset.k === "pause" && szunet)));
    this._infoRajz(a, kaz, szalagSzol || szunet);
    sr.getElementById("mallapot").textContent = szalagSzol ? "PLAY" : szunet ? "PAUSE" : radioSzol ? "RADIO ON" : "STOP";
    sr.getElementById("vufajta").textContent = !szalagSzol ? "TAPE · NORMAL" : this._jelAllapot === "elemzes" ? (this._config.magno?.vu_kijelzo === "fluor" ? "PEAK · dBFS" : "VU · NORMALIZED") : "VU · SIMULATED";
    this._szalagRajz();
    this._jelFeliratkozas();
    this._animIndit();
  }

  // széles elrendezésben a magnó hangerőgombja a kijelző + öt gomb blokk tengelyébe (függőlegesen középre) kerül
  // – a forgó választó és a RADIO/TAPE kapcsoló pedig a billentyűsor (eject … pause) tengelyébe
  _igazit() {
    const sr = this.shadowRoot, m = sr?.getElementById("magno"), j = m?.querySelector(".mjobb");
    // a SPEAKERS felirat akkora, mint a VOLUME: a hangerőgomb és a választó máshogy van kicsinyítve, ezért mérve igazítja
    sr?.querySelectorAll(".valaszto small").forEach((s) => {
      const h = s.closest(".elo")?.querySelector(".hcim"), hv = h?.getBoundingClientRect().height, sv = s.getBoundingClientRect().height;
      if (!hv || !sv) return;
      const most = parseFloat(s.style.fontSize) || 7, uj = (most * hv) / sv;
      if (Math.abs(uj - most) > 0.05) s.style.fontSize = `${uj.toFixed(2)}px`;
    });
    const parok = [[".mjobb > .hangero", ".mkij", "--hgy"], [".mjobb > .forgo", ".msor", "--fgy"]];
    if (!j) return;
    if (this.hasAttribute("keskeny") || m.classList.contains("rejt")) { j.style.removeProperty("--hgy"); j.style.removeProperty("--fgy"); return; }
    for (const [mit, mihez, v] of parok) {
      const a = m.querySelector(mit)?.getBoundingClientRect(), b = m.querySelector(mihez)?.getBoundingClientRect();
      if (!a?.height || !b?.height) continue;
      const regi = parseFloat(j.style.getPropertyValue(v)) || 0;
      let uj = Math.max(-60, Math.min(140, regi + (b.top + b.height / 2) - (a.top + a.height / 2)));
      if (v === "--fgy") {
        // a választó nem mehet följebb a helyénél (ott a hangerőgomb), és nem lóghat ki a kártya aljából
        const jr = j.getBoundingClientRect();
        uj = Math.max(0, Math.min(uj, regi + (jr.bottom - a.bottom)));
      }
      if (Math.abs(uj - regi) > 0.5) j.style.setProperty(v, `${uj.toFixed(1)}px`);
    }
  }
  _igazitKesobb() { cancelAnimationFrame(this._igazitIdo); this._igazitIdo = requestAnimationFrame(() => this._igazit()); }

  // görgetés (mint a régi kijelzőkön), ha a szöveg nem fér ki: megáll az elején, végigúszik, megáll a végén, vissza
  _gorgo(doboz) {
    const g = doboz?.querySelector(".gord"); if (!g) return;
    requestAnimationFrame(() => {
      const tul = g.scrollWidth - doboz.clientWidth;
      doboz.classList.toggle("tul", tul > 2);
      if (tul > 2) { g.style.setProperty("--tav", `${-tul}px`); g.style.setProperty("--ido", `${(5 + tul / 22).toFixed(1)}s`); }
    });
  }

  // a kijelző-kazetta szövegei (Snowsky Echo mintára)
  _infoRajz(a, kazTarolt, megy) {
    const sr = this.shadowRoot, hsz = this._hangszoro();
    const id = String(a.media_content_id || "");
    const sid = (/[?&]sid=(\d+)/.exec(id) || [])[1];
    // a betöltött kazetta szól-e még – ha közben mást indítottak (hanggal, a Sonos appból, másik eszközről), a kijelzőn
    // a ténylegesen szóló lista / album neve kell, nem a régi kazettáé
    const nasMost = /\/media\/local\//.test(id) || /\/media\/local\//.test(a.media_title || "");
    const kaz = !kazTarolt || !megy ? kazTarolt
      : kazTarolt.forras === "nas" ? (nasMost && (!kazTarolt.szamok?.length || this._szamIndex(kazTarolt, a) >= 0) ? kazTarolt : null)
      : kazTarolt.forras === "stream" ? (nasMost ? null : kazTarolt) : kazTarolt;
    const nas = kaz?.forras === "nas" || /\/media\/local\//.test(id) || /\/media\/local\//.test(a.media_title || "");
    const atm = kaz?.atmeneti || /\.cantabile_atmeneti\//.test(`${id} ${a.media_title || ""}`);
    const am = this._atmenetiAll;
    const forras = atm && (megy || kaz) ? (am && am.kesz < am.db ? `TEMP ↑${am.kesz}/${am.db}` : "TEMP") : megy ? (nas ? "NAS" : SZOLGALTATO[sid] ? SZOLGALTATO[sid].split(" ")[0].toUpperCase() : kaz?.forras === "stream" ? (SZOLG_NEV[kaz.tipus] || "STREAM") : kaz?.forras === "tel" ? "PHONE" : "") : (kaz ? (kaz.forras === "nas" ? "NAS" : kaz.forras === "tel" ? "PHONE" : "STREAM") : "");
    // állapotsor: hangerő · hangszóró · sorszám · lista · keverés · ismétlés · forrás
    let sorsz = "–/–";
    if (megy && a.queue_size) sorsz = `${String(a.queue_position || 1).padStart(3, "0")}/${String(a.queue_size).padStart(3, "0")}`;
    else if (megy && kaz?.szamok?.length) { const i = this._szamIndex(kaz, a); sorsz = `${String(i + 1 || 1).padStart(3, "0")}/${String(kaz.szamok.length).padStart(3, "0")}`; }
    const lista = (kaz?.cim || (megy ? a.media_playlist || a.media_album_name : "") || "").toUpperCase();
    const kor = this._korok();
    const ism = a.repeat === "one" ? "RPT1" : a.repeat === "all" ? (kor >= 2 && kor <= 5 ? `RPT×${kor}` : "RPT") : "NOR";
    const vol = Math.round((this._hangero ?? a.volume_level ?? 0) * 100);
    sr.getElementById("ksav").innerHTML = `
      <span>${KI.hang}${vol}</span><span>${KI.hangszoro}${ESC(KN(hsz))}</span><span class="sorgomb" title="${T("Lejátszási sor")}">${sorsz}</span>
      <span class="lista"><b>${ESC(lista)}</b></span>
      <span class="kapcsolo ${a.shuffle ? "" : "ki"}" data-v="kever">${KI.kever}</span>
      <span class="doboz kapcsolo" data-v="ismetel">${ism}</span>${forras ? `<span class="doboz">${forras}</span>` : ""}`;
    sr.querySelector("#ksav .sorgomb")?.addEventListener("click", (e) => { e.stopPropagation(); this._polc = { ful: "sor", ut: [] }; this._polcRajz(); });
    sr.querySelectorAll("#ksav .kapcsolo").forEach((x) => x.addEventListener("click", (e) => {
      e.stopPropagation();
      this._funkGomb(x.dataset.v === "kever" ? "kever" : "korok");
    }));
    // cím, előadó · album · minőség
    let cim = "", eloado = "", album = "";
    if (megy) {
      // a WiiM a nyers fájlnevet adja címként (átmeneti feltöltésnél időbélyeg-előtaggal): azt is megtisztítjuk
      const fajlszeru = /^\d{10,}_|\.(mp3|flac|m4a|aac|ogg|opus|wav|wma)$/i.test(a.media_title || "");
      cim = !URLSZERU(a.media_title) && a.media_title && !fajlszeru ? a.media_title : FAJLNEV(a.media_title || id);
      eloado = a.media_artist || kaz?.alcim || "";
      album = a.media_album_name || kaz?.cim || "";
      if (!a.media_artist && cim.includes(" – ")) [eloado, cim] = cim.split(" – ", 2);
    } else if (kaz) { cim = kaz.cim; eloado = kaz.alcim || ""; album = ""; }
    const f = this._formatum;
    const minoseg = f?.kodek || SZOLGALTATO[sid] || (forras === "NAS" ? "NAS" : "");
    sr.getElementById("ablak").classList.toggle("ures", !cim);
    const kcimHtml = `<span class="gord">${ESC(cim || "— EMPTY —")}</span>`;
    const ksorHtml = cim
      ? `<span class="gdoboz kea"><span class="gord">${KI.ember}<em>${ESC(eloado || "–")}</em>${album ? `<i class="ksep"></i>${KI.lemez}<em>${ESC(album)}</em>` : ""}</span></span><span class="kmin">${KI.szint}<em>${ESC(minoseg || "–")}</em></span>`
      : `<span class="kures"><em>EJECT: CHOOSE A TAPE</em></span>`;
    // csak változáskor írjuk át (különben a görgetés minden frissítésnél elölről indulna)
    if (kcimHtml !== this._kcimHtml) { this._kcimHtml = kcimHtml; sr.getElementById("kcim").innerHTML = kcimHtml; this._gorgo(sr.getElementById("kcim")); }
    if (ksorHtml !== this._ksorHtml) { this._ksorHtml = ksorHtml; sr.getElementById("ksor").innerHTML = ksorHtml; this._gorgo(sr.querySelector("#ksor .kea")); }
    sr.getElementById("sav").setAttribute("fill", cim ? SZIN(kaz?.cim || album || cim) : "#888");
    this._kazDal = megy && cim && eloado ? { artist: eloado, title: cim, album: album || null, duration: Number(a.media_duration) || null } : null;
    sr.getElementById("kcim").classList.toggle("dalos", !!this._kazDal);
    // formátum-sor: MP3 | 44.1kHz | 16bit | 320kbps + SQ/HQ jel + szív (Sonos-kedvenc)
    let form = "";
    if (megy && f) {
      form = [f.kodek, f.khz ? `${String(f.khz).replace(".", ",")}kHz` : "", f.bit ? `${f.bit}bit` : "", f.kbps ? `${f.kbps}kbps` : ""].filter(Boolean).join(" | ");
      const jel = /^(FLAC|ALAC|WAV|PCM.*|APE|WV|DSD.*)$/i.test(f.kodek || "") ? "SQ" : (f.kbps || 0) >= 256 ? "HQ" : "";
      if (jel) form += ` <span class="jel">${jel}</span>`;
    } else if (megy && SZOLGALTATO[sid]) form = `${SZOLGALTATO[sid]} | stream`;
    if (megy && kaz?.forras === "stream") form += KI.sziv;
    sr.getElementById("kform").innerHTML = form;
  }

  // ---- valódi jel (cantabile/signal) ----

  // a magnó látszik → feliratkozás a választott lejátszó jelére; különben leiratkozás (a szerveren leáll az ffmpeg)
  _jelFeliratkozas() {
    const kell = this._lathato !== false && this._hangszoro()?.entity !== HELYI && this.isConnected && !!this._hass?.connection && !this._jelHiba;
    const ent = this._hangszoro()?.entity;
    if (kell && this._jelEnt === ent) return;
    if (this._jelLeir) {
      this._jelLeir.then((f) => f && f()).catch(() => {});
      this._jelLeir = null; this._jelEnt = null; this._jelAllapot = null; this._jelSor = []; this._formatum = null;
    }
    if (!kell) return;
    this._jelEnt = ent;
    this._jelSor = [];
    this._jelLeir = this._hass.connection.subscribeMessage((m) => this._jelUzenet(m), { type: "cantabile/signal", entity_id: ent })
      .catch(() => { this._jelHiba = true; this._jelAllapot = null; this._jelEnt = null; return null; });   // nincs integráció → utánzat
  }

  _jelUzenet(m) {
    if (m.allapot) {
      this._jelAllapot = m.allapot;
      if (this._mod !== "magno") this._jelRajz();
      const f = this.shadowRoot.getElementById("vufajta");
      if (f && this._magnoAllapot?.szol) f.textContent = m.allapot === "elemzes" ? (this._config.magno?.vu_kijelzo === "fluor" ? "PEAK · dBFS" : "VU · NORMALIZED") : "VU · SIMULATED";
    }
    if ("formatum" in m) { this._formatum = m.formatum || null; this._frissit(); }
    if (m.l == null) return;
    if (this._mod !== "magno") { this._szint = Math.max(m.l, m.r); if (performance.now() - (this._jelRajzIdo || 0) > 700) { this._jelRajzIdo = performance.now(); this._jelRajz(); } return; }
    const kesl = Number(this._config.magno?.vu_kesleltetes_mp) || 0;
    this._jelSor.push({ ido: performance.now() + kesl * 1000, l: m.l, r: m.r, pl: m.pl, pr: m.pr });
    this._hnMer(m.l, m.r);
    if (this._jelSor.length > 400) this._jelSor.splice(0, this._jelSor.length - 400);
    this._animIndit();
  }

  // a szalag haladása: Sonos-sorban (sorszám + számon belüli rész) / hossz; WiiM-szkriptnél a kazetta-lista alapján
  _halad() {
    const m = this._magnoAllapot; if (!m?.s) return { p: 0, ido: 0 };
    const a = m.s.attributes || {};
    let poz = Number(a.media_position) || 0;
    if (m.szol && a.media_position_updated_at) poz += (Date.now() - Date.parse(a.media_position_updated_at)) / 1000;
    // tekerés közben a választott hely; ugrás után addig, amíg a lejátszó vissza nem jelez (legfeljebb 4 mp)
    const u = this._ugras;
    if (this._tekeres) poz = this._tekeres.poz;
    else if (u && Date.now() - u.mikor < 4000 && !(Date.parse(a.media_position_updated_at || 0) > u.mikor)) poz = u.poz + (m.szol ? (Date.now() - u.mikor) / 1000 : 0);
    const hossz = Number(a.media_duration) || 0;
    // ugyanazt a számot ismételve a Sonos nem jelez, a becsült idő túlfutna: ismétlésnél elölről számolunk, különben a végén megáll
    if (hossz > 0 && poz > hossz) poz = a.repeat === "one" || (a.repeat === "all" && !(a.queue_size > 1)) ? poz % hossz : hossz;
    const resz = hossz > 0 ? Math.min(1, poz / hossz) : 0;
    let p = resz;
    if (a.queue_size > 1 && a.queue_position) p = (a.queue_position - 1 + resz) / a.queue_size;
    else if (m.kaz?.szamok?.length > 1) { const i = this._szamIndex(m.kaz, a); if (i >= 0) p = (i + resz) / m.kaz.szamok.length; }
    return { p: Math.min(1, Math.max(0, p)), ido: poz, resz, hossz };
  }

  _szalagRajz() {
    const sr = this.shadowRoot, m = this._magnoAllapot;
    if (!sr || !m) return;
    const megy = m.szol || m.szunet;
    const { p, ido, resz, hossz } = megy ? this._halad() : { p: 0, ido: 0, resz: 0, hossz: 0 };
    const rb = 13 + 17 * (1 - p), rj = 13 + 17 * p;
    sr.getElementById("pb").setAttribute("r", rb.toFixed(1));
    sr.getElementById("pj").setAttribute("r", rj.toFixed(1));
    const el = ORA(ido);
    if (el !== this._elRajzolt) {
      this._elRajzolt = el;
      sr.getElementById("kel").innerHTML = `${m.szunet ? IKON.pause : IKON.play}${el}`;
    }
    sr.getElementById("khossz").textContent = hossz ? ORA(hossz) : megy ? "LIVE" : "0:00:00";
    sr.getElementById("kcsik").style.width = `${(resz * 100).toFixed(1)}%`;
    if (this._config.magno?.vu_kijelzo === "fluor") {
      const szam = String(FORDULAT(p) % 10000).padStart(4, "0");
      const mp = Math.floor(ido || 0), perc = Math.min(99, Math.floor(mp / 60));
      // alvásidőzítőnél a jobb számláló a hátralévő időt mutatja (visszaszámlálás), előtte stopperóra-ikon
      const av = this._alvasVege(), mar = av ? Math.max(0, Math.round((av - Date.now()) / 1000)) : 0;
      const idoSz = av ? `${String(Math.min(99, Math.floor(mar / 60))).padStart(2, "0")}.${String(mar % 60).padStart(2, "0")}`
        : `${String(perc).padStart(2, "0")}.${String(mp % 60).padStart(2, "0")}`;
      if (this._vfdAlvas !== !!av) {
        this._vfdAlvas = !!av;
        sr.getElementById("vstop").classList.toggle("be", !!av);
        sr.getElementById("vidocim").textContent = av ? "SLEEP" : "TIME";
      }
      const all = m.szunet ? "szunet" : m.szol ? "megy" : "all";
      if (this._vfdSzam !== szam) { this._vfdSzam = szam; sr.getElementById("vszam").innerHTML = HETSZEG(szam); }
      if (this._vfdIdo !== idoSz) { this._vfdIdo = idoSz; sr.getElementById("vido").innerHTML = HETSZEG(idoSz); }
      if (this._vfdAll !== all) {
        this._vfdAll = all;
        sr.getElementById("vall").innerHTML = all === "megy" ? '<svg viewBox="0 0 10 10"><path d="M2 1L9 5L2 9Z"/></svg>'
          : all === "szunet" ? '<svg viewBox="0 0 10 10"><path d="M2 1H4V9H2ZM6 1H8V9H6Z"/></svg>' : '<svg viewBox="0 0 10 10"><path d="M2 2H8V8H2Z"/></svg>';
      }
    }
  }

  // VU-mérők + számláló: csak ha a magnó látszik és szól (vagy a mutató még visszaesik)
  _animIndit() {
    if (this._anim || this._lathato === false || this._mod !== "magno") return;
    const m = this._magnoAllapot;
    if (!m?.szol && this._vu[0] < 0.01 && this._vu[1] < 0.01) return;
    let utolso = 0, utem = 0, elozo = 0;
    const lep = (t) => {
      this._anim = null;
      const m2 = this._magnoAllapot;
      if (this._lathato === false || this._mod !== "magno" || !this.isConnected) return;
      if (this._hangszoro()?.entity === HELYI && this._aktAudio && this._aktAudio === this._audioE && !this._aktAudio.paused && this._elemzo) {
        const sz = this._elemzoSzint();
        this._jelSor = [{ ido: t, l: sz[0], r: sz[1], pl: sz[2], pr: sz[3] }];
        if (t - (this._hnBtIdo || 0) > 50) { this._hnBtIdo = t; this._hnMer(sz[0], sz[1]); }
        if (this._jelAllapot !== "elemzes") { this._jelAllapot = "elemzes"; this._frissit(); }
      }
      const sor = this._jelSor || [];
      while (sor.length > 1 && sor[1].ido <= t) sor.shift();
      const s0 = sor[0];
      const valodi = m2?.szol && this._jelAllapot === "elemzes" && s0 && s0.ido <= t && t - s0.ido < 1000;
      if (valodi) { const off = this._config.magno?.vu_kijelzo === "fluor" ? 0 : this._hnOff(); this._vuCel = [DBPOZ(s0.l + off), DBPOZ(s0.r + off)]; }
      if (t - utolso > 85) {
        utolso = t;
        if (valodi) { /* a cél a valódi jelből jön */ } else if (m2?.szol) {
          const hang = Math.min(1, this._hangero ?? 0.4);
          const alap = 0.42 + 0.38 * hang;
          if (t - utem > 470) { utem = t; this._lokes = 0.22; }   // ütem ~128/perc
          this._lokes = (this._lokes || 0) * 0.8;
          for (let k = 0; k < 2; k++) this._vuCel[k] = Math.min(1.04, Math.max(0.05, alap + this._lokes + (Math.random() - 0.5) * 0.34));
        } else this._vuCel = [0, 0];
        if (t - (this._szalagIdo || 0) > 500) { this._szalagIdo = t; this._szalagRajz(); }
      }
      const dt = elozo ? Math.min(100, t - elozo) : 16; elozo = t;
      for (let k = 0; k < 2; k++) {
        const d = this._vuCel[k] - this._vu[k];
        // valódi jelnél VU-tehetetlenség (~300 ms a 99%-ig, mindkét irányba); utánzatnál gyors fel, lassú le
        this._vu[k] += d * (valodi ? 1 - Math.exp(-dt / 65) : d > 0 ? 0.35 : 0.08);
      }
      const sr = this.shadowRoot;
      sr.getElementById("tuL").style.transform = `rotate(${-42 + 84 * this._vu[0]}deg)`;
      sr.getElementById("tuR").style.transform = `rotate(${-42 + 84 * this._vu[1]}deg)`;
      if (this._config.magno?.vu_kijelzo === "fluor") {
        // csúcsmérő: azonnal felugrik, 20 dB / 1,7 mp-cel esik vissza; utánzatnál a VU-mutatóból becsült hely
        this._pk = this._pk || [-60, -60];
        const poz = [0, 1].map((k) => {
          if (!valodi) { this._pk[k] = -60; return this._vu[k] * 0.86; }
          const cel = s0[k ? "pr" : "pl"] ?? Math.min(-1, s0[k ? "r" : "l"] - 12 + 6);   // régi szervernél: becslés az átlagszintből (OVER-t nem gyújt)
          this._pk[k] = Math.max(cel, this._pk[k] - (PK_ESES * dt) / 1000);
          if (cel >= -0.1) this._tulvez = t;
          return PKPOZ(this._pk[k]);
        });
        this._vfdRajz(t, !m2?.szol, poz);
      }
      if (m2?.szol || this._vu[0] > 0.005 || this._vu[1] > 0.005) this._anim = requestAnimationFrame(lep);
    };
    this._anim = requestAnimationFrame(lep);
  }

  // fluoreszcens kijelző: kigyújtott szegmensek + csúcstartás (1,2 mp-ig marad, aztán lépésenként esik)
  // hangosság-mérés számonként: energiaátlag a nem csendes ablakokból; számváltáskor újraindul (az előző eltolásból)
  _hnMer(l, r) {
    const a = this._magnoAllapot?.s?.attributes || {}, kulcs = `${a.media_content_id || ""}|${a.media_title || ""}`;
    let h = this._hn;
    if (!h || h.kulcs !== kulcs) h = this._hn = { kulcs, e: 0, n: 0, off: h ? h.off : 0 };
    if (Math.max(l, r) < HN_CSEND) return;
    h.e += (10 ** (l / 10) + 10 ** (r / 10)) / 2; h.n++;
    if (h.n >= 20) h.off = Math.max(-HN_MAX, Math.min(HN_MAX, HN_CEL - 10 * Math.log10(h.e / h.n)));
  }
  _hnOff() { return this._hn?.off || 0; }

  // PEAK: −3 dBFS fölötti csúcs (a tartott csúcs alapján), OVER: valódi digitális vágás (≥ −0,1 dBFS) az utolsó 1,2 mp-ben
  _vfdRajz(t, all, poz) {
    const sr = this.shadowRoot;
    this._csucs = this._csucs || [{ n: 0, t: 0 }, { n: 0, t: 0 }];
    ["vfdL", "vfdR"].forEach((id, k) => {
      const szeg = sr.getElementById(id)?.children;
      if (!szeg) return;
      const N = szeg.length, n = Math.round(Math.min(1, Math.max(0, poz[k])) * N), cs = this._csucs[k];
      if (n >= cs.n) { cs.n = n; cs.t = t; } else if (t - cs.t > 1200) { cs.n = Math.max(n, cs.n - 1); cs.t = t - 1140; }
      if (all && n === 0) cs.n = 0;
      const over = t - (this._tulvez || -1e9) < 1200;
      const kulcs = n * 1000 + cs.n * 2 + (over ? 1 : 0);
      if (this["_vfdAll" + k] === kulcs) return;
      this["_vfdAll" + k] = kulcs;
      for (let i = 0; i < N; i++) szeg[i].classList.toggle("be", i < n || (cs.n > 0 && i === cs.n - 1));
      // a bal sor végén PEAK (−3 dBFS fölött), a jobb sor végén OVER (vágás)
      szeg[0].parentElement.nextElementSibling?.classList.toggle("be", k === 0 ? Math.max(...this._csucs.map((c) => c.n)) / N > 0.79 : over);
    });
  }

  getCardSize() { return 6; }
  getGridOptions() { return { columns: "full", min_columns: 6 }; }
}

// a BT kimenet (ezen a készüléken szóló <audio>) az oldalhoz tartozik, nem a kártyapéldányhoz: ha a HA a vezérlőpultot
// újraépíti (pl. mobilnet → Wi-Fi váltás utáni újrakapcsolódáskor), az új kártya átveszi a szóló lejátszót, és le is tudja állítani
const HELYI_KOZOS = {};
["_audio", "_audioE", "_aktAudio", "_elemzo", "_helyiId", "_helyiLista", "_helyiMeret", "_helyiNevek", "_telKaz", "_helyiAlvas", "_helyiAlvasIdo"].forEach((k) =>
  Object.defineProperty(CantabileCard.prototype, k, { get() { return HELYI_KOZOS[k]; }, set(v) { HELYI_KOZOS[k] = v; }, configurable: true }));

if (!customElements.get("cantabile-card")) {
  customElements.define("cantabile-card", CantabileCard);
  // a korábbi név (custom:tablet-radio) is működik
  if (!customElements.get("tablet-radio")) customElements.define("tablet-radio", class extends CantabileCard {});
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "cantabile-card", name: "Cantabile", preview: true,
    description: T("Régi hi-fi rádió és tape deck (ezüst vagy fekete): adógombok, NET-rádió, forgó kazetta, valódi VU-mérők, NAS, Deezer, Spotify és Tidal.") });
}

// ---------------------------------------------------------------------------------------------------------------
// Cantabile TV (custom:cantabile-tv): a Cast-os TV-n futó teljes képernyős oldal. A hangot maga játssza (a Cantabile
// TV-lejátszó küldi a parancsokat, tv.py), Web Audio-val elemzi: equalizer + hullámforma, mögötte az előadó képe,
// mellette a szám adatai és a haladásjelző. 1280×720-as vásznon rajzol, és a képernyőhöz nagyítja (a Cast-vevő régi
// Chrome-jához: nincs container query, nincs inset).
const TV_SVG_LEMEZ = `<svg viewBox="0 0 200 200"><defs><radialGradient id="tvl" cx=".5" cy=".5" r=".5"><stop offset=".18" stop-color="#d9a441"/><stop offset=".2" stop-color="#121214"/><stop offset=".98" stop-color="#1c1c1f"/><stop offset="1" stop-color="#070708"/></radialGradient></defs>
  <circle cx="100" cy="100" r="98" fill="url(#tvl)"/>${[30, 38, 46, 54, 62, 70, 78, 86, 93].map((r) => `<circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`).join("")}
  <path d="M100 2 A98 98 0 0 1 198 100" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/><circle cx="100" cy="100" r="3" fill="#070708"/></svg>`;

// országok, ahol a 12 órás kijelzés a szokás (a többiben 24 órás)
const ORA12 = ["US", "CA", "AU", "NZ", "IN", "PH", "PK", "BD", "EG", "SA", "MY", "CO", "MX", "JO", "OM", "QA", "KW", "AE", "SV", "HN", "NI"];
// 12 / 24 órás: a HA-profil beállítása, különben a HA-ban megadott ország szokása (pl. HU → 24, US → 12)
const ORA_OPC = (h) => {
  const tf = h?.locale?.time_format, orszag = String(h?.config?.country || "").toUpperCase();
  const h12 = tf === "12" ? true : tf === "24" ? false : orszag ? ORA12.includes(orszag) : undefined;
  return h12 !== undefined ? { hour12: h12 } : {};
};

class CantabileTv extends HTMLElement {
  setConfig(c) { this._c = { visual: "both", ...(c || {}) }; }

  set hass(h) {
    this._h = h;
    if (this._kesz) return;
    this._kesz = true;
    // hibakeresés a Cast-vevőn (oda nem látunk be): a hibák és az állapot `cantabile_tv_diag` eseményként jönnek vissza
    window.addEventListener("error", (e) => this._diag({ hiba: `${e.message} @${e.lineno}:${e.colno}` }));
    window.addEventListener("unhandledrejection", (e) => this._diag({ hiba: `promise: ${e.reason}` }));
    BETU(this._abs("/api/cantabile/font/"));
    this._epit();
    this._feliratkozik();
  }

  getCardSize() { return 12; }

  // a Cast-vevő a kártyát kétszer is létrehozhatja: csak a lejátszóhoz kapcsolódott példány látszik (felül), a többi
  // elrejti magát és nem kapcsolódik újra; a lekerült példány elengedi a kapcsolatot
  connectedCallback() {
    clearTimeout(this._levesz);
    if (this._le) { this._indit(); this._feliratkozik(); }   // visszakerült (pl. visszanavigáltak a nézetre)
  }
  disconnectedCallback() {
    this._levesz = setTimeout(() => this._elenged(), 3000);
  }

  // óra, haladásjelző, rajzolás – a lekerült példányban leállnak (_elenged), visszakerüléskor újraindulnak
  _indit() {
    this._le = false;
    this._orak = [setInterval(this._ora, 10000), setInterval(() => this._halad(), 500)];
    this._rajzol();
  }

  // a lekerült példány elengedi a lejátszót; a hang (közös, az oldalhoz tartozik) szól tovább, az új példány átveszi
  _elenged() {
    if (this.isConnected) return;
    this._le = true;
    (this._orak || []).forEach(clearInterval); this._orak = null;
    if (this._leir) { this._leir(); this._leir = null; }
    if (window._cantabileTv === this) window._cantabileTv = null;
  }

  get _teljes() { return location.hostname === "cast.home-assistant.io" || this._c.fullscreen === true; }

  _diag(adat) {
    try {
      const v = this._v;
      this._h.callWS({ type: "fire_event", event_type: "cantabile_tv_diag", event_data: { ...adat, ures: v ? v.classList.contains("ures2") : null,
        valt: this.shadowRoot?.querySelector(".tart")?.classList.contains("valt"), w: innerWidth, h: innerHeight, tr: v ? v.style.transform : "", ua: navigator.userAgent.slice(-40) } }).catch(() => {});
    } catch (e) { /* hibakeresés közben ne legyen újabb hiba */ }
  }

  _abs(p) { return !p ? "" : /^https?:/i.test(p) ? p : this._h.hassUrl ? this._h.hassUrl(p) : p; }

  _epit() {
    const sr = this.shadowRoot || this.attachShadow({ mode: "open" });
    sr.innerHTML = `<style>
      :host { display: block; position: relative; width: 100%; padding-top: 56.25%; overflow: hidden; background: #050506; }
      :host([teljes]) { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 0; z-index: 9; }
      .v { position: absolute; left: 0; top: 0; width: 1280px; height: 720px; transform-origin: 0 0; overflow: hidden; color: #f3ead8;
        font-family: "Exo 2", "Cantabile Sans", Arial, sans-serif; background: #070708; }
      .hat { position: absolute; left: -4%; top: -4%; width: 108%; height: 108%; background: center / cover no-repeat; opacity: 0; transition: opacity 1.6s ease;
        animation: kb 38s ease-in-out infinite alternate; will-change: transform; }
      .hat.lat { opacity: 1; }
      @keyframes kb { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.12) translate(-2.5%, -1.5%); } }
      .alt { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 1.6s ease;
        background: radial-gradient(60% 80% at 78% 40%, rgba(214,140,40,.28), transparent 70%), radial-gradient(50% 60% at 15% 90%, rgba(120,60,150,.22), transparent 70%), linear-gradient(160deg, #141217, #07070a); }
      .alt.lat { opacity: 1; }
      .alt .lem { position: absolute; right: -120px; top: 40px; width: 640px; height: 640px; opacity: .55; animation: forog 18s linear infinite; }
      @keyframes forog { to { transform: rotate(360deg); } }
      .sot { position: absolute; left: 0; top: 0; width: 100%; height: 100%;
        background: linear-gradient(90deg, rgba(6,6,8,.94) 0%, rgba(6,6,8,.8) 42%, rgba(6,6,8,.35) 100%), linear-gradient(0deg, rgba(4,4,5,.96) 0%, rgba(4,4,5,.55) 34%, transparent 60%); }
      .fej { position: absolute; left: 64px; right: 64px; top: 30px; display: flex; align-items: baseline; justify-content: space-between; }
      .marka { font: 400 46px/1 "Great Vibes", "Brush Script MT", cursive; color: #f3ead8; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
      .ora { font: 400 24px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; color: #f3ead8; text-align: right; }
      .ora small { display: block; margin-top: 8px; font-size: 11px; letter-spacing: .3em; color: rgba(243,234,216,.6); }
      .tart { position: absolute; left: 64px; right: 64px; top: 128px; height: 340px; display: flex; gap: 52px; align-items: center; transition: opacity .6s ease; }
      .tart.valt { opacity: 0; }
      .bor { flex: none; width: 330px; height: 330px; border-radius: 6px; background: #111 center / cover no-repeat; position: relative;
        box-shadow: 0 24px 50px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.08); }
      .bor .lem { position: absolute; left: 6%; top: 6%; width: 88%; height: 88%; display: none; }
      .bor.ures { background: radial-gradient(circle at 30% 25%, #2a2620, #0e0d0c); } .bor.ures .lem { display: block; animation: forog 9s linear infinite; }
      .adat { min-width: 0; flex: 1; }
      .cimke { font: 400 12px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .38em; color: #ffb547; text-shadow: 0 0 10px rgba(255,170,50,.45); display: flex; align-items: center; gap: 12px; }
      .cimke i { width: 9px; height: 9px; border-radius: 50%; background: #ffb020; box-shadow: 0 0 8px #ffb020; animation: pis 1.6s ease-in-out infinite; }
      @keyframes pis { 50% { opacity: .3; } }
      .cim { margin-top: 18px; font-weight: 600; font-size: 54px; line-height: 1.08; color: #fff; text-shadow: 0 3px 18px rgba(0,0,0,.6);
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .elo { margin-top: 14px; font-weight: 500; font-size: 30px; color: #f1e3c6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .alb { margin-top: 8px; font-size: 21px; color: #b9ad98; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .csipek { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 10px; }
      .csipek span { font: 400 11px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; padding: 7px 10px 6px; border-radius: 3px; color: #ffd08a;
        border: 1px solid rgba(255,176,32,.45); background: rgba(20,16,10,.45); }
      canvas { position: absolute; left: 64px; bottom: 70px; width: 1152px; height: 170px; }
      .hal { position: absolute; left: 64px; right: 64px; bottom: 30px; display: flex; align-items: center; gap: 18px; font: 400 14px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; color: #e7dcc6; }
      .sav { flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,.14); position: relative; }
      .tel { position: absolute; left: 0; top: 0; height: 100%; width: 0; border-radius: 2px; background: linear-gradient(90deg, #b8741c, #ffb020); box-shadow: 0 0 10px rgba(255,170,40,.7); }
      .gomb { position: absolute; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #ffe2a8; box-shadow: 0 0 10px #ffb020; left: 0; }
      .elo2 .sav { display: none; } .elo2 .vege { display: none; }
      .eloj { display: none; color: #ff6a4d; letter-spacing: .3em; } .elo2 .eloj { display: inline; animation: pis 2s ease-in-out infinite; }
      .szun .cimke i { animation: none; opacity: .35; }
      .ures2 .tart, .ures2 .hal, .ures2 canvas { opacity: 0; }
      .var { position: absolute; left: 0; right: 0; top: 250px; text-align: center; opacity: 0; transition: opacity .8s; pointer-events: none; }
      .ures2 .var { opacity: 1; }
      .var b { display: block; font: 400 110px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .04em; color: #f3ead8; }
      .var small { display: block; margin-top: 26px; font: 400 13px/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .5em; color: rgba(243,234,216,.55); }
    </style>
    <div class="v ures2">
      <div class="alt lat"><div class="lem">${TV_SVG_LEMEZ}</div></div><div class="hat"></div><div class="sot"></div>
      <div class="fej"><div class="marka">Cantabile</div><div class="ora"><span class="o"></span><small class="d"></small></div></div>
      <div class="var"><b class="o2"></b><small>CANTABILE · READY</small></div>
      <div class="tart"><div class="bor ures"><div class="lem">${TV_SVG_LEMEZ}</div></div>
        <div class="adat"><div class="cimke"><i></i><span class="ck">NOW PLAYING</span></div><div class="cim"></div><div class="elo"></div><div class="alb"></div><div class="csipek"></div></div></div>
      <canvas></canvas>
      <div class="hal"><span class="most">0:00</span><div class="sav"><div class="tel"></div><div class="gomb"></div></div><span class="vege">0:00</span><span class="eloj">● LIVE</span></div>
    </div>`;
    this.toggleAttribute("teljes", this._teljes);
    this._v = sr.querySelector(".v");
    this._cv = sr.querySelector("canvas");
    const meret = () => {
      const w = this._teljes ? innerWidth : this.clientWidth, hh = this._teljes ? innerHeight : this.clientWidth * 0.5625;
      const s = Math.min(w / 1280, hh / 720) || 1;
      this._v.style.transform = `translate(${(w - 1280 * s) / 2}px, ${(hh - 720 * s) / 2}px) scale(${s})`;
      const dpr = Math.min(1.5, (window.devicePixelRatio || 1) * s);
      this._cv.width = Math.round(1152 * dpr); this._cv.height = Math.round(170 * dpr);
    };
    meret();
    window.addEventListener("resize", meret);
    if (window.ResizeObserver) new ResizeObserver(meret).observe(this);
    const ora = () => {
      const d = new Date(), nyelv = this._h?.locale?.language || "en";
      const o = d.toLocaleTimeString(nyelv, { hour: "2-digit", minute: "2-digit", ...ORA_OPC(this._h) });
      sr.querySelector(".o").textContent = o; sr.querySelector(".o2").textContent = o;
      sr.querySelector(".d").textContent = d.toLocaleDateString(nyelv, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    };
    ora();
    this._ora = ora;
    this._indit();
  }

  // ---- hang ----
  _hang() {
    if (this._a) return this._a;
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.preload = "auto";
    // az események mindig az épp aktív (látható) példányhoz mennek – a Cast-vevő a kártyát le is cserélheti
    ["playing", "pause", "ended", "error", "loadedmetadata", "seeked"].forEach((e) => a.addEventListener(e, () => {
      const ez = window._cantabileTv || this;
      if (e === "ended") { ez._allapot = "idle"; ez._v.classList.add("ures2"); }
      if (e === "error") { ez._allapot = "idle"; ez._diag({ hiba: `audio error ${a.error?.code || ""} ${a.error?.message || ""}`, net: a.networkState, rs: a.readyState, src: String(a.src).slice(0, 90) }); }
      ez._jelent(e === "error" ? `audio ${a.error?.code || ""}` : null);
    }));
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new Ctx();
      const forras = this._ctx.createMediaElementSource(a);
      this._an = this._ctx.createAnalyser(); this._an.fftSize = 2048; this._an.smoothingTimeConstant = 0.78;
      forras.connect(this._an); this._an.connect(this._ctx.destination);
      this._frek = new Uint8Array(this._an.frequencyBinCount); this._ido = new Uint8Array(this._an.fftSize);
    } catch (e) { this._an = null; }
    return (this._a = a);
  }

  _feliratkozik() {
    this._msg = { type: "cantabile/tv/subscribe" };
    if (this._c.tv || this._tv) this._msg.tv = this._c.tv || this._tv;    // a lecserélt példány utódja azonnal átveszi a lejátszót
    this._h.connection.subscribeMessage((m) => this._parancs(m), this._msg)
      .then((u) => {
        this._leir = u;
        const regi = window._cantabileTv;
        window._cantabileTv = this;
        this.style.display = ""; this.style.zIndex = "10";
        if (regi && regi !== this) regi.style.display = "none";
      })
      .catch(() => {
        const akt = window._cantabileTv;
        if (akt && akt !== this && akt.isConnected) { this.style.display = "none"; return; }
        if (akt && akt !== this) { clearTimeout(akt._levesz); akt._elenged(); setTimeout(() => this._feliratkozik(), 800); return; }   // a régi, lekerült példány tartotta
        setTimeout(() => this._feliratkozik(), 10000);               // még nincs hozzárendelhető lejátszó
      });
    if (!this._jelIdo) this._jelIdo = setInterval(() => { if (this._allapot === "playing" && window._cantabileTv === this) this._jelent(); }, 2000);
  }

  async _parancs(m) {
    const a = this._hang();
    if (m.cmd === "hello") {                         // újrakapcsolódáskor ugyanahhoz a lejátszóhoz
      this._tv = m.tv; this._msg.tv = m.tv;
      if (this._src && a.src && !a.ended && this._allapot !== "idle") {        // átvett, már szóló zene: azonnal mutatja
        this._mutat(this._meta || {});
        this._v.classList.toggle("szun", this._allapot === "paused");
        this._jelent(null, true);                    // a (pl. újraindult) szerver így tudja, mi szól
      }
      return;
    }
    if (m.cmd === "play") {
      this._src = m.src;
      this._meta = m.meta || {};
      this._cueI = this._meta.cue ? -1 : null;      // az első jelzés már kiírja az „1 / N” sorszámot
      this._mutat(this._meta);
      a.src = this._abs(m.src);
      this._allapot = "playing";
      try { if (this._ctx && this._ctx.state !== "running") await this._ctx.resume(); await a.play(); }
      catch (e) { this._allapot = "idle"; this._jelent(String(e)); this._diag({ hiba: `play: ${e}`, src: String(a.src).slice(0, 90) }); }
    } else if (m.cmd === "pause") { a.pause(); this._allapot = "paused"; }
    else if (m.cmd === "resume") { this._allapot = "playing"; try { await a.play(); } catch (e) { this._jelent(String(e)); } }
    else if (m.cmd === "seek") { try { a.currentTime = m.position; } catch (e) {} }
    else if (m.cmd === "stop") { a.pause(); a.removeAttribute("src"); a.load(); this._allapot = "idle"; this._v.classList.add("ures2"); }
    this._v.classList.toggle("szun", this._allapot === "paused");
    this._jelent();
  }

  _jelent(hiba, metaval) {
    if (!this._tv) return;
    const a = this._a, hossz = a && isFinite(a.duration) ? a.duration : null;
    this._h.callWS({ type: "cantabile/tv/report", tv: this._tv, state: this._allapot || "idle", position: a ? a.currentTime : null,
      duration: hossz, src: this._src || null, ...(hiba ? { error: hiba } : {}), ...(this._cueI != null ? { track: this._cueI } : {}),
      ...(metaval && this._meta ? { meta: this._meta } : {}) })
      .then((v) => {
        // a lejátszó nem tudja, mi szól (pl. az integráció újratöltődött): adatok újra, és újra bejelentkezés
        if (!v || !v.resend || metaval || this._ujraKer) return;
        this._ujraKer = true;
        this._jelent(null, true);
        if (this._leir) { const u = this._leir; this._leir = null; Promise.resolve(u()).catch(() => {}).then(() => this._feliratkozik()); }
        setTimeout(() => { this._ujraKer = false; }, 5000);
      }).catch(() => {});
  }

  // CUE-s album (egyetlen fájl): melyik szám szól az idő alapján – címet, előadót, sorszámot cserél, jelenti a szervernek
  _cueKovet() {
    const cue = this._meta?.cue, a = this._a;
    if (!cue || !a) return null;
    let i = 0;
    while (i + 1 < cue.length && a.currentTime >= cue[i + 1].start - 0.2) i++;
    if (i !== this._cueI) {
      this._cueI = i;
      this._mutat({ ...this._meta, title: cue[i].title, artist: cue[i].performer || this._meta.artist, track: `${cue[i].n} / ${cue.length}` });
      this._jelent();
    }
    const vege = i + 1 < cue.length ? cue[i + 1].start : (isFinite(a.duration) ? a.duration : 0);
    return { kezd: cue[i].start, hossz: vege - cue[i].start };
  }

  // ---- megjelenítés ----
  _mutat(m) {
    const sr = this.shadowRoot, t = sr.querySelector(".tart");
    t.classList.add("valt");
    this._v.classList.remove("ures2");
    setTimeout(() => { try {
      const radio = m.kind === "stream";
      sr.querySelector(".ck").textContent = radio ? "ON AIR" : "NOW PLAYING";
      sr.querySelector(".cim").textContent = (radio ? m.title || m.station : m.title) || "";
      sr.querySelector(".elo").textContent = radio ? (m.title ? m.station : m.artist || "") : m.artist || "";
      sr.querySelector(".alb").textContent = [m.album, m.year].filter(Boolean).join("  ·  ");
      const khz = m.rate ? `${(m.rate / 1000).toLocaleString("en", { maximumFractionDigits: 1 })} kHz${m.bits ? ` / ${m.bits} bit` : ""}` : "";
      const csip = [m.codec, khz, m.kbps ? `${m.kbps} kbps` : "", m.track ? `TRACK ${m.track}` : "", m.genre ? String(m.genre).split(" / ")[0] : "", radio ? "INTERNET RADIO" : ""].filter(Boolean);
      sr.querySelector(".csipek").innerHTML = csip.map((x) => `<span>${ESC(String(x).toUpperCase())}</span>`).join("");
      const bor = sr.querySelector(".bor"), kep = m.cover || (radio ? m.image : "") || "";
      bor.classList.toggle("ures", !kep);
      bor.style.backgroundImage = kep ? `url("${this._abs(kep)}")` : "";
      const hat = sr.querySelector(".hat"), alt = sr.querySelector(".alt"), hk = m.artist_image || m.cover || "";
      if (hk) {
        const kepb = new Image();
        kepb.onload = () => { hat.style.backgroundImage = `url("${this._abs(hk)}")`; hat.classList.add("lat"); alt.classList.remove("lat"); };
        kepb.onerror = () => { hat.classList.remove("lat"); alt.classList.add("lat"); };
        kepb.src = this._abs(hk);
      } else { hat.classList.remove("lat"); alt.classList.add("lat"); }
      sr.querySelector(".hal").classList.toggle("elo2", radio);
      t.classList.remove("valt");
    } catch (e) { this._diag({ hiba: `mutat: ${e && e.stack ? e.stack.slice(0, 300) : e}` }); } }, 450);
  }

  _halad() {
    const a = this._a, sr = this.shadowRoot;
    if (!a || !sr) return;
    const ido = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), p = Math.floor((s % 3600) / 60), mp = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(p).padStart(2, "0")}:${mp}` : `${p}:${mp}`; };
    const cue = this._cueKovet();                  // CUE-s albumnál a szám saját ideje
    const hossz = cue ? cue.hossz : isFinite(a.duration) && a.duration > 0 ? a.duration : 0, most = a.currentTime - (cue ? cue.kezd : 0);
    sr.querySelector(".most").textContent = ido(most);
    sr.querySelector(".vege").textContent = hossz ? ido(hossz) : "";
    const p = hossz ? Math.min(100, (most / hossz) * 100) : 0;
    sr.querySelector(".tel").style.width = `${p}%`; sr.querySelector(".gomb").style.left = `${p}%`;
  }

  // equalizer (logaritmikus sávok, eső csúcsjelzővel és tükörképpel) + hullámforma-vonal
  _rajzol() {
    const g = this._cv.getContext("2d"), N = 56, csucs = new Array(N).fill(0), simit = new Array(N).fill(0);
    let nyugszik = "";
    const kor = () => {
      if (this._le) return;                        // a lekerült példány rajzolása leáll (az új példány rajzol)
      requestAnimationFrame(kor);
      const W = this._cv.width, H = this._cv.height, alap = H * 0.72;
      if (!this._an || this._allapot !== "playing") {
        for (let i = 0; i < N; i++) { simit[i] *= 0.9; csucs[i] *= 0.95; }
        // csendben, a sávok lecsengése után a kép nem változik: nem rajzol újra (kíméli a TV-botot)
        // (a méret is a kulcsban: átméretezéskor a vászon kiürül, akkor újra kell rajzolni)
        const csend = csucs.every((v) => v < 0.002) ? `${W}x${H}` : "";
        if (csend && nyugszik === csend) return;
        nyugszik = csend;
        g.clearRect(0, 0, W, H);
      } else {
        nyugszik = "";
        g.clearRect(0, 0, W, H);
        this._an.getByteFrequencyData(this._frek);
        const n = this._frek.length, minB = 2, maxB = Math.floor(n * 0.72);
        for (let i = 0; i < N; i++) {
          const a0 = Math.floor(minB * Math.pow(maxB / minB, i / N)), a1 = Math.max(a0 + 1, Math.floor(minB * Math.pow(maxB / minB, (i + 1) / N)));
          let s = 0; for (let k = a0; k < a1; k++) s = Math.max(s, this._frek[k]);
          const v = Math.pow(s / 255, 1.6);
          simit[i] = v > simit[i] ? v : simit[i] * 0.88 + v * 0.12;
          csucs[i] = Math.max(csucs[i] - 0.012, simit[i]);
        }
      }
      const vis = this._c.visual, rw = W / N, bw = rw * 0.62;
      if (vis !== "wave") {
        for (let i = 0; i < N; i++) {
          const x = i * rw + (rw - bw) / 2, h = Math.max(2, simit[i] * alap);
          const gr = g.createLinearGradient(0, alap - h, 0, alap);
          gr.addColorStop(0, "#ffe0a0"); gr.addColorStop(0.35, "#ffb020"); gr.addColorStop(1, "#9a4f12");
          g.fillStyle = gr; g.shadowColor = "rgba(255,160,40,.55)"; g.shadowBlur = 12 * (W / 1152);
          g.fillRect(x, alap - h, bw, h);
          g.shadowBlur = 0;
          g.fillStyle = "rgba(255,180,60,.16)"; g.fillRect(x, alap + 3, bw, h * 0.32);                  // tükörkép
          g.fillStyle = "#fff1cf"; g.fillRect(x, alap - csucs[i] * alap - 4, bw, 2.5 * (W / 1152));       // csúcsjelző
        }
      }
      if (vis !== "bars" && this._an && this._allapot === "playing") {
        this._an.getByteTimeDomainData(this._ido);
        g.beginPath();
        const lepes = Math.max(1, Math.floor(this._ido.length / 512));
        for (let k = 0, j = 0; k < this._ido.length; k += lepes, j++) {
          const x = (k / (this._ido.length - 1)) * W, y = alap * 0.55 + ((this._ido[k] - 128) / 128) * alap * 0.45;
          j ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.strokeStyle = vis === "wave" ? "#ffcf7a" : "rgba(255,240,210,.55)"; g.lineWidth = (vis === "wave" ? 3 : 1.6) * (W / 1152);
        g.shadowColor = "rgba(255,170,50,.8)"; g.shadowBlur = 10 * (W / 1152); g.stroke(); g.shadowBlur = 0;
      }
    };
    kor();
  }
}

// a hang, az elemző és a szóló szám az oldalhoz tartozik, nem a kártyapéldányhoz (lásd a BT kimenetnél is)
const TV_KOZOS = {};
["_a", "_ctx", "_an", "_frek", "_ido", "_src", "_meta", "_allapot", "_tv", "_cueI"].forEach((k) =>
  Object.defineProperty(CantabileTv.prototype, k, { get() { return TV_KOZOS[k]; }, set(v) { TV_KOZOS[k] = v; }, configurable: true }));

if (!customElements.get("cantabile-tv")) {
  customElements.define("cantabile-tv", CantabileTv);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "cantabile-tv", name: "Cantabile TV", description: T("A Cantabile TV-oldala a Cast-os TV-re: equalizer, előadókép, a szám adatai és haladásjelző.") });
}
