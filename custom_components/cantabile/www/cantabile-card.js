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
  "FM-sáv": "FM band",
  "Az ország szerint": "By country",
  "Japán (76–95 MHz)": "Japan (76–95 MHz)",
  "A rádióadókat, a hangszórók nevét és a kártyán megjelenő rövid nevet a kártya ⚙ gombjával állíthatod be.": "Set up radio stations, speaker names and the short names shown on the card with the card's ⚙ button.",
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
  "{n}. adó": "Station {n}",
  "{n}: a stream-cím http:// vagy https:// kezdetű legyen": "{n}: the stream URL must start with http:// or https://",
  "{n}. hangszóró: név és lejátszó kell": "Speaker {n}: name and player are required",
  "Legalább egy hangszóró kell.": "At least one speaker is required.",
  "nem találom a kártyát ezen a vezérlőpulton": "the card was not found on this dashboard",
  "Áttekintés": "Overview",
  "KERESÉS": "SEARCH",
  "RÁDIÓK": "RADIO",
  "Keresés mindenhol…": "Search everywhere…",
  "Írd be, mit keresel – egyszerre keres a zenemappában, a Deezeren, a Spotifyn, a WiiM-presetek, a kedvencek és a rádiók között.": "Type what you're looking for – it searches the music folder, Deezer, Spotify, the WiiM presets, the favourites and the radio stations at once.",
  "Nem érhető el most: {h}": "Not available right now: {h}",
  "A(z) {h} hangszórón ez egyik forrásból sem szól – {l}.": "None of the sources plays this on {h} – {l}.",
  "WiiM-presetek": "WiiM presets",
  "WiiM-preset {n}": "WiiM preset {n}",
  "Nincs WiiM a hangszórók között.": "There is no WiiM among the speakers.",
  "A WiiM-presetek nem olvashatók: {h}": "The WiiM presets can't be read: {h}",
  "A WiiM-presetek a(z) {h} hangszórón szólnak – válts rá.": "WiiM presets play on {h} – switch to it.",
  "Még nincs WiiM-preset.": "There are no WiiM presets yet.",
  "Presetet a WiiM Home appban menthetsz – bármelyik zenei szolgáltatásból (Tidal, Qobuz, Amazon, Deezer, rádió…).": "Save presets in the WiiM Home app – from any music service (Tidal, Qobuz, Amazon, Deezer, radio…).",
  "A(z) {h}: a parancs nem sikerült – {e}": "{h}: the command failed – {e}",
  "A zenemappa nem olvasható: {h}": "The music folder can't be read: {h}",
  "A parancs nem sikerült: {e}": "The command failed: {e}",
  "egyik sem": "none",
  "A(z) {h} hangszórón ez nem játszható le – lejátszható: {l}.": "This can't be played on {h} – it plays on: {l}.",
  "Lejátszható: {l}.": "It plays on: {l}.",
  "A(z) {h} nem kezdte el lejátszani: „{c}”. Lehet, hogy ezt nem tudja lejátszani – próbáld ezeken: {l}.": "{h} didn't start playing “{c}”. It may not be able to play it – try: {l}.",
  "A(z) {h} most nem érhető el – kapcsold be, vagy válassz másik hangszórót.": "{h} is not available right now – turn it on or pick another speaker.",
  "A(z) {h} ezt nem tudja: {m}.": "{h} can't do this: {m}.",
  "hangerő": "volume", "keverés": "shuffle", "ismétlés": "repeat", "csoportba kapcsolás": "grouping", "tekerés": "seeking",
  "Beállítások elmentve: {n}.": "Settings saved: {n}.",
  "Nem sikerült: {h}.": "Failed: {h}.",
  "A mentéshez rendszergazdai felhasználó kell.": "Saving requires an administrator user.",
  "A mentés nem sikerült: {h}": "Saving failed: {h}",
  "A telefonról választott zene a BT kimeneten szól – átváltottam.": "Music picked from the phone plays on the BT output – switched to it.",
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
  "Hosszan nyomva a gomb a most szóló NET-adót menti el – a gíró kerékkel vagy a NET gombbal keress egyet.": "A long press saves the NET station that is playing to the button – find one with the Gyro wheel or NET.",
  "A gombra mentéshez rendszergazdai felhasználó kell.": "Saving to a preset button needs an admin user.",
  "„{n}” már a(z) {g}. gombon van.": "“{n}” is already on button {g}.",
  "Mind a 12 gomb foglalt – nyomj hosszan egy foglalt gombot, és felülírja.": "All 12 buttons are taken – long-press one to overwrite it.",
  "„{n}” a(z) {g}. gombra mentve (helyette: {r}).": "“{n}” saved to button {g} (replacing {r}).",
  "„{n}” gombra mentve.": "“{n}” saved to a preset button.",
  "Visszavon": "Undo",
  "Visszaállítva: „{r}”.": "Restored: “{r}”.",
  "A Radio Browser most nem érhető el.": "Radio Browser can't be reached right now.",
  "Üres hely – koppints, és a NET-katalógusból tegyél ide adót; hosszan nyomva a most szóló NET-adót menti ide": "Empty slot – tap to add a station from the NET catalogue; a long press saves the NET station that is playing here",
  "„{n}” felvéve – add meg a frekvenciáját (MHz), majd Mentés.": "“{n}” added – enter its frequency (MHz), then Save.",
  "Keresés…": "Searching…",
  "A keresés nem érhető el: {h}": "Search is not available: {h}",
  "Következőnek": "Play next",
  "Sor végére": "Add to end of queue",
  "ELŐADÓK": "ARTISTS",
  "MŰFAJOK": "GENRES",
  "LISTÁK": "PLAYLISTS",
  "A lista hangszórón szól, nem ezen a készüléken – válassz hangszórót.": "Playlists play on a speaker, not on this device – pick a speaker.",
  "Listák": "Playlists",
  "SAJÁT LISTÁK": "MY PLAYLISTS",
  "＋ ÚJ LISTA": "＋ NEW PLAYLIST",
  "＋ A MOST SZÓLÓ SZÁM": "＋ THE TRACK PLAYING",
  "＋ A TELJES SOR": "＋ THE WHOLE QUEUE",
  "Új lista neve": "New playlist name",
  "LÉTREHOZÁS": "CREATE",
  "HOZZÁADÁS LISTÁHOZ · {n} szám": "ADD TO PLAYLIST · {n} tracks",
  "Mégse": "Cancel",
  "Most nem szól semmi, amit listába lehetne tenni.": "Nothing is playing that could go on a playlist.",
  "{n} szám hozzáadva: „{l}”.": "{n} tracks added to “{l}”.",
  "Még nincs saját lista. Hozz létre egyet, vagy tedd listába a most szóló számot.": "No playlists yet. Create one, or add the track that's playing.",
  "{n} szám": "{n} tracks",
  "▶ LEJÁTSZÁS": "▶ PLAY",
  "ÁTNEVEZÉS": "RENAME",
  "TÖRLÉS": "DELETE",
  "Biztos? Koppints újra": "Sure? Tap again",
  "Üres lista.": "Empty playlist.",
  "Ezen a hangszórón {n} szám szól, {k} kimarad ({m}).": "On this speaker {n} tracks play, {k} are skipped ({m}).",
  "Sonoson a zenemappa és a Deezer szól": "Sonos plays the music folder and Deezer",
  "Music Assistant-lejátszón az MA számai szólnak": "a Music Assistant player plays the MA tracks",
  "ezen a hangszórón csak a zenemappa szól": "this speaker plays only the music folder",
  "Ennek a listának egyik száma sem szól ezen a hangszórón.": "None of this playlist's tracks play on this speaker.",
  "A lista nem indult: {h}": "The playlist didn't start: {h}",
  "A Deezer Flow és a mixek a Music Assistant felületén ♥-vel kerülnek ide (Böngészés → Deezer).": "Deezer Flow and mixes show up here once you ♥ them in Music Assistant (Browse → Deezer).",
  "SONOS KEDVENCEK": "SONOS FAVOURITES",
  "Végtelen keverés · vendégkívánságok": "Endless mix · guest requests",
  "Végtelen keverés a zenemappából: ugyanaz a szám sokáig nem jön újra, ugyanaz az előadó nem jön kétszer egymás után. Akkor is szól, ha a kártyát bezárod. A vendégek a telefonjukkal kérhetnek számot (QR-kód).": "Endless mix from the music folder: the same track won't come back for a long time, the same artist never twice in a row. It keeps playing when you close the card. Guests can request songs from their phones (QR code).",
  "MIBŐL SZÓLJON?": "PLAY FROM",
  "EGÉSZ ZENETÁR": "WHOLE LIBRARY",
  "▶ PARTY INDUL · {h}": "▶ START PARTY · {h}",
  "A PARTY a zenemappából szól – adj meg zenemappát (⚙ → Tape deck → Zenemappa).": "PARTY plays from the music folder – set one (⚙ → Tape deck → Music folder).",
  "A PARTY hangszórón szól, nem ezen a készüléken – válassz hangszórót.": "PARTY plays on a speaker, not on this device – pick a speaker.",
  "PARTY szól: {h}": "PARTY on: {h}",
  "MOST SZÓL": "NOW PLAYING",
  "SORON KÖVETKEZŐ KÍVÁNSÁGOK": "REQUESTED NEXT",
  "Még nincs kívánság.": "No requests yet.",
  "♥ {n} kérte": "♥ requested by {n}",
  "⏭ KÖVETKEZŐ": "⏭ NEXT",
  "■ PARTY VÉGE": "■ END PARTY",
  "VENDÉGEK: BE": "GUESTS: ON",
  "VENDÉGEK: KI": "GUESTS: OFF",
  "Kívánság: olvasd be a telefonoddal (az otthoni Wi-Fin).": "Requests: scan it with your phone (on the home Wi-Fi).",
  "A vendégkívánságok szünetelnek – a régi QR-kód már nem érvényes.": "Guest requests are paused – the old QR code no longer works.",
  "A QR-kódhoz a Home Assistant belső címe kell (Beállítások → Rendszer → Hálózat).": "The QR code needs Home Assistant's internal URL (Settings → System → Network).",
  "{n} szám a válogatásban · indította: {g}": "{n} tracks in the mix · started by {g}",
  "A PARTY nem indult: {h}": "PARTY didn't start: {h}",
  "A PARTY átkerült ide: {h}.": "PARTY moved to {h}.",
  "Mindjárt szól…": "Starting…",
  "Műfajok": "Genres",
  "TOVÁBBI MŰFAJOK": "MORE GENRES",
  "Nincs műfaj": "No genre",
  "{n} album": "{n} albums",
  "Mind": "All",
  "TOPLISTA": "CHART",
  "{n} szám · Deezer-rádió": "{n} tracks · Deezer radio",
  "DEEZER RÁDIÓK": "DEEZER RADIOS",
  "{g} – toplista": "{g} – chart",
  "{g} – keverve": "{g} – shuffled",
  "Ennél a műfajnál nincs lejátszható szám.": "No playable tracks in this genre.",
  "Nincs műfaj: a zenefájlokban nincs címke, a Deezer pedig ki van kapcsolva.": "No genres: the music files have no genre tags and Deezer is off.",
  "FORRÁSOK": "SOURCES",
  "Előadó keresése…": "Search artists…",
  "Előadók összegyűjtése…": "Collecting artists…",
  "Nincs előadó: se zenemappa, se Music Assistant-könyvtár.": "No artists: no music folder and no Music Assistant library.",
  "Nincs ilyen előadó a könyvtárban.": "No such artist in the library.",
  "A DEEZEREN": "ON DEEZER",
  "KEVERVE": "SHUFFLE",
  "RÁDIÓ": "RADIO",
  "SAJÁT ZENEMAPPA": "MUSIC FOLDER",
  "HASONLÓ ELŐADÓK": "SIMILAR ARTISTS",
  "{e} – keverve": "{e} – shuffled",
  "{n} szám, véletlen sorrendben": "{n} tracks, shuffled",
  "{e} rádió": "{e} radio",
  "{n} szám · hasonlók is": "{n} tracks · similar ones too",
  "Ennek az előadónak nincs lejátszható száma.": "This artist has no playable tracks.",
  "Nincs találat ennél az előadónál.": "Nothing found for this artist.",
  "ALBUMOK": "ALBUMS",
  "SZÁMOK": "TRACKS",
  "LISTÁK": "PLAYLISTS",
  "A lista hangszórón szól, nem ezen a készüléken – válassz hangszórót.": "Playlists play on a speaker, not on this device – pick a speaker.",
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
  "Régi hi-fi rádió és tape deck (ezüst vagy fekete) zenetárral: előadók, műfajok, party vendégkívánságokkal, listák – zenemappa, Music Assistant, Deezer, Spotify, Tidal; NET-rádió, valódi VU-mérők.": "Old hi-fi radio and tape deck (silver or black) with a music library: artists, genres, a party with guest requests, playlists – music folder, Music Assistant, Deezer, Spotify, Tidal; NET radio, real VU meters.",
  "A(z) {h} nem tud zenét fogadni a Cantabile-tól (nincs lejátszás-indítás funkciója) – válassz másik lejátszót a ⚙ beállításokban.": "{h} can't receive music from Cantabile (it has no play-media function) – pick another player in ⚙ settings.",
  "A KÁRTYÁN (MAX. 8)": "ON CARD (MAX. 8)",
  "max. 8": "max. 8",
  "{n}: a kártyán megjelenő név legfeljebb 8 karakter lehet": "{n}: the name shown on the card can be at most 8 characters",
  "{n}: a név 8 karakternél hosszabb – adj meg rövidebb nevet a kártyára": "{n}: the name is longer than 8 characters – give a shorter name for the card",
  "DEEZER fül": "DEEZER tab",
  "Látszik (a Sonos appban bekötött Deezer-fiókkal szól)": "Shown (plays with the Deezer account linked in the Sonos app)",
  "Rejtve (nincs Deezer)": "Hidden (no Deezer)",
  "{n}: a frekvencia {a} és {b} közé essen (vagy hagyd üresen)": "{n}: the frequency must be between {a} and {b} (or leave it empty)",
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
  "A(z) {h} foglalt: {n} használja.": "{h} is in use: {n} is using it.",
  "Átveszem": "Take over",
  "Átvetted: {h}. Most már kiválaszthatod.": "You took over {h}. You can select it now.",
  "{n} átvette: {h}.": "{n} took over {h}.",
  "A többi hangszóró foglalt.": "The other speakers are in use.",
  "telefon": "phone",
  "számítógép": "computer",
  "hangvezérlés": "voice control",
  "Hangos keresés": "Voice search",
  "Műfajok (a zenefájlok címkéiből)": "Genres (from the music files' tags)",
  "Nincs műfaj": "No genre",
  "Műfajok gyűjtése a zenefájlok címkéiből… {k} / {n} album": "Collecting genres from the music files' tags… {k} / {n} albums",
  "A zenefájlokban nincs műfaj-címke.": "The music files have no genre tags.",
  "↻ Újraolvasás": "↻ Read again",
  "A műfajok nem olvashatók: {h}": "Genres can't be read: {h}",
  "Nem értettem – próbáld újra.": "I didn't catch that – try again.",
  "Nem hallottam semmit – próbáld újra.": "I didn't hear anything – try again.",
  "A hangos kereséshez mikrofon kell, amit a böngésző csak https-kapcsolaton enged.": "Voice search needs the microphone, which the browser only allows over https.",
  "A mikrofon nincs engedélyezve – engedd meg a böngészőben vagy a HA app beállításaiban.": "The microphone isn't allowed – allow it in the browser or in the HA app settings.",
  "Nem érhető el mikrofon: {e}": "No microphone available: {e}",
  "Nincs beszédfelismerő: állíts be egy hangsegédet beszédfelismeréssel (Beállítások → Hangsegédek).": "No speech recognition: set up an assistant with speech-to-text (Settings → Voice assistants).",
  "A beszédfelismerés nem sikerült: {e}": "Speech recognition failed: {e}",
  "A Cantabile integráció nincs telepítve.": "The Cantabile integration is not installed.",
  "Rádióadásnál a pontos hely nem ismert, a szöveg kiemelés nélkül látszik.": "On radio the exact position is unknown, so no line is highlighted.",
  "Bemenet és hangszín": "Input and tone",
  "Bemenet: {b}": "Input: {b}",
  "Mély: koppintva, húzva vagy görgetve; dupla koppintás: 0": "Bass: tap, drag or scroll; double-tap: 0",
  "Magas: koppintva, húzva vagy görgetve; dupla koppintás: 0": "Treble: tap, drag or scroll; double-tap: 0",
  "Ezen a hangszórón nincs állítható bemenet vagy hangszín.": "This speaker has no input or tone setting.",
  "Olvasom a hangszóró beállításait…": "Reading the speaker's settings…",
  "Hangosság-kiegyenlítés (a hangszóró saját LOUDNESS-e)": "Loudness compensation (the speaker's own LOUDNESS)",
  "Profil neve": "Profile name",
  "Előző profil": "Previous profile",
  "Következő profil": "Next profile",
  "Equalizer be / ki": "Equalizer on / off",
  "A mostani beállítás mentése saját profilként": "Save the current setting as your own profile",
  "A saját profil törlése (még egy koppintás)": "Delete your own profile (tap again)",
  "Automatikus profil forrás és műfaj szerint": "Automatic profile by source and genre",
  "Olvasom a profilokat…": "Reading the profiles…",
  "EGYÉB": "OTHER",
  "A zenemappa műfajai a GENRE fülön gyűlnek össze; ha nincs zenemappa, csak a forrás szerinti profil működik.": "The music folder's genres are collected on the GENRE tab; without a music folder only the profile by source works.",
  "Automatikus profil: a műfaj (zenemappa) erősebb a forrásnál. Csak forrás- vagy albumváltáskor vált, a kézi állítás addig megmarad.": "Automatic profile: the genre (music folder) wins over the source. It changes only when the source or the album changes; a manual setting stays until then.",
  "Elmentve: {n}": "Saved: {n}",
  "várja a telefont / tabletet": "waiting for a phone / tablet",
  "Telefon / tablet csatlakoztatása Bluetooth-on – útmutató": "Connect a phone / tablet over Bluetooth – guide",
  "még nincs": "none yet",
  "Átváltás Bluetooth-bemenetre…": "Switching to the Bluetooth input…",
  "✓ Csatlakozott: {n} – indítsd a zenét az eszközön, a(z) {h} szól.": "✓ Connected: {n} – start the music on the device, {h} plays it.",
  "A telefonon / tableten nyisd meg a Bluetooth-beállításokat": "On the phone / tablet, open the Bluetooth settings",
  "Megnyitás": "Open",
  "Válaszd ki a listából:": "Pick from the list:",
  "Indítsd a zenét az eszköz bármelyik appjában – a hang a hangszóróból szól. A kártyán a kazetta „BT IN”-t mutat.": "Start the music in any app on the device – the sound comes from the speaker. On the card the cassette shows “BT IN”.",
  "ISMERT ESZKÖZÖK": "KNOWN DEVICES",
  "Keresés a Music Assistantban…": "Search Music Assistant…",
  "Music Assistant: a sor átkerült a(z) {h} készülékre (az MA-lejátszóján át).": "Music Assistant: the queue moved to {h} (through its Music Assistant player).",
  "A Music Assistant a zenemappából játszotta – a(z) {h} hangszórón a Cantabile folytatja ugyanonnan.": "Music Assistant was playing it from the music folder – on {h} Cantabile carries on from the same point.",
  "Ezt a Music Assistant-számot ({p}) csak Music Assistant-lejátszó játszhatja – a(z) {r} szól tovább.": "This Music Assistant track ({p}) can only play on a Music Assistant player – {r} keeps playing.",
  "Music Assistant sora: az MA keresi elő, tölti és játssza le (saját motorral)": "Music Assistant queue: Music Assistant finds, loads and plays it (with its own engine)",
  "Ez nem Music Assistant-lejátszó.": "This isn't a Music Assistant player.",
  "A Music Assistant tartalma Music Assistant-lejátszón szól: {l}.": "Music Assistant content plays on a Music Assistant player: {l}.",
  "A Music Assistant tartalma Music Assistant-lejátszón szól – vegyél fel egyet a hangszórók közé (⚙).": "Music Assistant content plays on a Music Assistant player – add one to the speakers (⚙).",
  "Nincs találat: „{q}”.": "No results: “{q}”.",
  "A Music Assistant könyvtárában itt még nincs semmi.": "There's nothing here in the Music Assistant library yet.",
  "A Music Assistant most nem érhető el: {h}": "Music Assistant isn't reachable right now: {h}",
  "„{c}” a Music Assistanté – Music Assistant-lejátszón szól. Hol szóljon?": "“{c}” is from Music Assistant – it plays on a Music Assistant player. Where should it play?",
  "A Music Assistant sora üres.": "The Music Assistant queue is empty.",
  "egy szám": "one track",
  "az egész sor": "the whole queue",
  "A sort a Music Assistant kezeli (keverés: {k}, ismétlés: {i}); átrendezni és törölni az MA saját felületén lehet.": "Music Assistant manages this queue (shuffle: {k}, repeat: {i}); reorder and remove tracks in Music Assistant itself.",
  "Jelút: honnan jön a hang, mi történik vele, hol szól": "Signal path: where the sound comes from, what happens to it, where it plays",
  "Jelút": "Signal path",
  "Most nem szól semmi.": "Nothing is playing now.",
  "telefon / tablet Bluetooth-on": "phone / tablet over Bluetooth",
  "külső készülék a bemeneten": "an external device on the input",
  "Közvetlen bemenet: a hang egyenesen a hangszóróba megy, a Home Assistanton nem halad át": "Direct input: the sound goes straight into the speaker and doesn't pass through Home Assistant",
  "Rádió": "Radio",
  "Továbbító: a HA saját címén jön a böngészőbe (/api/cantabile/stream)": "Relay: comes to the browser through Home Assistant's own address (/api/cantabile/stream)",
  "Közvetlen stream-cím (x-rincon-mp3radio): a Sonos maga tölti az adót": "Direct stream address (x-rincon-mp3radio): the Sonos loads the station itself",
  "Közvetlen stream-cím: a hangszóró maga tölti az adót": "Direct stream address: the speaker loads the station itself",
  "Ismeretlen szám": "Unknown track",
  "Aláírt médialink a HA /media útvonalára (8 óráig érvényes)": "Signed media link to Home Assistant's /media path (valid for 8 hours)",
  "Átmeneti feltöltés a HA-ra (24 óráig)": "Temporary upload to Home Assistant (for 24 hours)",
  "Helyi fájl: a böngésző játssza, el sem hagyja a készüléket": "Local file: the browser plays it, it never leaves the device",
  "Katalógus-link: a hangszóró a saját szolgáltatás-fiókjával tölti": "Catalogue link: the speaker loads it with its own service account",
  "Böngésző-lejátszó (<audio> + Web Audio)": "Browser player (<audio> + Web Audio)",
  "Sonos-sor (a 48 kHz-es másolat, ha van)": "Sonos queue (the 48 kHz copy, if there is one)",
  "Sorozatlejátszó: számonként, WiiM-en / DLNA-n hézagmentesen": "Sequence player: track by track, gapless on WiiM / DLNA",
  "A lejátszó saját forrása (nem a Cantabile indította)": "The player's own source (not started by Cantabile)",
  "EQ: {n}": "EQ: {n}",
  "EQ: kikapcsolva": "EQ: off",
  "Hangszín": "Tone",
  "utánzat – a hang nem halad át a szerveren": "simulated – the sound doesn't pass the server",
  "valódi jel (ffmpeg, 50 ms)": "real signal (ffmpeg, 50 ms)",
  "utánzat": "simulated",
  "+ TV-tükör: {n}": "+ TV mirror: {n}",
  "ez a készülék (böngésző)": "this device (browser)",
  "A(z) {h} a(z) {b} bemenetről szól – ez nem vihető át, ott szól tovább.": "{h} is playing from its {b} input – that can't be moved, it keeps playing there.",
  "A szabályokat rendszergazda módosíthatja.": "Only an administrator can change the rules.",
  "Előbb a csatlakozott eszközön kapcsold ki a Bluetooth-t.": "First turn off Bluetooth on the connected device.",
  "Párosítási mód: a(z) {h} most látható (a fénye lassan villog zölden) – várja az eszközt.": "Pairing mode: {h} is visible now (its light slowly flashes green) – waiting for the device.",
  "A(z) {h} Bluetooth-bemeneten várja az eszközt.": "{h} is on its Bluetooth input, waiting for the device.",
  "(első alkalommal: párosítás). Ha nem látszik, frissítsd a listát, vagy kapcsold be újra a párosítási módot:": "(the first time: pair). If it isn't listed, refresh the list or turn pairing mode on again:",
  "A(z) {h} egyszerre csak egy eszközt fogad, és most ez csatlakozik: {n}. Ha nem erről akarsz zenét küldeni, előbb ezen az eszközön kapcsold ki a Bluetooth-t (vagy a Bluetooth-beállításaiban bontsd a kapcsolatot) – addig a többi eszköz nem is látja a hangszórót. A hangszóró maga nem tudja leválasztani.": "{h} takes only one device at a time, and {n} is connected now. If you want to play from another device, first turn off Bluetooth on this one (or disconnect it in its Bluetooth settings) – until then other devices can't even see the speaker. The speaker itself can't disconnect it.",
  "Párosítás nélkül, Wi-Fi-n: a zenei app hangszóró-ikonjával (Spotify Connect, TIDAL Connect, AirPlay) válaszd a(z) {n} hangszórót; vagy a kártya PHONE fülén játszd le az eszköz saját fájljait.": "Without pairing, over Wi-Fi: pick {n} with the music app's speaker icon (Spotify Connect, TIDAL Connect, AirPlay); or play the device's own files from the card's PHONE tab.",
  "A(z) {h} a(z) {b} bemenetről szólt – ez nem vihető át, szüneteltettem. Ha visszaváltasz rá, onnan folytatja.": "{h} was playing from its {b} input – that can't be moved, so it's paused. Switch back to it and it carries on."
};
// felirat a Home Assistant nyelvén: a forrásszöveg magyar, angolul az EN szótárból ({x} = behelyettesítés)
const MAGYAR = () => /^hu/i.test(document.documentElement.lang || navigator.language || "");
const T = (s, v = {}) => String((MAGYAR() ? s : EN[s] ?? s)).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const NYELV = () => (MAGYAR() ? "hu-HU" : document.documentElement.lang || undefined);
// a hangszóró neve a kártyán (forgó, fejléc, kazetta, üzenetek): a „kártyán” név, legfeljebb NEV_MAX karakter; a hangvezérlés a teljes nevet használja
const NEV_MAX = 8;
const KN = (h) => (!h ? "" : h.kulcs === "multiroom" ? h.rovid : String(h.rovid || h.nev || "").slice(0, NEV_MAX));
const ESC = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// FM-sávok: a szokásos 87,5–108 MHz, és a japán 76–95 MHz (`fm_band: jp`, vagy magától, ha a HA-ban Japán az ország)
const SAVOK = { std: [87.5, 108], jp: [76, 95] };
const SAV_RE = /(?:^|\D)(\d{2,3})[.,](\d)(?!\d)/;     // „Petőfi 94,8” → 94.8 (a sávba esőt fogadja el)
const MHZ = (f) => f.toLocaleString(NYELV(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const CIM = (u) => String(u || "").replace(/^([a-z0-9+.-]+:\/\/)+/i, "").replace(/;$/, "");   // sémák és záró ; nélkül (a Sonos x-rincon-mp3radio://http://… alakban adja vissza)
const SZOL = (s) => ["playing", "buffering"].includes(s?.state);
// szünetel-e: a Sonos zenemappás számnál szünetben is „idle”-t jelent (nincs cím), de a sora és a helye megvan
const SZUNETEL = (s) => s?.state === "paused" || (s?.state === "idle" && Number(s.attributes?.queue_size) > 0 && Number(s.attributes?.media_position) > 0);
// a „BT” kimenet: a zene azon a készüléken szól, amelyiken a kártya nyitva van (telefon/tablet), így a hozzá párosított
// Bluetooth fülhallgatóra vagy hangszóróra megy; a kártya saját <audio> lejátszóval játssza (Deezer-kazetta itt nem megy)
const HELYI = "helyi:bt";
// hangszóró-foglalás (foglalas.py): ezek a hívások a hangszórót a felhasználóé teszik, ezek elengedik
const FOGLALO = new Set(["media_player.play_media", "media_player.media_play", "media_player.join", "media_player.select_source", "cantabile.play_tracks", "sonos.play_queue"]);
const ELENGEDO = new Set(["media_player.media_stop", "cantabile.stop_tracks"]);
// a hangszóró saját bemenetei (hangszin.py) rövid, előlapi névvel
const BEMENET_NEV = (n) => ({ network: "NET", bluetooth: "BT IN", "line in": "LINE IN", "line-in": "LINE IN", "optical in": "OPT IN", optical: "OPT IN", tv: "TV", hdmi: "HDMI",
  "phono in": "PHONO", phono: "PHONO", aux: "AUX", coaxial: "COAX", usb: "USB", cd: "CD", tuner: "TUNER" })[String(n || "").toLowerCase()] || String(n || "").toUpperCase();
// a WiiM EQ-sávjai, amelyeket a BASS / TREBLE mozgat (súllyal; ugyanaz, mint a hangszin.py-ban)
const EQ_MELY = { band31hz: 1, band63hz: 1, band125hz: 1, band250hz: 0.5 };
const EQ_MAGAS = { band2khz: 0.5, band4khz: 1, band8khz: 1, band16khz: 1 };
// a foglalás mellett kiírt készülékfajta
const ESZKOZ = () => {
  const u = navigator.userAgent || "";
  if (/CrKey|SmartTV|Android TV|AFT/i.test(u)) return "tv";
  if (/iPad|Tablet/i.test(u) || (/Android/i.test(u) && !/Mobile/i.test(u)) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(u)) return "telefon";
  return "gep";
};
const ESZKOZ_NEV = { telefon: "telefon", tablet: "tablet", gep: "számítógép", tv: "TV", hang: "hangvezérlés" };
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
// műfajcsaládok (a Deezer műfaj-azonosítóival); Deezer nélkül ezek a nevek
const MUFAJ_NEV = [[132, "Pop"], [152, "Rock"], [116, "Rap/Hip Hop"], [113, "Dance"], [165, "R&B"], [85, "Alternative"], [106, "Electro"], [466, "Folk"], [144, "Reggae"],
  [129, "Jazz"], [98, "Classical"], [173, "Films/Games"], [464, "Metal"], [169, "Soul & Funk"], [2, "African"], [153, "Blues"], [75, "Brazilian"], [95, "Kids"], [81, "Indian"], [197, "Latin"], [16, "Asian"]];
const MUFAJ_CSALAD = [[464, /metal/], [116, /\brap\b|hip ?hop|gangsta|\btrap\b/], [144, /reggae|raggae|dance ?hall|\bska\b/], [152, /rock|grunge|punk|surf|psych|new wave|goth/],
  [129, /jazz|swing|bossa|bebop/], [153, /blues/], [165, /\br ?(&|n|and) ?b\b|rnb|rhythm/], [169, /soul|funk/], [85, /alternativ|indie/],
  [106, /electr|elektro|ambient|downtempo|chill|lounge|industrial|trance|techno|new age/], [113, /dance|disco|house|club/],
  [98, /classical|klasszikus|opera|komolyzene|baroque|barokk|symphon/], [173, /soundtrack|film|musical|game/], [75, /brasil|brazil|samba/], [197, /latin|salsa|tango|reggaeton/],
  [466, /folk|world|ethnic|nepzene|country/], [95, /gyerek|kids|child/], [2, /afri/], [16, /asia|j-?pop|k-?pop/], [81, /india|bollywood/], [132, /pop|synth|schlager|vocal|easy listening|chanson|slager/]];
// mentés után a HA újraépíti a kártyát: az eredményüzenet (és a gombja) az új példányon jelenik meg
let ATADANDO = null;
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
const KEPESSEG = { volume_set: 4, shuffle_set: 32768, repeat_set: 262144, join: 524288, media_seek: 2 };
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
  info: '<svg viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 1.8a7.7 7.7 0 1 1 0 15.4 7.7 7.7 0 0 1 0-15.4zM11 10.5h2v6.5h-2zm0-3.5h2v2h-2z"/></svg>',
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
    const fb = config.fm_band && config.fm_band !== "auto" ? config.fm_band : null;
    const savK = fb === "jp" || fb === "japan" || (!fb && this._hass?.config?.country === "JP") ? "jp" : "std";
    const [MIN_F, MAX_F] = this._sav = SAVOK[savK];
    const nincsF = adok.filter((a) => !(Number(a.frekvencia) >= MIN_F && Number(a.frekvencia) <= MAX_F));
    nincsF.forEach((a, k) => { a.frekvencia = Math.round((MIN_F + 1 + ((k + 1) * (MAX_F - MIN_F - 1.5)) / (nincsF.length + 1)) * 10) / 10; a.virt = true; });
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
    // új beállítás (⚙ Mentés, szerkesztő): azonnal a tárolt hangszóróval és móddal rajzol (ne várja meg a következő változást)
    this._utolsoNy = null;
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass) {
    const elso = !this._hass;
    this._hass = hass;
    // a típus nélküli hangszórók a platformból kapják meg (ehhez a hass kell): újraépítés egyszer
    if (elso && this._autoMod) { this._autoMod = false; this.setConfig(this._eredetiCfg); }
    // Japánban (ha a kártyán nincs megadva fm_band) a japán FM-sáv: ehhez is a hass kell, újraépítés egyszer
    else if (elso && [undefined, "auto"].includes(this._config?.fm_band) && hass.config?.country === "JP" && this._sav !== SAVOK.jp) this.setConfig(this._eredetiCfg);
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
    this._foglalasFeliratkozas();
    this._frissit();
  }

  static getConfigElement() { return document.createElement("cantabile-card-editor"); }

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
    if (this._hass && this._ent) this._foglalasFeliratkozas();
    this._betuKorr();
    // telefonon (keskeny helyen) álló elrendezés
    if (!this._meret && "ResizeObserver" in window) {
      this._meret = new ResizeObserver((e) => {
        const sz = e[0]?.contentRect.width;
        if (sz) { this.toggleAttribute("keskeny", sz < 600); this.toggleAttribute("szuk", sz < 390); }
        if (sz && !this._bkMert) this._betuKorr();
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

  // a telefon / HA-alkalmazás szövegnagyítása (Android WebView textZoom; a text-size-adjust nem hat rá): egy 100 px-es betű
  // és egy 100 px-es doboz aránya adja; a kártya betűméretei ennyivel kisebbek (--bk), így a kép a tervezett marad
  // „A(z) Háló TV most nem érhető el” – hangerő-tekerésnél ne ismétlődjön folyton (4 mp-enként legfeljebb egyszer)
  _nemElerheto(e) {
    if (Date.now() - (this._nemElIdo || 0) < 4000) return;
    this._nemElIdo = Date.now();
    const h = (this._kimenetek || []).find((x) => x.entity === e);
    this._uzen(T("A(z) {h} most nem érhető el – kapcsold be, vagy válassz másik hangszórót.", { h: h ? KN(h) : this._hass.states[e]?.attributes?.friendly_name || e }));
  }

  _betuKorr() {
    const sr = this.shadowRoot; if (!sr) return;
    const p = document.createElement("div");
    p.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none";
    p.innerHTML = '<span style="display:inline-block;font:100px/1 Arial">X</span><div style="width:1px;height:100px"></div>';
    sr.appendChild(p);
    const a = p.firstChild.getBoundingClientRect().height, b = p.lastChild.getBoundingClientRect().height;
    p.remove();
    if (!a || !b) return;                          // még nem látszik: az átméretezéskor újra mér
    this._bkMert = true;
    const k = a / b;
    if (k > 1.03 && k < 4) this.style.setProperty("--bk", (1 / k).toFixed(4));
    else this.style.removeProperty("--bk");
  }

  disconnectedCallback() {
    if (HELYI_KOZOS.kartya === this) HELYI_KOZOS.kartya = null;   // a BT-hang eseményei ne egy lekerült kártyára menjenek
    this._fedelZar(); this._jelutZar?.();
    this._lato?.disconnect(); this._lato = null;
    this._meret?.disconnect(); this._meret = null;
    cancelAnimationFrame(this._anim); this._anim = null;
    this._jelFeliratkozas();
    this._foglSub?.then((u) => u?.(), () => {}); this._foglSub = null; this._foglKesz = false;
    this._mik?.megszakit?.();
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

  // a skálán elfoglalt hely (%) és a sáv közepe – a kártya FM-sávja szerint
  _poz(f) { const [a, b] = this._sav || SAVOK.std; return ((Math.min(b, Math.max(a, f)) - a) / (b - a)) * 100; }
  _savKozep() { const [a, b] = this._sav || SAVOK.std; return Math.round((a + b) * 5) / 10; }
  _savFrek(nev) { const m = SAV_RE.exec(nev || ""), f = m ? Number(`${m[1]}.${m[2]}`) : NaN, [a, b] = this._sav || SAVOK.std; return f >= a && f <= b ? `${m[1]}.${m[2]}` : ""; }

  _epit() {
    const c = this._config;
    this._kcimHtml = this._ksorHtml = null;
    this._fedelE = null; this._fedelHuz = false; this._jelutE = null;
    let jelek = "";
    for (let f = Math.ceil(this._sav[0]); f <= this._sav[1]; f += 0.5) {
      const egesz = Number.isInteger(f);
      jelek += `<i class="j ${egesz ? "n" : ""}" style="left:${this._poz(f)}%"></i>`;
      if (egesz && f % 2 === 0) jelek += `<b class="sz${f % 4 === 2 ? " ptl" : ""}" style="left:${this._poz(f)}%">${f}</b>`;
    }
    const adojel = c.adok.map((a, i) => `<i class="aj" data-i="${i}" style="left:${this._poz(a.frekvencia)}%"></i>`).join("");
    const ADOHELY = 12;
    const gombok = c.adok.map((a, i) => `
      <button class="bill ado" data-i="${i}"><span class="led"></span><b>${ESC(a.rovid || a.nev)}</b><small>${a.virt ? "WEB" : MHZ(a.frekvencia)}</small></button>`).join("")
      + Array.from({ length: Math.max(0, ADOHELY - c.adok.length) }, () => `<button class="bill adoures" title="${T("Üres hely – koppints, és a NET-katalógusból tegyél ide adót; hosszan nyomva a most szóló NET-adót menti ide")}"><span class="plusz">+</span></button>`).join("");
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
        <rect x="211" y="21" width="13" height="13" fill="#3a3b3f"/><text x="217.5" y="31.5" text-anchor="middle" font-family="'Cantabile Sans', Arial, sans-serif" style="font-size:calc(11px * var(--bk, 1))" fill="#141416">A</text>
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
        <text x="16" y="100.6" font-family="'Cantabile Sans', Arial, sans-serif" font-weight="700" style="font-size:calc(6px * var(--bk, 1))" letter-spacing="1" fill="#c9ad72">${ESC((c.marka || "Cantabile").toUpperCase())}</text>
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
        .fej { display: flex; align-items: baseline; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif;
          letter-spacing: .28em; color: #3d4148; text-transform: uppercase; }
        .fej .hszfej { letter-spacing: .12em; font-weight: 500; color: #5b6068; margin-left: auto; }
        .fej .tipus { margin-left: 12px; font: 400 calc(20px * var(--bk, 1))/0 "Great Vibes", "Brush Script MT", cursive; letter-spacing: 0; text-transform: none;
          color: #3d4148; position: relative; top: 9px; text-shadow: 0 1px 0 rgba(255,255,255,.85); }
        /* írott márkanév (10-26 óta 4 px-szel lejjebb, hogy ne érjen a készülék széléig): kilóg a felső margóba, így nem veszi el a helyet a skálától / kazettától */
        .fej .marka { font: 400 calc(30px * var(--bk, 1))/0 "Great Vibes", "Brush Script MT", cursive; letter-spacing: 0; text-transform: none; color: #26292e;
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
        .jelsvg text { font: 700 calc(6px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; fill: #062421; text-anchor: middle; }
        .jelsvg .jcim { font-size: calc(6.5px * var(--bk, 1)); letter-spacing: .12em; }
        .jmut { transform-origin: 50px 58px; transform: rotate(-40deg); transition: transform 1.4s cubic-bezier(.3,1.25,.5,1); }
        .jfel { font: 600 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #5f7d79; white-space: nowrap; letter-spacing: .04em; min-height: 9px; }
        .be .jfel { color: #8fe9d6; }
        .jelm .stereo { font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #5a2420; border: 1px solid #3a1714; padding: 2px 5px; border-radius: 2px; display: flex; gap: 4px; align-items: center; }
        .jelm .stereo i { width: 5px; height: 5px; transform: rotate(45deg); background: #5a2420; }
        .be .jelm .stereo { color: #ff4b3a; border-color: #ff4b3a; text-shadow: 0 0 6px rgba(255,75,58,.7); }
        .be .jelm .stereo i { background: #ff4b3a; box-shadow: 0 0 6px #ff4b3a; }
        .giro { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; justify-content: center; touch-action: none; cursor: ew-resize; -webkit-tap-highlight-color: transparent; }
        .kerek { width: 100%; flex: 1; max-height: 74px; border-radius: 3px; box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #3a3d42;
          background: linear-gradient(180deg, rgba(0,0,0,.85), rgba(0,0,0,0) 22%, rgba(255,255,255,.18) 50%, rgba(0,0,0,0) 78%, rgba(0,0,0,.85)),
            repeating-linear-gradient(90deg, #c9ced3 0 2px, #6d7278 2px 3px, #e8ebee 3px 5px, #8b9096 5px 7px); }
        .giro small { font: 700 calc(7px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .16em; color: #6d7179; }
        .be .giro small { color: #8fb8e6; }
        .giro:active .kerek { box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #6fa8ff; }
        .kezi .mutato { transition: none; }
        .sav { position: absolute; left: 22px; right: 22px; top: 0; bottom: 0; }
        .j { position: absolute; top: 34%; width: 1px; height: 9px; background: #6d6a62; transform: translateX(-.5px); transition: background .8s; }
        .j.n { top: calc(34% - 5px); height: 14px; width: 2px; transform: translateX(-1px); }
        .sz { position: absolute; top: calc(34% + 14px); transform: translateX(-50%); font: 600 calc(13px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #77736a; transition: color .8s, text-shadow .8s; }
        .be .j { background: #9fd0ff; box-shadow: 0 0 4px rgba(110,180,255,.8); } .be .sz { color: #cfe7ff; text-shadow: 0 0 6px rgba(90,160,255,.9); }
        .vonal { position: absolute; left: 0; right: 0; top: calc(34% + 9px); height: 1px; background: #4a4842; }
        .be .vonal { background: #6fa8e8; }
        .aj { position: absolute; top: calc(34% - 13px); width: 7px; height: 5px; transform: translateX(-50%); background: #7c5a22; clip-path: polygon(0 0, 100% 0, 50% 100%); }
        .be .aj { background: #ffb347; box-shadow: 0 0 4px #ffb347; }
        .mertek { position: absolute; left: 10px; top: 10px; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em; color: #8a857a; }
        .mertek.j2 { left: auto; right: 10px; }
        .be .mertek { color: #9fd0ff; } .be .mertek:first-child { color: #ff5a3c; text-shadow: 0 0 6px rgba(255,90,60,.7); }
        .mutato { position: absolute; top: 6px; bottom: 6px; width: 3px; margin-left: -1.5px; border-radius: 2px;
          background: linear-gradient(90deg, #a00, #ff2a2a 50%, #a00); box-shadow: 0 0 6px rgba(255,40,40,.75), 0 0 1px #f66;
          transition: left 1.8s cubic-bezier(.45,.05,.15,1); }
        .kiir { position: absolute; left: 12px; right: 12px; bottom: 9px; display: flex; justify-content: space-between; gap: 14px;
          font: 500 calc(13px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; color: #6f6b62; white-space: nowrap; }
        .kiir b { color: #8b867b; font-weight: 700; letter-spacing: .04em; }
        .kiir span:last-child { overflow: hidden; text-overflow: ellipsis; }
        .be .kiir { color: #b9d9ff; } .be .kiir b { color: #e6f2ff; }
        .gombsor { display: flex; gap: 7px; height: 64px; flex: none; }
        .nincsado { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 12px; border: 1px dashed #8a8e94; border-radius: 3px; font: 500 calc(12px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #4a4e55; }
        .bill { flex: 1; min-width: 0; position: relative; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 14px 2px 4px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          background: linear-gradient(180deg, #fafbfc, #dde0e4 70%, #c9cdd2); box-shadow: 0 5px 0 #80858c, 0 6px 6px rgba(0,0,0,.25);
          transform: translateY(0); transition: transform .12s, box-shadow .12s; -webkit-tap-highlight-color: transparent; color: #2b2e33; }
        .bill b { font: 700 calc(13px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .bill small { font: 500 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #636871; }
        .bill .led { position: absolute; top: 6px; left: 50%; width: 14px; height: 4px; margin-left: -7px; border-radius: 2px; background: #6b3a35; box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }
        .bill.akt, .bill:active { transform: translateY(4px); box-shadow: 0 1px 0 #80858c, 0 2px 3px rgba(0,0,0,.25); background: linear-gradient(180deg, #e7e9ec, #cfd3d8); }
        .bill.akt .led { background: #ff3b2f; box-shadow: 0 0 6px #ff3b2f; }
        .bill.ado, .bill.adoures { -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
        .bill.ment .led { background: #ffb020; box-shadow: 0 0 6px #ffb020; animation: uzpislog .35s steps(2) infinite; }
        .bill.adoures.ment .plusz { color: #ffb020; animation: uzpislog .35s steps(2) infinite; }
        .msor { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1.6fr 1fr; gap: 8px; padding: 5px 10px 9px; border-radius: 3px; box-sizing: border-box;
          background: linear-gradient(180deg, #b8bcc1, #d9dcdf); box-shadow: inset 0 2px 4px rgba(0,0,0,.35), 0 1px 0 #fff; }
        .mg { display: flex; flex-direction: column; align-items: stretch; gap: 3px; min-width: 0; border: 0; padding: 0; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .mg small { display: flex; justify-content: center; align-items: center; gap: 3px; font: 400 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #3c4046; white-space: nowrap; }
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
        :host(:not([keskeny])) .magno .mjobb > .forgo { transform: translateY(var(--fgy, 0px)); }
        .kimenet { grid-area: kim; }
        .kap { grid-area: kap; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .kap .valto, .rbal .valto { flex-direction: column; gap: 4px; }
        .kap .kapcs, .rbal .kapcs { width: 20px; height: 40px; }
        .kap .kapcs::after, .rbal .kapcs::after { left: 2px; top: 2px; width: 16px; height: 18px; transition: top .2s; }
        .magno .kap .kapcs::after { left: 2px; top: 20px; }
        .sleep, .fgomb { position: relative; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 11px 6px 3px; min-width: 64px; display: flex; gap: 4px; justify-content: center; align-items: baseline;
          font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .18em; color: #2b2e33; background: linear-gradient(180deg, #f6f7f8, #d0d4d9); box-shadow: 0 2px 0 #80858c; -webkit-tap-highlight-color: transparent; }
        .sleep .led, .fgomb .led { position: absolute; top: 4px; left: 50%; width: 10px; height: 3px; margin-left: -5px; border-radius: 2px; background: #6b5a35; }
        .sleep.be .led, .fgomb.be .led { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .sleep .amar, .fgomb .amar { letter-spacing: 0; font-size: calc(9px * var(--bk, 1)); color: #8a5a00; }
        .sleep:active, .fgomb:active { transform: translateY(1px); box-shadow: 0 1px 0 #80858c; }
        .tolok { display: flex; gap: 12px; align-items: flex-start; }
        .toloo { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .toloo small { font: 700 calc(7px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .22em; color: #6d7179; }
        .tolo { display: flex; gap: 5px; align-items: stretch; }
        .tnevek { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; }
        .tnevek button { border: 0; background: none; padding: 1px 0; cursor: pointer; font: 400 calc(9px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; color: #5b6068; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
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
        .bsz { position: absolute; left: 50%; top: 50%; width: 16px; margin: -6px 0 0 -8px; text-align: center; font: 700 calc(10px * var(--bk, 1))/12px "Cantabile Sans", Arial, sans-serif; color: #3d4148; }
        .gomb { position: absolute; left: 50%; top: 50%; width: 128px; height: 128px; margin: -64px 0 0 -64px; border-radius: 50%;
          background: repeating-conic-gradient(#d8dbdf 0 2.5deg, #7d828a 2.5deg 5deg);
          box-shadow: 0 6px 12px rgba(0,0,0,.45), 0 0 0 2px #50545a; touch-action: none; cursor: grab; }
        .gomb:active { cursor: grabbing; }
        .sapka, .ksapka { position: absolute; top: 9px; right: 9px; bottom: 9px; left: 9px; inset: 9px; border-radius: 50%; transition: transform .15s;
          background: conic-gradient(from 20deg, #f4f5f6, #a9aeb4 12%, #eceef0 25%, #9da2a8 38%, #f1f2f3 50%, #a2a7ad 62%, #e9ebed 75%, #9ca1a7 88%, #f4f5f6);
          box-shadow: inset 0 2px 2px rgba(255,255,255,.9), inset 0 -3px 5px rgba(0,0,0,.35); }
        .sapka::after, .ksapka::after { content: ""; position: absolute; left: 50%; top: 9px; width: 5px; height: 22px; margin-left: -2.5px; border-radius: 3px; background: #1d1f22; box-shadow: inset 0 1px 1px rgba(255,255,255,.3); }
        .hcim { position: absolute; left: 0; right: 0; bottom: -1px; text-align: center; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .25em; color: #3d4148; }
        .hcim span { letter-spacing: .05em; color: #5b6068; font-weight: 600; }
        .lent { display: flex; align-items: center; gap: 10px; flex: none; }
        .hszk { display: flex; flex: 1; border-radius: 3px; overflow: hidden; box-shadow: 0 0 0 1px #7c8189, 0 2px 0 #80858c; }
        .hsz { flex: 1; border: 0; border-right: 1px solid #9a9fa6; padding: 6px 4px; cursor: pointer; color: #2b2e33;
          font: 700 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: linear-gradient(180deg, #f6f7f8, #d3d7db); -webkit-tap-highlight-color: transparent; }
        .hsz:last-child { border-right: 0; }
        .hsz .lamp { width: 7px; height: 7px; border-radius: 50%; background: #5a5f55; box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }
        .hsz.akt { background: linear-gradient(180deg, #d2d6da, #e6e8eb); box-shadow: inset 0 2px 3px rgba(0,0,0,.25); }
        .hsz.akt .lamp { background: #6ef07a; box-shadow: 0 0 5px #6ef07a; }
        .valto { display: flex; align-items: center; gap: 6px; border: 0; background: none; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent;
          font: 700 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #8a8f96; }
        .kapcs { position: relative; width: 40px; height: 18px; border-radius: 3px; background: linear-gradient(180deg, #24262a, #44474d);
          box-shadow: inset 0 2px 3px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.8); }
        .kapcs::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 14px; border-radius: 2px; transition: left .2s;
          background: repeating-linear-gradient(90deg, #f6f7f8 0 2px, #c5c9ce 2px 4px); box-shadow: 0 1px 2px rgba(0,0,0,.5); }
        .magno .kapcs::after { left: 20px; }
        .elo:not(.magno) .vr, .magno .vm { color: #2b2e33; }
        .tap { display: flex; align-items: center; gap: 8px; }
        .tap .stereo { font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .15em; color: #7a7f86; display: flex; align-items: center; gap: 5px; }
        .tap .stereo i { width: 7px; height: 7px; border-radius: 50%; background: #5d4a2a; }
        .be .tap .stereo i { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .be .tap .stereo { color: #3d4148; }
        .power { width: 64px; height: 30px; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; position: relative;
          font: 700 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em; color: #2b2e33; padding: 12px 0 0;
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
        .nsor b { font: 600 calc(12.5px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nsor small { color: #a88f6b; font: 500 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nsor .ngomb { border: 0; border-radius: 3px; padding: 0 9px; cursor: pointer; background: rgba(255,255,255,.07); color: #cdb995; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; white-space: nowrap; }
        .nado:active, .ngomb:active { background: rgba(255,216,146,.28); }
        .eloadok button small { color: #a88f6b; font-size: calc(10px * var(--bk, 1)); }
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
        .ajto span { position: absolute; left: 0; right: 0; bottom: 2.6%; text-align: center; font: 700 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .3em; color: rgba(230,232,235,.5); }
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
          font-size: calc(3.6cqw * var(--bk, 1)); font-weight: 700; white-space: nowrap; }
        .ksav span { display: inline-flex; align-items: center; gap: .8cqw; min-width: 0; }
        .ksav svg { height: 4.4cqw; fill: currentColor; flex: none; }
        .ksav .lista { flex: 1; justify-content: center; overflow: hidden; text-overflow: ellipsis; letter-spacing: .03em; }
        .ksav .lista b { overflow: hidden; text-overflow: ellipsis; }
        .ksav .doboz { border: 1px solid currentColor; border-radius: 2px; padding: 0 .8cqw; font-size: calc(2.9cqw * var(--bk, 1)); line-height: 1.25; }
        .ksav .kapcsolo { cursor: pointer; }
        .ksav .ki { opacity: .38; }
        .kcim { position: absolute; left: 7%; right: 13%; top: 13.2%; text-align: center; font-size: calc(5cqw * var(--bk, 1)); font-weight: 800; letter-spacing: .02em;
          text-transform: uppercase; }
        .ksor { position: absolute; left: 7%; right: 13%; top: 21.6%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3cqw; font-size: calc(3.7cqw * var(--bk, 1)); font-weight: 600; }
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
        .kido { position: absolute; left: 7%; right: 7%; top: 70.2%; display: flex; justify-content: space-between; font-size: calc(4.3cqw * var(--bk, 1)); font-weight: 800; font-variant-numeric: tabular-nums; }
        .kido svg { height: 3.4cqw; fill: #fff; margin-right: .8cqw; }
        .kcsik { position: absolute; left: 30%; right: 25%; top: 74%; height: 1.4%; background: rgba(255,255,255,.2); border-radius: 1px; }
        .kcsik i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #e53935; border-radius: 1px; }
        .kcsik { cursor: pointer; touch-action: none; }
        .kcsik::before { content: ""; position: absolute; left: -3%; right: -3%; top: -700%; bottom: -700%; }
        .kcsik i::after { content: ""; position: absolute; right: -1px; top: -150%; width: 2px; height: 400%; background: #fff; border-radius: 1px; }
        .kform { position: absolute; left: 30%; right: 4%; top: 62.4%; height: 7%; display: flex; justify-content: flex-end; align-items: center; gap: 1.6cqw;
          font-size: calc(3.1cqw * var(--bk, 1)); font-weight: 700; color: #d9c08a; white-space: nowrap; }
        .kform .jel { color: #ce93d8; border: 1px solid #ce93d8; border-radius: 2px; padding: 0 .7cqw; font-size: calc(2.8cqw * var(--bk, 1)); line-height: 1.3; }
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
        .og small { text-align: center; font: 700 calc(7.5px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; color: #3d4148; white-space: nowrap; }
        .og small .amar { letter-spacing: 0; color: #8a5a00; font-size: calc(8.5px * var(--bk, 1)); }
        .og.tiltva { opacity: .4; pointer-events: none; }
        .ogomb { position: relative; height: 34px; border: 1px solid #7c8189; border-radius: 3px; cursor: pointer; padding: 6px 0 0; display: flex; align-items: center; justify-content: center;
          color: #2b2e33; background: linear-gradient(180deg, #f6f7f8, #d0d4d9); box-shadow: 0 2px 0 #80858c; -webkit-tap-highlight-color: transparent; }
        .ogomb .led { position: absolute; top: 4px; left: 50%; width: 10px; height: 3px; margin-left: -5px; border-radius: 2px; background: #6b5a35; }
        .ogomb.be .led { background: #ffb020; box-shadow: 0 0 6px #ffb020; }
        .ogomb i { display: flex; position: relative; }
        .ogomb .oszam { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 800 calc(9.5px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #2b2e33; padding-top: 1px;
          text-shadow: 0 0 1px #e8eaed, 0 0 2px #e8eaed, 0 0 2px #e8eaed, 1px 0 1px #e8eaed, -1px 0 1px #e8eaed; }
        .ogomb .oszam.vegt { font-size: calc(12px * var(--bk, 1)); }
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
          white-space: nowrap; cursor: pointer; font: 700 calc(10.4px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #6d7179; -webkit-tap-highlight-color: transparent; }
        .valaszto .fhsz .lamp { width: 5px; height: 5px; border-radius: 50%; background: #9a9fa6; box-shadow: inset 0 1px 1px rgba(0,0,0,.4); }
        .valaszto .fhsz.akt { color: #23262b; }
        .valaszto .fhsz .fn { line-height: 1.3; max-width: 101px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        /* oldalsó állások: a név kifelé nyúlik, a lámpa a gomb felőli oldalon – hosszú név sem csúszik a gomb alá */
        /* a lámpa a jelzővonal külső végén ül (nem a felirat mellett) */
        .valaszto .flamp { position: absolute; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%; pointer-events: none;
          background: #9a9fa6; box-shadow: inset 0 1px 1px rgba(0,0,0,.4); }
        .valaszto .flamp.akt { background: #ffb020; box-shadow: 0 0 5px #ffb020; }
        .valaszto .fhsz.nincs .fn, .hszv.nincs { opacity: .45; }
        .valaszto .flamp.nincs.akt { background: #e0452f; box-shadow: 0 0 5px #e0452f; }
        .valaszto .fhsz.foglalt .fn, .hszv.foglalt, .hsz.foglalt { opacity: .45; }
        .valaszto .flamp.foglalt { background: #ffb020; box-shadow: 0 0 4px #ffb020; animation: foglvill 1.6s ease-in-out infinite; }
        @keyframes foglvill { 50% { opacity: .2; } }
        @media (prefers-reduced-motion: reduce) { .valaszto .flamp.foglalt { animation: none; opacity: .55; } }
        .magno .mjobb > .forgo .valaszto { zoom: .92; }
        :host([keskeny]) .magno .mjobb > .forgo .valaszto { zoom: .84; }
        .magno .mjobb .mfelirat { max-width: 66px; font-size: calc(7.5px * var(--bk, 1)); letter-spacing: .04em; }
        :host([keskeny]) .magno .mjobb .mfelirat { font-size: calc(8px * var(--bk, 1)); letter-spacing: .08em; }
        .forgo.bton .fhsz.akt { color: #8a8e94; } .forgo.bton .flamp.akt { background: #c9a14a; box-shadow: none; }
        .valaszto small { position: absolute; bottom: -4px; text-align: center; font: 700 calc(7px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .25em; color: #3d4148; }
        .mfunk > button { min-width: 0; padding-inline: 2px; letter-spacing: .08em; }
        .fgomb.tiltva { opacity: .4; pointer-events: none; }
        .magno .kap .fgomb { display: none; }
        :host([keskeny]) .mkij .mfunk { display: none; }
        /* mobil: felül az öt gomb teljes szélességben, alattuk a hangerőgomb és mellette a forgó választó, legalul a RÁDIÓ / TAPE kapcsoló */
        /* széles magnó: a (nagyobb feliratú) választó a hangerőgomb alatt teljes szélességben, a RADIO/TAPE kapcsoló a gomb mellett */
        :host(:not([keskeny])) .magno .mjobb { grid-template-areas: "kap hang" "kim kim"; }
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
        .vfdmod .vfd .vsor b { font-size: calc(2.5cqw * var(--bk, 1)); }
        .vfdmod .vfd .vsor em { font-size: calc(2.08cqw * var(--bk, 1)); }
        .vfdmod .vfd .vskala { height: 2.78cqw; }
        .vfdmod .vfd .vskala span { font-size: calc(2.22cqw * var(--bk, 1)); }
        .vfdmod .vfd small { font-size: calc(2.22cqw * var(--bk, 1)); }
        .vfdmod .vfd .vall { width: 3.61cqw; height: 3.61cqw; }
        .vfdmod .vfd .vstop svg { max-height: 6.67cqw; min-height: 3.33cqw; }
        .vfd .vszamok { position: relative; }
        .vfd .vjelzo { position: absolute; top: .35cqw; left: 21%; right: 17%; height: 2.6cqw; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        .vfd .vjelzo i { display: flex; align-items: center; gap: .8cqw; height: 100%; font-style: normal; color: rgba(220,228,232,.12); }
        .vfd .vjelzo svg { height: 100%; width: auto; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; filter: none; }
        .vfd .vjelzo svg circle { fill: currentColor; stroke: none; }
        .vfd .vjelzo i small, .vfd .vjelzo i em { color: inherit; font: 700 calc(2.1cqw * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; font-style: normal; }
        .vfd .vjelzo i em { font-size: calc(2.6cqw * var(--bk, 1)); letter-spacing: 0; }
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
        .vfd small { font-size: calc(6.5px * var(--bk, 1)); letter-spacing: .18em; color: #7d858b; font-weight: 700; }
        .vfd .vall { width: 10px; height: 10px; }
        .vfd .vall svg { width: 100%; height: 100%; fill: #eef2f4; filter: drop-shadow(0 0 3px rgba(225,235,240,.6)); }
        .vfd .vmero { flex: none; display: grid; row-gap: 2px; }
        .vfd .vsor { display: grid; grid-template-columns: 9% 1fr 11%; align-items: center; column-gap: 4px; }
        .vfd .vsor b { font-size: calc(7px * var(--bk, 1)); font-weight: 700; color: #b9c1c6; letter-spacing: .05em; }
        .vfd .vsor em { font-style: normal; font-size: calc(6px * var(--bk, 1)); font-weight: 700; letter-spacing: .08em; color: #ff4a3d; opacity: .35; }
        .vfd .vsor em.be { opacity: 1; text-shadow: 0 0 4px rgba(255,74,61,.7); }
        .vfd .szeg { display: flex; gap: 1.5px; height: 4px; }
        .vfd .szeg i { flex: 1; background: rgba(220,228,232,.08); }
        .vfd .szeg i.p { background: rgba(255,74,61,.14); }
        .vfd .szeg i.be { background: #eef2f4; box-shadow: 0 0 3px rgba(225,235,240,.7); }
        .vfd .szeg i.p.be { background: #ff4a3d; box-shadow: 0 0 3px rgba(255,74,61,.8); }
        .vfd .vskala { position: relative; height: 8px; }
        .vfd .vskala span { position: absolute; top: 0; transform: translateX(-50%); font-size: calc(6.5px * var(--bk, 1)); font-weight: 600; color: #aeb6bb; }
        .vfd .vskala span.p { color: #ff6a5e; }
        .vfd .vskala span:first-child { transform: none; }
        .vfd .vskala span:last-child { transform: translateX(-100%); }
        .vlap { fill: #e4e1d8; transition: fill .8s; }
        .fut .vlap, .szun .vlap { fill: #fbf8ef; }
        .vu text { font: 500 calc(7.4px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; text-anchor: middle; dominant-baseline: middle; }
        .vu .vfel { font: 500 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; fill: #111; }
        .vu .vmarka { font: 400 calc(15px * var(--bk, 1))/1 "Great Vibes", "Brush Script MT", cursive; fill: #1a1a1a; }
        .vu .vapro text { font: 600 calc(4.3px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; fill: #222; text-anchor: start; letter-spacing: .02em; }
        .vu .vapro text[text-anchor=end] { text-anchor: end; }
        .tu { transform-origin: 85px 128px; transform: rotate(-42deg); }

        .mjobb .mfelirat { font: 700 calc(8px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; color: #5b6068; text-align: center; }
        .mjobb .mfelirat b { display: block; color: #2b2e33; letter-spacing: .1em; font-size: calc(10px * var(--bk, 1)); max-width: 92px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .fogas { margin-left: 8px; border: 0; background: none; padding: 2px; width: 22px; height: 22px; cursor: pointer; border-radius: 50%; align-self: center;
          -webkit-tap-highlight-color: transparent; }
        .fogas svg { width: 16px; height: 16px; fill: #6d7179; display: block; margin: auto; }
        .fogas:active { background: rgba(0,0,0,.08); }
        .infog { margin-left: 8px; border: 0; background: none; padding: 2px; width: 22px; height: 22px; cursor: pointer; border-radius: 50%; align-self: center; -webkit-tap-highlight-color: transparent; }
        .infog svg { width: 16px; height: 16px; fill: #6d7179; display: block; margin: auto; }
        .infog:active, .infog.be { background: rgba(0,0,0,.08); }
        .infog + .fogas { margin-left: 2px; }
        /* jelút-ablak (ⓘ): a füstüveg üzenetablak nagyobb testvére – forrás → feldolgozás → hangszóró, élőben */
        /* Music Assistant fül: típus-alfülek; QUEUE: a szóló és a következő szám borítóval */
        .maful { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 0 8px; }
        .maful .pful { padding: 4px 9px; font-size: calc(10px * var(--bk, 1)); }
        .masor { display: grid; gap: 8px; margin: 4px 0 10px; }
        .masorelem { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: 4px; background: rgba(255,255,255,.06); }
        .masorelem img, .masorelem > i { width: 54px; height: 54px; flex: none; border-radius: 3px; object-fit: cover; background: rgba(0,0,0,.3); }
        .masorelem small { display: block; font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em; color: #a88f6b; margin-bottom: 3px; }
        .masorelem b { display: block; font: 700 calc(13px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; color: #f3e8d4; }
        .masorelem span { display: block; font: 500 calc(11.5px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #cdb995; }
        .jelreteg { position: absolute; left: 0; right: 0; z-index: 61; display: flex; justify-content: center; pointer-events: none; }
        .jelreteg .uzablak.jelablak { width: min(94%, 680px); cursor: default; padding: 12px 16px 12px; }
        .jsor { display: flex; align-items: stretch; gap: 0; margin: 4px 0 10px; }
        .jdoboz { flex: 1 1 0; min-width: 0; padding: 8px 10px 9px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04);
          box-shadow: inset 3px 0 0 var(--c, #888); }
        .jdoboz small { display: block; font: 400 calc(7.5px * var(--bk, 1))/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .26em; color: rgba(255,190,90,.7); margin-bottom: 6px; }
        .jdoboz b { display: block; font: 600 calc(14px * var(--bk, 1))/1.25 "Exo 2", "Cantabile Sans", Arial, sans-serif; color: #f3ead8; overflow-wrap: anywhere; }
        .jdoboz span { display: block; margin-top: 3px; font: 500 calc(11.5px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; color: #c9bfa9; overflow-wrap: anywhere; }
        .jdoboz ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
        .jdoboz li { position: relative; padding-left: 12px; font: 500 calc(11.5px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; color: #e7dcc6; overflow-wrap: anywhere; }
        .jdoboz li::before { content: ""; position: absolute; left: 1px; top: .45em; width: 5px; height: 5px; border-radius: 50%; background: var(--c, #888); }
        .jnyil { flex: none; width: 40px; align-self: center; }
        .jnyil svg { display: block; width: 40px; height: 14px; overflow: visible; }
        .jnyil line { stroke: var(--c, #888); stroke-width: 2; stroke-dasharray: 5 4; }
        .jnyil path { fill: var(--c, #888); }
        .jablak-szol .jnyil line { animation: jaram .8s linear infinite; }
        @keyframes jaram { to { stroke-dashoffset: -9; } }
        .jlab { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font: 500 calc(11px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #b9ae98; }
        .jlab em { font-style: normal; color: #ffcf7a; }
        .jlab .uzgomb { margin-left: auto; }
        :host([keskeny]) .jsor { flex-direction: column; }
        :host([keskeny]) .jnyil { transform: rotate(90deg); margin: 2px auto; }
        :host([fekete]) .infog svg { fill: #9a9ea5; }
        :host([fekete]) .infog:active, :host([fekete]) .infog.be { background: rgba(255,255,255,.1); }

        /* beállítások (űrlap) */
        .beall { position: absolute; inset: 6px 12px; z-index: 8; border-radius: 6px; display: flex; flex-direction: column;
          background: #f4f1ea; color: #2b2622; box-shadow: inset 0 0 0 1px #8a7a62; font: calc(13px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; }
        .beall[hidden] { display: none; }
        .bfej { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #d8cfbd; }
        .bfej b { font: 400 calc(24px * var(--bk, 1))/1 "Great Vibes", cursive; color: #6b3d20; }
        .bfej span { flex: 1; color: #6a5f4e; font-size: calc(12px * var(--bk, 1)); }
        .bfej button, .bgomb { border: 1px solid #b9ad97; background: #fffdf8; color: #2b2622; border-radius: 4px; padding: 5px 12px; cursor: pointer; font: 600 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; }
        .bfej .ment { background: #6b3d20; color: #fff; border-color: #6b3d20; }
        .btest { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 10px 12px 14px; display: grid; gap: 14px; align-content: start; }
        .bresz { display: grid; gap: 6px; }
        .bresz h3 { margin: 0; font: 700 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #6a5f4e; display: flex; align-items: center; gap: 8px; }
        .bresz h3 .bgomb { margin-left: auto; letter-spacing: 0; text-transform: none; padding: 3px 9px; }
        .bsor { display: grid; gap: 6px; align-items: center; }
        .bfigy { margin: 0 0 4px; padding: 7px 9px; border-radius: 6px; font-size: calc(12.5px * var(--bk, 1)); line-height: 1.35; color: #5a3a00; background: #fff1d2; border: 1px solid #f0b54a; }
        .bfigy .bgomb { margin-left: 6px; padding: 3px 9px; }
        .btipp { margin: -2px 0 4px; font-size: calc(12px * var(--bk, 1)); line-height: 1.35; color: #7a7064; }
        .bsor.ado { grid-template-columns: 1.3fr .8fr 70px 2.4fr auto auto; }
        .bsor.hsz2 { grid-template-columns: 1fr .7fr 2fr 1fr auto; }
        .bsor.ket { grid-template-columns: 150px 1fr; }
        .bsor input, .bsor select { width: 100%; box-sizing: border-box; border: 1px solid #c9bfa9; border-radius: 4px; padding: 5px 7px; font: calc(13px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif;
          background: #fffdf8; color: #2b2622; min-width: 0; }
        .bsor input.rossz { border-color: #c62828; background: #fff1f0; }
        .bsor label { color: #6a5f4e; font-size: calc(12px * var(--bk, 1)); }
        .bfejlec { display: grid; gap: 6px; font: 600 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #8a7d68; letter-spacing: .05em; }
        .bfejlec.ado { grid-template-columns: 1.3fr .8fr 70px 2.4fr auto auto; } .bfejlec.hsz2 { grid-template-columns: 1fr .7fr 2fr 1fr auto; }
        .bx { border: 0; background: none; color: #a33; font: 700 calc(16px * var(--bk, 1))/1 "Cantabile Sans", Arial; cursor: pointer; padding: 2px 6px; }
        .bproba { border: 1px solid #b9ad97; background: #fffdf8; border-radius: 4px; cursor: pointer; padding: 4px 8px; font: calc(12px * var(--bk, 1))/1 "Cantabile Sans", Arial; color: #2b2622; }
        .bker { display: flex; gap: 6px; }
        .bker input { flex: 1; }
        .btalalat { display: grid; gap: 4px; }
        .btalalat div { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; padding: 4px 6px; background: #fffdf8; border: 1px solid #e3dac8; border-radius: 4px; }
        .btalalat small { color: #8a7d68; white-space: nowrap; }
        .btalalat em { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bmeg { color: #8a7d68; font-size: calc(12px * var(--bk, 1)); margin: 0; }
        .bhiba { color: #b3261e; font-size: calc(12px * var(--bk, 1)); min-height: 1em; }

        /* kazetta-polc */
        .polc { position: absolute; inset: 0; z-index: 5; border-radius: 6px; display: flex; flex-direction: column; padding: 10px 12px; gap: 8px;
          background: linear-gradient(180deg, #4a2c17, #2f1b0d); box-shadow: inset 0 0 0 1px #1d1008; }
        .polc[hidden] { display: none; }
        /* LIBRARY: a polc a füstüveg ablak (mint az üzenet és a jelút) – borostyán keret, üvegfény, beúszás */
        .polc.konyv { inset: 6px; padding: 10px 14px 12px; gap: 7px; border-radius: 7px; border: 1px solid rgba(255,176,32,.38);
          background: linear-gradient(180deg, rgba(30,32,36,.96), rgba(10,11,13,.98)); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 14px 34px rgba(0,0,0,.55), 0 0 22px rgba(255,160,40,.14), inset 0 1px 0 rgba(255,255,255,.09); animation: konyvbe .45s cubic-bezier(.2,1.2,.4,1); }
        @keyframes konyvbe { from { opacity: 0; transform: translateY(-10px) scale(.98); } }
        .konyv > .uzfej { margin: 0; }
        .konyv .pful { background: transparent; border: 1px solid rgba(255,176,32,.26); color: #e9dcc4; }
        .konyv .pful.akt { background: rgba(255,176,32,.16); border-color: rgba(255,176,32,.75); color: #ffcf7a; box-shadow: 0 0 10px rgba(255,160,40,.2); }
        .konyv .pzar { background: rgba(255,176,32,.1); border: 1px solid rgba(255,176,32,.4); color: #ffcf7a; }
        .konyv .pkeres { border-color: rgba(255,176,32,.4); }
        .konyv .kcsop { align-items: center; font: 400 calc(8px * var(--bk, 1))/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .26em; color: rgba(255,190,90,.8); margin: 14px 0 8px; }
        .konyv .eloadok button { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.07); }
        .konyv .puzenet { color: #c9bfa9; }
        .pnyil { display: inline-block; margin-left: 6px; vertical-align: 1px; border: 4px solid transparent; border-top-color: currentColor; border-bottom-width: 0; }
        .pforras { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 0 2px; }
        .pforras .pful { padding: 4px 10px; font-size: calc(10px * var(--bk, 1)); }
        .fp { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--fc); box-shadow: 0 0 6px var(--fc); }
        .f-nas { --fc: #5ad1e6; } .f-ma { --fc: #9ec9ff; } .f-dz { --fc: #b48cff; }
        .elista button { display: flex; align-items: center; gap: 7px; }
        .elista button > span:last-child { overflow: hidden; text-overflow: ellipsis; }
        .edot { display: flex; gap: 3px; flex: none; min-width: 7px; }
        .ehos { display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12);
          background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); box-shadow: inset 3px 0 0 var(--c, #ffb020); }
        .ekep { width: 66px; height: 66px; flex: none; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.28), rgba(0,0,0,.45)), var(--c, #555); box-shadow: 0 0 0 2px rgba(255,176,32,.5), 0 0 18px rgba(255,160,40,.25); }
        .ekep img { width: 100%; height: 100%; object-fit: cover; }
        .ekep span { font: 600 calc(22px * var(--bk, 1))/1 "Exo 2", "Cantabile Sans", Arial, sans-serif; color: rgba(255,255,255,.85); }
        .enev { flex: 1; min-width: 0; }
        .enev small { display: block; font: 400 calc(7.5px * var(--bk, 1))/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .26em; color: rgba(255,190,90,.7); margin-bottom: 5px; }
        .enev b { display: block; font: 600 calc(21px * var(--bk, 1))/1.15 "Exo 2", "Cantabile Sans", Arial, sans-serif; color: #f3ead8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .echip { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; min-height: 16px; }
        .echip i { font: 700 calc(8.5px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; font-style: normal; letter-spacing: .14em; padding: 3px 7px; border-radius: 9px;
          border: 1px solid var(--fc); color: var(--fc); animation: konyvbe .4s ease; }
        .egomb { display: flex; flex-direction: column; gap: 6px; }
        .egomb .uzgomb { margin: 0; white-space: nowrap; }
        .party { display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 14px; align-items: start; }
        .pkep { background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.3), rgba(0,0,0,.4)), linear-gradient(135deg, #b48cff, #ff7aa8, #ffb547); }
        .pkep span { font-size: calc(30px * var(--bk, 1)); }
        .psub { display: block; margin-top: 4px; font: 500 calc(12px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; color: #c9bfa9; }
        .pki { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 9px; border: 1px solid rgba(180,140,255,.6); color: #d4c0ff; font: 600 calc(11px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; }
        .pgombok { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; }
        .pgombok .uzgomb { margin: 0; }
        .uzgomb.pvege { border-color: rgba(255,110,90,.7); color: #ffab9b; background: rgba(255,90,60,.1); }
        .pkiv { padding: 6px 9px; border-radius: 4px; background: rgba(180,140,255,.07); border: 1px solid rgba(180,140,255,.18); min-width: 0; }
        .pkiv b { display: block; font: 600 calc(12.5px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; color: #f3ead8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pkiv small { display: block; color: #a99f8b; font: 500 calc(11px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pinfo { padding: 10px 2px 0; font-size: calc(11.5px * var(--bk, 1)); }
        .pjobb { display: grid; gap: 7px; justify-items: center; text-align: center; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,176,32,.35);
          background: rgba(255,255,255,.03); box-shadow: 0 0 18px rgba(255,160,40,.12); }
        .pqr svg { display: block; width: 150px; height: 150px; border-radius: 6px; box-shadow: 0 0 0 1px rgba(255,176,32,.5), 0 0 16px rgba(255,160,40,.25); }
        .pjobb small { color: #e9dcc4; font: 500 calc(11.5px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; }
        .pjobb code { color: #a88f6b; font-size: calc(9.5px * var(--bk, 1)); overflow-wrap: anywhere; }
        .pindul { margin-top: 14px; }
        .uzgomb.pnagy { padding: 10px 20px; font-size: calc(14px * var(--bk, 1)); box-shadow: 0 0 16px rgba(255,160,40,.25); }
        .pval button { border-color: rgba(255,176,32,.3); background: rgba(255,176,32,.05); }
        .pval button.akt { background: rgba(255,176,32,.2); border-color: rgba(255,176,32,.8); color: #ffe2a8; }
        :host([keskeny]) .party { grid-template-columns: 1fr; }
        .mcs.luj { background: rgba(255,176,32,.06); border: 1px dashed rgba(255,176,32,.55); box-shadow: none; }
        .mcs.luj::after { display: none; }
        .mcs.luj .mcsn b { color: #ffcf7a; text-shadow: none; }
        .lfelso { gap: 6px; margin: 0 0 2px; }
        .lfelso:empty { display: none; }
        .lfelso .uzgomb { margin: 0; }
        .lvalaszt { display: grid; gap: 10px; }
        .ltetel { display: grid; gap: 2px; color: #c9bfa9; font: 500 calc(12px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; }
        .lujsor { display: flex; gap: 6px; align-items: center; }
        .lujsor .pkeres { flex: 1; min-width: 0; }
        .lujsor .uzgomb { margin: 0; white-space: nowrap; }
        .lelemek { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 4px; margin-top: 10px; }
        .lelem { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px; }
        .lelem > button:first-child { display: flex; align-items: center; gap: 8px; text-align: left; border: 0; border-radius: 3px; padding: 6px 8px; cursor: pointer;
          background: rgba(255,255,255,.05); color: #f3e8d4; min-width: 0; }
        .lelem > button:first-child span { min-width: 0; display: grid; }
        .lelem b { font: 600 calc(12.5px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lelem small { color: #a88f6b; font: 500 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lelem.nem { opacity: .45; }
        .lelem .sm { border: 0; border-radius: 3px; background: rgba(255,255,255,.06); color: #cdb995; cursor: pointer; padding: 0 9px; }
        .enev b .pkeres { font-size: calc(15px * var(--bk, 1)); }
        .mcsempek { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .mcs { position: relative; height: 74px; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; overflow: hidden; cursor: pointer; padding: 0; text-align: left;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.25), transparent 60%), var(--c, #555); box-shadow: 0 4px 10px rgba(0,0,0,.4); -webkit-tap-highlight-color: transparent; }
        .mcs img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
        .mcs::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,9,11,.85), rgba(8,9,11,.25) 75%); }
        .mcsn { position: absolute; left: 10px; right: 8px; bottom: 8px; z-index: 1; display: grid; gap: 4px; }
        .mcsn b { font: 600 calc(15px * var(--bk, 1))/1.1 "Exo 2", "Cantabile Sans", Arial, sans-serif; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mcsn small { display: flex; align-items: center; gap: 4px; font: 600 calc(9.5px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; color: rgba(255,230,190,.9); }
        .mcs:hover img { transform: scale(1.06); }
        .mcs:active { transform: translateY(1px); border-color: rgba(255,176,32,.7); }
        .malcim { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 0; }
        .malcim button { border: 1px solid rgba(90,209,230,.3); background: rgba(90,209,230,.06); color: #dfe9ea; border-radius: 12px; padding: 4px 10px; cursor: pointer;
          font: 600 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; }
        .malcim button small { color: #8fb8bf; font-weight: 500; }
        .malcim button.akt { background: rgba(90,209,230,.22); border-color: rgba(90,209,230,.8); color: #fff; }
        .ehason { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
        .ehason button { display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; border-radius: 22px; border: 1px solid rgba(180,140,255,.3); background: rgba(180,140,255,.07); cursor: pointer; text-align: left; }
        .ehason .ekis { width: 32px; height: 32px; flex: none; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,.1); }
        .ehason .ekis img { width: 100%; height: 100%; object-fit: cover; }
        .ehason b { font: 600 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; color: #f1e6cf; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ehason button:active { background: rgba(180,140,255,.2); }
        :host([keskeny]) .ehos { flex-wrap: wrap; }
        :host([keskeny]) .egomb { flex-direction: row; width: 100%; }
        .kcim.dalos, #cim.dalos { cursor: pointer; }
        #cim.dalos { text-decoration: underline dotted rgba(185,217,255,.55); text-underline-offset: 3px; }
        .dalpolc { z-index: 6; }
        .dalpolc .dlista { flex: 1; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #8a6a45 transparent;
          text-align: center; padding: 10px 4px; mask-image: linear-gradient(180deg, transparent, #000 14%, #000 86%, transparent); }
        .dalpolc .dlista p { margin: 0; padding: 5px 0; color: #cdb995; font: 600 calc(17px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; transition: color .3s, transform .3s; }
        .dalpolc .dlista.szinkron p { opacity: .55; }
        .dalpolc .dlista.szinkron p.most { opacity: 1; color: #ffd892; transform: scale(1.06); text-shadow: 0 0 10px rgba(255,190,90,.35); }
        .dalpolc .dlista p.szunet { font-size: calc(13px * var(--bk, 1)); letter-spacing: .3em; }
        .dalpolc .duzenet { margin: auto; color: #cdb995; font: 500 calc(14px * var(--bk, 1))/1.4 "Cantabile Sans", Arial, sans-serif; text-align: center; }
        .dalpolc .dlab { display: flex; justify-content: space-between; gap: 10px; color: #8f7a58; font: 500 calc(10.5px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; letter-spacing: .04em; }
        :host([keskeny]) .dalpolc .dlista p { font-size: calc(15px * var(--bk, 1)); }
        .pfej { display: flex; align-items: center; gap: 8px; }
        .pful { border: 0; border-radius: 3px; padding: 6px 12px; cursor: pointer; font: 700 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .12em;
          color: #e9dcc4; background: rgba(255,255,255,.08); }
        .pful.akt { background: #e9dcc4; color: #2f1b0d; }
        .put { flex: 1; min-width: 0; color: #cdb995; font: 500 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .put button { border: 0; background: none; color: #ffd892; cursor: pointer; font: 700 calc(12px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; padding: 4px 6px 4px 0; }
        .pkeres { width: 100%; box-sizing: border-box; border: 1px solid rgba(233,220,196,.35); border-radius: 15px; padding: 6px 12px; background: rgba(0,0,0,.25);
          color: #f3e8d4; font: 500 calc(13px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; outline: none; }
        .pkeres::placeholder { color: #a88f6b; }
        .mikdoboz { position: relative; display: block; flex: 1; min-width: 0; }
        .mikdoboz > input { width: 100%; box-sizing: border-box; padding-right: 34px !important; }
        .pmik { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%;
          display: grid; place-items: center; background: transparent; color: #cdb995; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .bker .pmik { color: inherit; opacity: .75; }
        .pmik svg { width: 16px; height: 16px; fill: currentColor; }
        .pmik:hover { color: #ffd892; }
        .pmik:focus-visible { outline: 2px solid #ffd892; outline-offset: 1px; }
        .pmik.rogzit { background: #c8321f; color: #fff; opacity: 1; animation: mikpulz 1.1s ease-in-out infinite; }
        .pmik.dolgozik { background: rgba(255,216,146,.2); color: #ffd892; opacity: 1; animation: mikpulz 1.1s ease-in-out infinite; }
        @keyframes mikpulz { 50% { box-shadow: 0 0 0 5px rgba(200,50,31,.28); } }
        @media (prefers-reduced-motion: reduce) { .pmik.rogzit, .pmik.dolgozik { animation: none; } }
        .pkeres:focus { border-color: #ffd892; }
        .kcsop { margin: 10px 0 6px; color: #cdb995; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; display: flex; gap: 8px; }
        .kcsop:first-child { margin-top: 2px; }
        .kcsop span { color: #8a6a45; letter-spacing: 0; }
        :host([keskeny]) .pfej { flex-wrap: wrap; }
        :host([keskeny]) .pfej .put { order: 5; flex: 1 0 100%; }
        .ktalal { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; }
        .ktalal button:not(.sm) { text-align: left; border: 0; border-radius: 3px; padding: 6px 8px; cursor: pointer; background: rgba(255,255,255,.06); color: #f3e8d4;
          display: grid; gap: 2px; min-width: 0; }
        .ktalal button:not(.sm) b { font: 600 calc(12.5px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ktalal button:not(.sm) small { color: #a88f6b; font: 500 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ktalal button:not(.sm):active, .eloadok button:active { background: rgba(255,216,146,.18); }
        .sorfej { color: #cdb995; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; margin: 2px 0 8px; }
        .sorlista { display: grid; gap: 3px; }
        .sorlista button:not(.sm) { display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: center; gap: 8px; text-align: left; border: 0; border-radius: 3px;
          padding: 5px 8px; cursor: pointer; background: rgba(255,255,255,.05); color: #f3e8d4; }
        .sorlista .sn { color: #a88f6b; font: 600 calc(11px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; text-align: right; font-variant-numeric: tabular-nums; }
        .sorlista .st { display: grid; gap: 2px; min-width: 0; }
        .sorlista b { font: 600 calc(12.5px * var(--bk, 1))/1.25 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sorlista small { color: #a88f6b; font: 500 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sorlista button:not(.sm).akt { background: rgba(255,216,146,.2); box-shadow: inset 3px 0 0 #ffd892; }
        .sorlista button:not(.sm).akt .sn { color: #ffd892; }
        .sorlista button:not(.sm):active { background: rgba(255,216,146,.28); }
        .sorgomb { cursor: pointer; }
        .sorsor, .ktsor { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px; align-items: stretch; }
        .sorsor > button { width: 100%; }
        /* KERESÉS fül: forrás-címkék (világos = ezen a hangszórón szól, halvány = máshol) */
        .fchipek { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 3px; }
        .ktsor.mindsor { grid-template-columns: minmax(0, 1fr); gap: 0; }
        .mindsor .fchipek { justify-content: flex-start; padding: 0 0 6px 10px; margin-top: -2px; }
        .fchip { font: 700 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; padding: 4px 5px; border-radius: 3px;
          border: 1px solid rgba(255,216,146,.25); color: rgba(240,224,196,.45); cursor: pointer; white-space: nowrap; }
        .fchip.ok { border-color: #c9a14a; color: #ffd892; background: rgba(255,216,146,.1); }
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
          font: 700 calc(13px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; }
        .sorm .sm svg { width: 14px; height: 14px; display: block; margin: auto; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
        .sorm .sm.biztos { background: #b8402f; color: #fff; font-size: calc(10px * var(--bk, 1)); letter-spacing: .04em; }
        .sorm .sm:active { background: rgba(255,216,146,.28); }
        .sorfej span { text-transform: none; letter-spacing: 0; color: #a88f6b; font-weight: 500; }
        .pzar { border: 0; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; background: rgba(255,255,255,.1); color: #e9dcc4; font: 400 calc(22px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; padding: 0; }
        .ptest { flex: 1; min-height: 0; display: flex; gap: 8px; }
        .betuk { display: flex; flex-direction: column; flex-wrap: wrap; gap: 1px; align-content: flex-start; width: 46px; }
        .betuk button { width: 22px; height: 15px; border: 0; padding: 0; background: none; color: #cdb995; font: 700 calc(10px * var(--bk, 1))/15px "Cantabile Sans", Arial, sans-serif; cursor: pointer; }
        .betuk button:active { color: #ffd892; }
        .plista { flex: 1; min-width: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #8a6a45 transparent; }
        .eloadok { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px; }
        .eloadok button { text-align: left; border: 0; border-radius: 3px; padding: 7px 8px; cursor: pointer; background: rgba(255,255,255,.06);
          color: #f1e6cf; font: 500 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kazettak { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px 8px; }
        .kt { border: 0; padding: 0; background: none; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; }
        .kt .test { position: relative; height: 70px; border-radius: 5px; background: #2d2f33; box-shadow: 0 3px 6px rgba(0,0,0,.5), inset 0 0 0 1px #17181a; overflow: hidden; }
        .kt .cl { position: absolute; left: 6px; right: 6px; top: 5px; bottom: 18px; border-radius: 2px; background: #f3ecdb; overflow: hidden; display: flex; }
        .kt .cl img { width: 47px; height: 100%; object-fit: cover; flex: none; }
        .kt .cl span { flex: 1; min-width: 0; padding: 0 5px; font: 700 calc(10px * var(--bk, 1))/1.15 "Cantabile Sans", Arial, sans-serif; color: #2b2622; display: flex; align-items: center;
          border-top: 9px solid var(--szin); overflow: hidden; }
        .kt .ab { position: absolute; left: 34%; right: 34%; bottom: 5px; height: 9px; border-radius: 5px; background: #0d0d0e; }
        .kt:active .test { transform: translateY(2px); }
        .kt small { display: block; margin-top: 4px; color: #cdb995; font: 500 calc(10px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .puzenet { color: #cdb995; font: 500 calc(13px * var(--bk, 1))/1.4 "Cantabile Sans", Arial, sans-serif; padding: 16px 6px; }
        .tel { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
        .tblokk { display: grid; gap: 8px; align-content: start; padding: 10px 12px; border-radius: 5px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
        .tblokk h4 { margin: 0; font: 700 calc(10px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .16em; color: #e9dcc4; }
        .tblokk p { margin: 0; font: 500 calc(12px * var(--bk, 1))/1.4 "Cantabile Sans", Arial, sans-serif; color: #cdb995; }
        .tblokk .puzenet { padding: 4px 0; font-size: calc(12px * var(--bk, 1)); }
        .tsor { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .tgomb { border: 0; border-radius: 3px; padding: 8px 14px; cursor: pointer; font: 700 calc(12px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .04em; background: #e9dcc4; color: #2f1b0d; }
        .tgomb.halk { background: rgba(255,255,255,.08); color: #e9dcc4; font-weight: 600; }
        .tgomb.biztos { background: #b3261e; color: #fff; }
        .tgomb:disabled { opacity: .5; cursor: default; }
        .tall { font: 500 calc(11px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #ffd892; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* keskeny (telefon, < 600 px): álló elrendezés, a kártya magassága a tartalomhoz igazodik */
        :host([keskeny]) { height: auto; }
        :host([keskeny]) ha-card { height: auto; padding: 0 8px; }
        :host([keskeny]) .elo { position: relative; inset: auto; margin: 6px 0; display: flex; flex-direction: column; gap: 12px; padding: 16px 12px 14px; }
        :host([keskeny]) .elo.rejt { display: none; }
        :host([keskeny]) .bal { display: contents; }
        :host([keskeny]) .fej { order: 1; flex-wrap: wrap; row-gap: 14px; min-height: 18px; }
        :host([keskeny]) .fej .marka { font-size: calc(27px * var(--bk, 1)); }
        :host([keskeny]) .fej .tipus { font-size: calc(17px * var(--bk, 1)); margin-left: 8px; }
        :host([keskeny]) .fej .hszfej { display: none; }
        :host([keskeny]) .fej .fogas { margin-left: auto; }
        :host([keskeny]) .fej .infog { margin-left: auto; } :host([keskeny]) .fej .infog + .fogas { margin-left: 2px; }
        :host([keskeny]) .skala { order: 2; flex: none; height: 132px; min-height: 0; }
        :host([keskeny]) .sav { left: 10px; right: 10px; }
        :host([keskeny]) .skala { grid-template-columns: 70px minmax(0, 1fr) 34px; gap: 6px; padding: 6px; }
        :host([keskeny]) .sz.ptl { display: none; }
        :host([keskeny]) .jfel { font-size: calc(8px * var(--bk, 1)); }
        :host([keskeny]) .sz { font-size: calc(10px * var(--bk, 1)); }
        :host([keskeny]) .kiir { font-size: calc(12px * var(--bk, 1)); }
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
        .adosor .bill b { font-size: calc(11.5px * var(--bk, 1)); line-height: 1.05; }
        .adosor .bill small { font-size: calc(9px * var(--bk, 1)); line-height: 1; flex: none; }
        .adosor .bill.akt, .adosor .bill:active { transform: translateY(2px); box-shadow: 0 1px 0 #80858c, 0 2px 3px rgba(0,0,0,.25); }
        .adosor .adoures { background: linear-gradient(180deg, #eceef0, #d6dade); border-style: dashed; border-color: #a3a8af; box-shadow: 0 2px 0 #9ca1a8; align-items: center; padding: 0; }
        .adosor .adoures .plusz { font: 300 calc(20px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #8a8f97; }
        /* széles rádió: balra a hangerőgomb, jobbra a POWER és alatta a RADIO / TAPE kapcsoló */
        .jobb.rjobb { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "hang rbal" "otg otg" "kim kim"; justify-content: stretch; align-content: space-between; align-items: center; gap: 2px 4px; }
        .rjobb > .rbal { grid-area: rbal; display: flex; flex-direction: column; align-items: center; gap: 12px; align-self: start; padding-top: 0; }
        .rjobb > .rbal .power { align-self: flex-end; }   /* széles rádión a jobb felső sarokban */
        .rjobb > .hangero { grid-area: hang; justify-self: center; transform: scale(.74); margin: -24px; }
        .rjobb > .rotg { grid-area: otg; }
        .rjobb > .forgo { grid-area: kim; justify-self: center; }
        .rjobb > .forgo .valaszto { zoom: .86; }
        :host([keskeny]) .elo:not(.magno) .adosor { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 39px; height: auto; gap: 9px 6px; order: 3; padding-bottom: 4px; }
        :host([keskeny]) .elo:not(.magno) .adosor .bill { height: 39px; flex-direction: column; align-items: center; gap: 2px; padding: 9px 2px 2px; }
        :host([keskeny]) .elo:not(.magno) .adosor .bill b { font-size: calc(12px * var(--bk, 1)); }
        /* telefonos rádió, a magnóhoz hasonlóan: fent NET · SLEEP · BT, alatta hangerő + SPEAKERS, legalul balra POWER,
           középen a vízszintes RADIO / TAPE kapcsoló */
        :host([keskeny]) .jobb.rjobb { order: 4; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "otg otg" "hang kim" "rbal rbal"; justify-content: stretch; align-content: center; align-items: center; gap: 4px 8px; row-gap: 6px; }
        :host([keskeny]) .magno .mjobb > .forgo.ket .valaszto { zoom: .8; }
        :host([keskeny]) .rjobb > .forgo { justify-self: center; align-self: center; }
        :host([keskeny]) .rjobb > .forgo .valaszto { zoom: .84; }
        :host([keskeny]) .rjobb > .forgo.ket .valaszto { zoom: .8; }
        :host([keskeny]) .rjobb > .hangero { transform: scale(.72); margin: -25px -25px -25px -22px; }
        :host([keskeny]) .rjobb > .rotg { align-self: end; margin-top: 4px; }
        /* nagyon keskeny telefonon (390 px alatt) a kétoldalas választó kisebb, hogy a nevek ne érjenek a hangerőgombhoz */
        :host([szuk]) .rjobb > .forgo.ket .valaszto, :host([szuk]) .magno .mjobb > .forgo.ket .valaszto { zoom: .7; }
        :host([keskeny]) .rjobb > .rbal { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0; padding: 2px 0 0; align-self: center; }
        :host([keskeny]) .rbal .power { justify-self: start; }
        :host([keskeny]) .rbal .valto { flex-direction: row; gap: 6px; justify-self: center; }
        :host([keskeny]) .rbal .kapcs { width: 40px; height: 18px; }
        :host([keskeny]) .rbal .kapcs::after { left: 2px; top: 2px; width: 18px; height: 14px; transition: left .2s; }
        :host([keskeny]) .rotg .og-net { order: 1; } :host([keskeny]) .rotg .og-sleep { order: 2; } :host([keskeny]) .rotg .og-bt { order: 3; }
        :host([magas]) ha-card { grid-template-rows: auto; align-content: center; }
        :host([magas]) .elo { height: auto; aspect-ratio: 2.3; max-height: 100%; }
        /* üzenetablak: külön réteg a kártya fölött – füstüveg, borostyán szegély, Michroma fejléc, Exo 2 szöveg, fogyó időcsík */
        /* lenyíló előlap (INPUT · BASS · TREBLE): a régi hi-fi alsó, lenyitható fedele a ritkán kellő kezelőszervekkel.
           Fogója az előlap alján; a fedél alul csuklósan nyílik a néző felé, és 20 mp tétlenség után magától visszacsukódik */
        .fedfog { position: absolute; left: 50%; bottom: 0; z-index: 4; transform: translateX(-50%); height: 13px; padding: 0 16px; border: 0; border-radius: 0 0 7px 7px;
          cursor: pointer; font: 700 calc(7px * var(--bk, 1))/13px "Cantabile Sans", Arial, sans-serif; letter-spacing: .26em; color: #4f545b; white-space: nowrap;
          background: linear-gradient(180deg, #a9aeb5, #c3c7cc); box-shadow: inset 0 2px 3px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.5); -webkit-tap-highlight-color: transparent; }
        .fedfog::before { content: ""; display: inline-block; vertical-align: 1px; margin-right: 6px; border: 3.5px solid transparent; border-top: 4.5px solid currentColor; border-bottom: 0; }
        .fedfog[hidden] { display: none; }
        .fedel { position: absolute; left: 12px; right: 12px; bottom: 6px; z-index: 8; box-sizing: border-box; border-radius: 4px 4px 6px 6px; padding: 14px 18px 12px;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px 22px; color: #2b2e33;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px),
            linear-gradient(180deg, #d9dce0, #bfc3c9 60%, #aeb3ba);
          box-shadow: inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #6d7076, 0 -6px 18px rgba(0,0,0,.35), 0 14px 26px rgba(0,0,0,.45);
          transform-origin: 50% 100%; transform: perspective(700px) rotateX(84deg); opacity: 0; pointer-events: none;
          transition: transform .45s cubic-bezier(.2,1.1,.4,1), opacity .3s; }
        .fedel.nyitva { transform: none; opacity: 1; pointer-events: auto; }
        .fedel[hidden] { display: none; }
        .fedel::before { content: ""; position: absolute; left: 10px; right: 10px; top: 4px; height: 3px; border-radius: 2px; background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(255,255,255,.4)); }
        .fedel small { display: block; text-align: center; font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .24em; color: #4f545b; }
        .fbem { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
        .fbill { display: flex; gap: 6px; height: 46px; }
        .fbill .bill { flex: none; min-width: 58px; padding: 13px 8px 4px; }
        .fbill .bill b { font-size: calc(11px * var(--bk, 1)); letter-spacing: .06em; }
        .fhang { position: relative; width: 92px; height: 98px; flex: none; }
        .fhang .tj { position: absolute; left: 50%; top: 44px; width: 1.5px; height: 6px; margin: -40px 0 0 -.75px; background: #3d4148; transform-origin: .75px 40px; }
        .fhang .tj.n { height: 8px; width: 2px; margin-left: -1px; transform-origin: 1px 40px; }
        .fhang .tsz { position: absolute; top: 36px; font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; color: #3d4148; }
        .kgomb { position: absolute; left: 50%; top: 44px; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; touch-action: none; cursor: grab;
          background: repeating-conic-gradient(#d8dbdf 0 5deg, #7d828a 5deg 10deg); box-shadow: 0 4px 8px rgba(0,0,0,.45), 0 0 0 1.5px #50545a; }
        .kgomb .ksapka { top: 5px; right: 5px; bottom: 5px; left: 5px; inset: 5px; }
        .kgomb .ksapka::after { top: 4px; width: 3px; height: 12px; margin-left: -1.5px; }
        .fhang .tcim { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font: 700 calc(9px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .22em; color: #3d4148; }
        .fhang .tcim span { letter-spacing: .04em; color: #5b6068; }
        .fzar { align-self: stretch; display: flex; flex-direction: column; justify-content: center; gap: 6px; border: 0; background: none; cursor: pointer; padding: 0; -webkit-tap-highlight-color: transparent; }
        .fzar i { display: block; width: 46px; height: 22px; border-radius: 3px; border: 1px solid #7c8189; background: linear-gradient(180deg, #fafbfc, #dde0e4 70%, #c9cdd2); box-shadow: 0 4px 0 #80858c, 0 5px 5px rgba(0,0,0,.25); transition: transform .12s, box-shadow .12s; }
        .fzar:active i { transform: translateY(3px); box-shadow: 0 1px 0 #80858c; }
        .fmeg { flex-basis: 100%; text-align: center; font: 500 calc(12px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #4a4e55; }
        .fido { position: absolute; left: 14px; right: 14px; bottom: 4px; height: 2px; border-radius: 1px; background: rgba(0,0,0,.18); transform-origin: 0 50%; }
        .fedel.nyitva .fido { animation: fedfogy var(--fido, 20s) linear forwards; }
        @keyframes fedfogy { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        /* EQ fül: régi grafikus equalizer – fülek a fedél tetején, profil-kijelző (VFD), billentyűk, 10 világító tolókar */
        .ffulek { position: absolute; left: 16px; top: -1px; display: flex; gap: 2px; }
        .fful { border: 0; border-radius: 0 0 4px 4px; padding: 4px 12px 5px; cursor: pointer; font: 700 calc(8px * var(--bk, 1))/1 "Cantabile Sans", Arial, sans-serif; letter-spacing: .2em;
          color: #5b6068; background: rgba(0,0,0,.08); box-shadow: inset 0 2px 3px rgba(0,0,0,.25); -webkit-tap-highlight-color: transparent; }
        .fful.akt { color: #1d1f22; background: rgba(255,255,255,.55); box-shadow: inset 0 -1px 0 rgba(0,0,0,.15); }
        .fedel.fulos { padding-top: 26px; }
        .feq { display: flex; align-items: stretch; gap: 18px; flex: 1 1 auto; min-width: 0; justify-content: center; }
        .feqbal { display: flex; flex-direction: column; gap: 10px; justify-content: center; min-width: 0; }
        .fvfd { width: 230px; max-width: 100%; box-sizing: border-box; padding: 6px 8px 7px; border-radius: 3px; background: #07100f; box-shadow: inset 0 2px 6px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.5); }
        .fvfd small { text-align: left; color: #2f7f74; font-size: calc(7px * var(--bk, 1)); letter-spacing: .2em; }
        .fvsor { display: flex; align-items: center; gap: 6px; margin-top: 4px; min-height: 22px; }
        .feqn { flex: 1; min-width: 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font: 400 calc(13px * var(--bk, 1))/1 Michroma, "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; color: #7ff6e2; text-shadow: 0 0 6px rgba(80,240,210,.65); }
        .feqn.ki { color: #2d6f66; text-shadow: none; }
        .feqlep { flex: none; width: 22px; height: 22px; padding: 4px; border: 0; border-radius: 3px; cursor: pointer; background: rgba(127,246,226,.08); -webkit-tap-highlight-color: transparent; }
        .feqlep svg { width: 100%; height: 100%; fill: #7ff6e2; display: block; }
        .feqnev { flex: 1; min-width: 0; box-sizing: border-box; border: 1px solid #2f7f74; border-radius: 3px; background: #0b1a18; color: #7ff6e2; padding: 3px 6px;
          font: 500 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; outline: none; }
        .fvsor .bill { flex: none; height: 24px; min-width: 40px; padding: 9px 6px 2px; }
        .feqgombok { height: 40px; }
        .feqgombok .bill { min-width: 0; flex: 1; padding: 12px 5px 3px; }
        .feqgombok .bill b { font-size: calc(9.5px * var(--bk, 1)); }
        .ftolok { display: flex; gap: 4px; align-items: stretch; padding: 4px 8px 0; border-radius: 3px; background: rgba(0,0,0,.06); box-shadow: inset 0 1px 3px rgba(0,0,0,.2); }
        .ftolo { width: 26px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ftolo small { font-size: calc(7.5px * var(--bk, 1)); letter-spacing: .02em; }
        .fsin { position: relative; width: 26px; height: 112px; cursor: ns-resize; touch-action: none; }
        .fsin::before { content: ""; position: absolute; left: 50%; top: 4px; bottom: 4px; width: 4px; margin-left: -2px; border-radius: 2px; background: #1d1f22; box-shadow: inset 0 1px 2px #000, 0 1px 0 rgba(255,255,255,.6); }
        .fnull { position: absolute; left: 3px; right: 3px; top: 50%; height: 1px; background: rgba(0,0,0,.35); }
        .ffog { position: absolute; left: 1px; right: 1px; height: 12px; margin-bottom: -6px; border-radius: 2px; background: linear-gradient(180deg, #fafbfc, #c9cdd2); box-shadow: 0 2px 3px rgba(0,0,0,.45), 0 0 0 1px #6d7076; }
        .ffog::after { content: ""; position: absolute; left: 3px; right: 3px; top: 5px; height: 2px; border-radius: 1px; background: #ff7a2f; box-shadow: 0 0 5px #ff7a2f; }
        .ftolo.ki .ffog::after { background: #6b3a35; box-shadow: none; }
        .fauto-lap { flex: 1 1 100%; display: flex; flex-direction: column; gap: 8px; min-width: 0; max-height: 250px; }
        .fedel.autolap .fzar { position: absolute; right: 16px; top: 30px; }
        .fedel:not(.fulos).autolap .fzar { top: 14px; }
        .fbtall { font-weight: 600; color: #8a5a00; } .fbtall.ok { color: #1d7a3a; }
        small .fbtall { letter-spacing: .04em; text-transform: none; }
        .fbtlep { margin: 0; padding-left: 22px; display: grid; gap: 6px; font: 500 calc(13px * var(--bk, 1))/1.35 "Cantabile Sans", Arial, sans-serif; color: #2b2e33; }
        .fbtlep b { font-weight: 700; color: #000; }
        .fbtnyit { display: inline-block; margin-left: 6px; padding: 2px 10px; border-radius: 3px; border: 1px solid #7c8189; background: linear-gradient(180deg, #fafbfc, #d5d8dc);
          color: #2b2e33; text-decoration: none; font-weight: 700; font-size: calc(11px * var(--bk, 1)); letter-spacing: .06em; }
        .fbtpar { margin-left: 4px; padding: 2px 8px; border-radius: 3px; border: 1px solid #7c8189; background: linear-gradient(180deg, #fafbfc, #d5d8dc); cursor: pointer;
          color: #2b2e33; font: 700 calc(10px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; letter-spacing: .08em; }
        :host([fekete]) .fbtpar { background: linear-gradient(180deg, #34373c, #1c1e21); color: #e8eaed; border-color: #000; }
        .fbtism { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font: 600 calc(12px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #4a4e55; }
        .fbtism small { text-align: left; margin-right: 4px; }
        .fbtism .ok { color: #1d7a3a; }
        .fbtfoglalt { padding: 7px 10px; border-radius: 3px; border-left: 3px solid #c98a00; background: rgba(255,176,32,.14);
          font: 500 calc(12px * var(--bk, 1))/1.4 "Cantabile Sans", Arial, sans-serif; color: #5a3d00; }
        :host([fekete]) .fbtfoglalt { color: #ffd892; background: rgba(255,176,32,.1); }
        .fbtmas { text-align: left; flex-basis: auto; font-size: calc(11.5px * var(--bk, 1)); }
        :host([fekete]) .fbtlep { color: #d5d8dc; } :host([fekete]) .fbtlep b { color: #fff; }
        :host([fekete]) .fbtall { color: #ffb547; } :host([fekete]) .fbtall.ok, :host([fekete]) .fbtism .ok { color: #6fdc8c; }
        :host([fekete]) .fbtism { color: #9a9ea5; }
        :host([fekete]) .fbtnyit { background: linear-gradient(180deg, #34373c, #1c1e21); color: #e8eaed; border-color: #000; }
        .fedel.autolap .fafej { padding-right: 64px; }
        .fafej { display: flex; align-items: center; gap: 10px; font: 500 calc(11px * var(--bk, 1))/1.3 "Cantabile Sans", Arial, sans-serif; color: #4a4e55; }
        .fedel .fafej .bill { flex: none; height: 30px; min-width: 56px; max-width: 80px; padding: 10px 6px 3px; }
        .fedel .fbt-lap { max-height: none; }
        .fakol { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; overflow-y: auto; overscroll-behavior: contain; min-height: 0; padding-right: 4px; }
        .fakol small { text-align: left; margin-bottom: 4px; }
        .fasor { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,.08);
          font: 600 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; color: #2b2e33; }
        .fasor span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fauto { flex: none; width: 130px; border: 1px solid #7c8189; border-radius: 3px; background: #f3f4f6; color: #2b2e33; padding: 2px 4px; font: 500 calc(11px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; }
        :host([fekete]) .fful { color: #9a9ea5; background: rgba(255,255,255,.04); }
        :host([fekete]) .fful.akt { color: #e8eaed; background: rgba(255,255,255,.14); }
        :host([fekete]) .ftolok { background: rgba(0,0,0,.25); }
        :host([fekete]) .ffog { background: linear-gradient(180deg, #4a4d52, #1c1e21); box-shadow: 0 2px 3px rgba(0,0,0,.6), 0 0 0 1px #000; }
        :host([fekete]) .fnull { background: rgba(255,255,255,.2); }
        :host([fekete]) .fafej, :host([fekete]) .fasor { color: #c9ccd1; }
        :host([fekete]) .fasor { border-color: rgba(255,255,255,.08); }
        :host([fekete]) .fauto { background: #1c1e21; color: #e8eaed; border-color: #000; }
        :host([keskeny]) .feq { flex-direction: column; align-items: center; gap: 10px; }
        :host([keskeny]) .ftolo { width: 22px; } :host([keskeny]) .fsin { width: 22px; height: 96px; }
        :host([keskeny]) .fakol { grid-template-columns: 1fr; }
        :host([keskeny]) .fafej span { font-size: calc(10px * var(--bk, 1)); }
        :host([fekete]) .fedfog { background: linear-gradient(180deg, #0c0d0f, #1d1e21); color: #9a9ea5; box-shadow: inset 0 2px 3px rgba(0,0,0,.8); }
        :host([fekete]) .fedel { color: #d5d8dc;
          background: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, rgba(0,0,0,.08) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #2a2c30, #17181b);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px #050506, 0 -6px 18px rgba(0,0,0,.5), 0 14px 26px rgba(0,0,0,.6); }
        :host([fekete]) .fedel small, :host([fekete]) .fhang .tcim, :host([fekete]) .fhang .tsz, :host([fekete]) .fmeg { color: #9a9ea5; }
        :host([fekete]) .fhang .tj { background: #9a9ea5; }
        :host([fekete]) .fzar i { border-color: #000; background: linear-gradient(180deg, #34373c, #1c1e21); box-shadow: 0 4px 0 #08090a, 0 5px 5px rgba(0,0,0,.5); }
        :host([keskeny]) .fedel { left: 6px; right: 6px; padding: 14px 10px 12px; gap: 10px 14px; }
        :host([keskeny]) .fbem { flex-basis: 100%; }
        :host([keskeny]) .fbill { justify-content: center; }
        :host([keskeny]) .fbill .bill { flex: 1 1 0; min-width: 0; max-width: 104px; padding: 13px 3px 4px; }
        :host([keskeny]) .fbill .bill b { font-size: calc(10px * var(--bk, 1)); letter-spacing: .02em; }
        .uzreteg { position: absolute; left: 0; right: 0; z-index: 60; display: flex; justify-content: center; pointer-events: none; transform: translateY(-50%); }
        .uzablak { pointer-events: none; opacity: 0; transform: translateY(-12px) scale(.97); transition: opacity .35s ease, transform .45s cubic-bezier(.2,1.2,.4,1);
          position: relative; overflow: hidden; box-sizing: border-box; width: min(86%, 440px); padding: 11px 16px 13px; border-radius: 7px; cursor: pointer;
          background: linear-gradient(180deg, rgba(30,32,36,.94), rgba(10,11,13,.96)); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,176,32,.38);
          box-shadow: 0 14px 34px rgba(0,0,0,.55), 0 0 22px rgba(255,160,40,.14), inset 0 1px 0 rgba(255,255,255,.09); -webkit-tap-highlight-color: transparent; }
        .uzablak.lat { opacity: 1; transform: none; pointer-events: auto; }
        .uzablak.zar { opacity: 0; transform: translateY(6px) scale(.98); transition: opacity .6s ease, transform .6s ease; }
        .uzfej { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font: 400 calc(8.5px * var(--bk, 1))/1 Michroma, "Cantabile Sans", Arial, sans-serif;
          letter-spacing: .32em; color: rgba(255,190,90,.78); }
        .uzfej i { width: 6px; height: 6px; border-radius: 50%; background: #ffb020; box-shadow: 0 0 6px #ffb020; animation: uzpislog 1.6s ease-in-out infinite; }
        .uzszoveg { font: 500 calc(14.5px * var(--bk, 1))/1.4 "Exo 2", "Cantabile Sans", Arial, sans-serif; letter-spacing: .015em; color: #f3ead8; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
        .uzgombok { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
        .uzgomb { padding: 5px 12px; border-radius: 4px; border: 1px solid rgba(255,176,32,.6); background: rgba(255,176,32,.12); cursor: pointer;
          font: 600 calc(12px * var(--bk, 1))/1.2 "Cantabile Sans", Arial, sans-serif; letter-spacing: .06em; color: #ffcf7a; }
        .uzgomb:focus-visible { outline: 2px solid #ffb020; outline-offset: 2px; }
        .uzido { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform-origin: left center;
          background: linear-gradient(90deg, rgba(255,176,32,.25), #ffb020); box-shadow: 0 0 6px rgba(255,176,32,.7); }
        @keyframes uzfogy { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes uzpislog { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        :host([keskeny]) .uzszoveg { font-size: calc(13.5px * var(--bk, 1)); }
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
        :host([fekete]) .gomb, :host([fekete]) .kgomb { background: repeating-conic-gradient(#3a3d42 0 2.5deg, #0e0f11 2.5deg 5deg); box-shadow: 0 6px 12px rgba(0,0,0,.6), 0 0 0 2px #000; }
        :host([fekete]) .vgomb { background: repeating-conic-gradient(#3a3d42 0 5deg, #0e0f11 5deg 10deg); box-shadow: 0 4px 8px rgba(0,0,0,.6), 0 0 0 1.5px #000; }
        :host([fekete]) .sapka, :host([fekete]) .vsapka, :host([fekete]) .ksapka {
          background: conic-gradient(from 20deg, #4a4d53, #1f2124 12%, #44474c 25%, #1b1d20 38%, #4d5056 50%, #1d1f22 62%, #45484d 75%, #1c1e21 88%, #4a4d53);
          box-shadow: inset 0 2px 2px rgba(255,255,255,.18), inset 0 -3px 5px rgba(0,0,0,.6); }
        :host([fekete]) .sapka::after, :host([fekete]) .vsapka::after, :host([fekete]) .ksapka::after { background: #e8eaed; }
        :host([fekete]) .tfog { background: linear-gradient(180deg, #4a4d52, #222427 45%, #3a3d42 55%, #17181b); box-shadow: 0 0 0 1px #000, 0 2px 3px rgba(0,0,0,.6); }
        :host([fekete]) .tfog::after { background: #c9ccd1; }
      </style>
      <ha-card>
        <div class="elo" id="elo">
          <div class="bal">
            <div class="fej"><span class="marka">${ESC(c.marka || "Cantabile")}</span><span class="tipus">Stereophonic Receiver</span><span class="hszfej"></span><button class="infog" title="${T("Jelút: honnan jön a hang, mi történik vele, hol szól")}">${IKON.info}</button><button class="fogas" title="${T("Beállítások")}">${IKON.fogas}</button></div>
            <div class="skala">
              <div class="feny"></div>
              <div class="jelm">${jelmero}<span class="jfel" id="jfel"></span><span class="stereo"><i></i>STEREO</span></div>
              <div class="skkoz">
                <span class="mertek">FM</span><span class="mertek j2">MHz</span>
                <div class="sav"><div class="vonal"></div>${jelek}${adojel}<div class="mutato" id="mutato" style="left:${this._poz(c.adok[0]?.frekvencia ?? this._savKozep())}%"></div></div>
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
          <button class="fedfog" hidden title="${T("Bemenet és hangszín")}">INPUT · TONE</button>
          <div class="polc" id="netpolc" hidden></div>
          <div class="polc dalpolc" id="dalpolc_r" hidden></div>
        </div>
        <div class="elo magno rejt${c.magno?.vu_kijelzo === "fluor" ? " vfdmod" : ""}" id="magno">
          <div class="bal">
            <div class="fej"><span class="marka">${ESC(c.marka || "Cantabile")}</span><span class="tipus">Stereo Cassette Deck</span><span class="hszfej"></span><button class="infog" title="${T("Jelút: honnan jön a hang, mi történik vele, hol szól")}">${IKON.info}</button><button class="fogas" title="${T("Beállítások")}">${IKON.fogas}</button></div>
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
          <button class="fedfog" hidden title="${T("Bemenet és hangszín")}">INPUT · TONE</button>
          <div class="polc konyv" id="polc" hidden></div>
          <div class="polc dalpolc" id="dalpolc_m" hidden></div>
        </div>
        <div class="fedel" id="fedel" hidden></div>
        <div class="beall" id="beall" hidden></div>
      </ha-card>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll(".ado, .adoures").forEach((b) => this._adoGombKezel(b));
    sr.querySelectorAll(".hsz").forEach((b) => b.addEventListener("click", () => this._kimenetValt(Number(b.dataset.i))));
    sr.querySelectorAll(".hszv").forEach((b) => b.addEventListener("click", () => this._kimenetValt(Number(b.dataset.i))));
    const hszLep = (d) => {
      const L = this._hszIdx.filter((j) => j === this._hangUtolso() || !this._foglalo(this._kimenetek[j])), k = L.indexOf(this._hangUtolso());
      if (L.length < 2 && this._hszIdx.length > 1) return this._uzen(T("A többi hangszóró foglalt."));
      this._kimenetValt(L[(((k + d) % L.length) + L.length) % L.length]);
    };
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
      this._mod = this._mod === "magno" ? "radio" : "magno"; TAR.ir("tablet-radio-mod", this._mod); this._fedelZar(); this._polcZar(); this._netZar(); this._dalZar(); this._frissit(); this._igazitKesobb();
    }));
    sr.getElementById("power").addEventListener("click", () => this._bekapcs());
    sr.getElementById("kcim").addEventListener("click", (e) => { if (this._kazDal) { e.stopPropagation(); this._dalNyit("m"); } });
    sr.getElementById("cim").addEventListener("click", (e) => { if (this._radioDal) { e.stopPropagation(); this._dalNyit("r"); } });
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
    sr.querySelectorAll(".infog").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); this._jelutE ? this._jelutZar() : this._jelutNyit(); }));
    sr.querySelectorAll(".fedfog").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); this._fedelNyit(); }));
    this._fedelKezel(sr.getElementById("fedel"));
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
  // `csendes`: a hívó maga kezeli a hibát (vagy a hiba várható, pl. csoportbontás, átvitel utáni tekerés) – nincs üzenet
  // a foglalás: más felhasználó hangszórójára nem megy parancs (üzenet, ki használja); az indító hívás előtt a hangszóró
  // a miénk lesz (ha közben más foglalta le, nem indul), a leállító után elengedjük
  _hiv(d, s, adat, opc = {}) {
    if (["media_player", "cantabile", "sonos"].includes(d) && adat) {
      const ids = [...[].concat(adat.entity_id || []), ...[].concat(adat.group_members || [])].filter((e) => typeof e === "string" && e.startsWith("media_player."));
      const fr = this._foglaloIds(ids);
      if (fr) { if (!opc.csendes) this._foglaltUzen(fr); return Promise.resolve(); }
      const bem = !opc.bemenetKesz && ["play_media", "play_tracks", "play_queue"].includes(s) ? ids.filter((e) => this._bemenetrol(e)) : [];
      if (bem.length) {
        return Promise.all(bem.map((e) => this._hass.callWS({ type: "cantabile/input/select", entity_id: e, source: "Network", device: ESZKOZ() })
          .catch((err) => console.warn("Cantabile: a hálózatra váltás nem sikerült", e, err))))
          .then(() => new Promise((r) => setTimeout(r, 1000)))        // a WiiM a módváltás alatt eldobná a lejátszást
          .then(() => this._hiv(d, s, adat, { ...opc, bemenetKesz: true }));
      }
      if (this._foglKesz && ids.length && FOGLALO.has(`${d}.${s}`)) return this._foglal(ids).then((ok) => (ok ? this._hivVegre(d, s, adat, opc) : undefined));
      if (ids.length && ELENGEDO.has(`${d}.${s}`)) return this._hivVegre(d, s, adat, opc).then((v) => { this._elenged(ids); return v; });
    }
    return this._hivVegre(d, s, adat, opc);
  }

  _hivVegre(d, s, adat, { csendes = false } = {}) {
    if (adat?.entity_id === HELYI || adat?.variables?.entity_id === HELYI) return this._helyi(d, s, adat);
    // elérhetetlen lejátszó (pl. kikapcsolt / alvó TV-bot): a parancs úgysem menne át – a kártya szól, nem hallgat
    if ((d === "media_player" || d === "cantabile") && adat?.entity_id) {
      const ids = [].concat(adat.entity_id);
      if (ids.every((e) => this._hass.states[e]?.state === "unavailable")) { if (!csendes) this._nemElerheto(ids[0]); return Promise.resolve(); }
    }
    // amit a lejátszó nem tud (pl. egyes DLNA- vagy Cast-vevők), azt nem hívjuk – különben csendben hibát dobna
    if (d === "media_player" && KEPESSEG[s] && adat?.entity_id) {
      const ids = [].concat(adat.entity_id).filter((e) => { const f = this._hass.states[e]?.attributes?.supported_features; return f == null || (f & KEPESSEG[s]); });
      if (!ids.length) {
        if (csendes) return Promise.resolve();
        const mit = { volume_set: T("hangerő"), shuffle_set: T("keverés"), repeat_set: T("ismétlés"), join: T("csoportba kapcsolás"), media_seek: T("tekerés") }[s];
        const e = [].concat(adat.entity_id)[0], h = (this._kimenetek || []).find((x) => x.entity === e);
        const uz = T("A(z) {h} ezt nem tudja: {m}.", { h: h ? KN(h) : e, m: mit });
        if (this._nemTudUtolso !== uz || Date.now() - (this._nemTudIdo || 0) > 4000) { this._nemTudUtolso = uz; this._nemTudIdo = Date.now(); this._uzen(uz); }
        return Promise.resolve();
      }
      adat = { ...adat, entity_id: Array.isArray(adat.entity_id) ? ids : ids[0] };
    }
    const p = this._hass.callService(d, s, adat);
    // semmi ne hiúsuljon meg csendben: a sikertelen hívás mindig üzenetet ad (a hívó pontosabb üzenete felülírhatja)
    if (!csendes) p.catch((err) => this._hivHiba(adat?.entity_id, err));
    return p;
  }

  // ---- hangszóró-foglalás (foglalas.py) ----
  _foglalasFeliratkozas() {
    if (this._foglSub || !this._hass?.connection || this._nincsIntegracio) return;
    const sub = this._foglSub = this._hass.connection.subscribeMessage((m) => this._foglalasJott(m), { type: "cantabile/lock/subscribe" });
    sub.then(() => { if (this._foglSub === sub) this._foglKesz = true; }, () => { if (this._foglSub === sub) this._foglSub = null; });   // régebbi integráció: nincs foglalás
  }

  _foglalasJott(m) {
    const en = this._hass?.user?.id;
    this._fogl = m?.foglalt || {};
    // rendszergazda átvette a mi hangszórónkat
    const a = (m?.atvett || []).find((x) => x.regi === en);
    if (a) this._uzen(T("{n} átvette: {h}.", { n: a.uj, h: this._hszNev(a.entity) }));
    this._frissit();
  }

  // más felhasználó foglalása az adott lejátszók közül (az első), vagy null
  _foglaloIds(ids) {
    const en = this._hass?.user?.id, f = this._fogl;
    if (!f || !en) return null;
    for (const e of ids) { const r = f[e]; if (r && r.user !== en) return { ...r, entity: e }; }
    return null;
  }

  _foglalo(h) { return !h || h.entity === HELYI ? null : this._foglaloIds(h.tagok || [h.entity]); }

  _hszNev(e) {
    const h = (this._kimenetek || []).find((x) => x.entity === e && !x.tagok);
    return h ? KN(h) : this._hass?.states[e]?.attributes?.friendly_name || e;
  }

  _foglaltUzen(r) {
    if (this._foglUzUt === r.entity && Date.now() - (this._foglUzIdo || 0) < 4000) return;
    this._foglUzUt = r.entity; this._foglUzIdo = Date.now();
    const ki = ESZKOZ_NEV[r.eszkoz] ? `${r.nev} · ${T(ESZKOZ_NEV[r.eszkoz])}` : r.nev;
    const gomb = this._hass?.user?.is_admin ? { szoveg: T("Átveszem"), fn: () => this._atvesz(r.entity) } : null;
    this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(r.entity), n: ki }), gomb);
  }

  // true: a miénk (vagy a foglalás nem érhető el – a zene ettől ne akadjon el); false: más használja (szólt)
  async _foglal(ids, atvesz = false) {
    try {
      const r = await this._hass.callWS({ type: "cantabile/lock/claim", entity_id: ids, device: ESZKOZ(), takeover: atvesz });
      if (r?.ok === false) { this._foglUzUt = null; this._foglaltUzen(r); return false; }
    } catch (e) {
      if (atvesz) { this._hivHiba(ids[0], e); return false; }
    }
    return true;
  }

  async _atvesz(e) {
    const h = (this._kimenetek || []).find((x) => x.entity === e && !x.tagok);
    if (await this._foglal([e], true)) this._uzen(T("Átvetted: {h}. Most már kiválaszthatod.", { h: h ? KN(h) : this._hszNev(e) }));
  }

  _elenged(ids) {
    const en = this._hass?.user?.id, sajat = ids.filter((e) => this._fogl?.[e]?.user === en);
    if (this._foglKesz && sajat.length) this._hass.callWS({ type: "cantabile/lock/release", entity_id: sajat }).catch(() => {});
  }

  _hivHiba(entity, err) {
    const e = [].concat(entity || [])[0], h = (this._kimenetek || []).find((x) => x.entity === e);
    const nev = h ? KN(h) : this._hass?.states[e]?.attributes?.friendly_name || e || "";
    const m = String(err?.message || err?.code || err || "");
    if (this._hivHibaUtolso === m && Date.now() - (this._hivHibaIdo || 0) < 3000) return;
    this._hivHibaUtolso = m; this._hivHibaIdo = Date.now();
    this._uzen(nev ? T("A(z) {h}: a parancs nem sikerült – {e}", { h: nev, e: m }) : T("A parancs nem sikerült: {e}", { e: m }));
  }

  // mely hangszórókon játszható le egy kazetta / adó (a hibaüzenetben ajánlja): a streamek (Deezer, Tidal, Spotify-link)
  // csak Sonoson, a Spotify Spotify Connecten is; a NAS, a telefon és a rádió bármelyiken (elérhetőn)
  _kepesek(kaz, kiveve = null) {
    return this._kepesLista(kaz, kiveve).map((h) => KN(h)).join(", ") || T("egyik sem");
  }

  _kepesLista(kaz, kiveve = null) {
    const ok = (h) => {
      if (h.tagok || (kiveve && h.entity === kiveve.entity)) return false;
      if (h.entity !== HELYI && this._hass?.states[h.entity]?.state === "unavailable") return false;
      if (kaz?.forras !== "stream") return true;
      if (h.entity === HELYI) return false;
      if (kaz.tipus === "wiim_preset") return this._wiim(h);
      return h.mod === "sonos" || (kaz.tipus === "spotify" && !!this._spotifyEszkoz(h));
    };
    return (this._kimenetek || []).filter(ok);
  }

  // „▶ Nappali” gombok a „nem játszható itt” üzenetbe: átvált arra a hangszóróra (ami eddig szólt, leáll), és elindítja
  _valtGombok(lista, indit) {
    return lista.filter((h) => !this._foglalo(h)).map((h) => ({ szoveg: `▶ ${KN(h)}`, fn: () => this._valtIndit(this._kimenetek.indexOf(h), indit) }));
  }

  async _valtIndit(i, indit) {
    const cel = this._kimenetek[i], regi = this._hangszoro();
    if (!cel) return;
    const fr = this._foglalo(cel);
    if (fr) return this._foglaltUzen(fr);
    if (regi && regi !== cel && SZOL(this._allapot(regi))) {
      this._szkriptLeallit(); this._kezi = null;
      try { await this._hiv("media_player", "media_stop", { entity_id: regi.tagok || regi.entity }, { csendes: true }); } catch (e) { /* a régi elhallgat vagy nem – az új indul */ }
    }
    this._kimenetValt(i, false);
    if (this._kimenetek[this._hsz] !== cel) return;            // nem váltott (pl. nem tud zenét fogadni) – erről már szólt
    return indit();
  }

  // a hangszóró elfogadta a parancsot, de nem kezdett játszani („visszadobta”): rövid várakozás után szól, és ajánl helyette
  _inditasFigyel(hsz, cim, kaz = null) {
    if (!hsz || hsz.entity === HELYI || this._hass?.states[hsz.entity]?.state === "unavailable") return;   // erről már szólt
    const jel = this._inditasJel = {}, t0 = Date.now(), ent = hsz.entity;
    const spotify = kaz?.forras === "stream" && kaz.tipus === "spotify" && hsz.mod !== "sonos" ? this._stream?.spotify_entity : null;
    // a TV-oldal kiküldése és a Spotify-integráció frissítése (kb. 30 mp) lassabb
    const tv = /^media_player\.cantabile_tv_/.test(ent) || !!this._tvMap?.[ent], hatar = tv ? 45000 : spotify ? 35000 : 12000;
    const k = () => {
      if (this._inditasJel !== jel) return;                       // közben más indult
      const st = this._hass?.states[spotify || ent]?.state;
      if (st === "playing" || st === "buffering" || st === "paused" || st === "unavailable") return;
      if (Date.now() - t0 > hatar) {
        this._uzen(T("A(z) {h} nem kezdte el lejátszani: „{c}”. Lehet, hogy ezt nem tudja lejátszani – próbáld ezeken: {l}.", { h: KN(hsz), c: cim || "", l: this._kepesek(kaz, hsz) }));
        return;
      }
      setTimeout(k, 700);
    };
    setTimeout(k, 1500);
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
    const fr = this._foglalo(hsz); if (fr) return this._foglaltUzen(fr);
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
      this._uzen(iso ? T("Kikapcsol {p} perc múlva ({t}).", { p: kov, t: ujVege.toLocaleTimeString(NYELV(), { hour: "numeric", minute: "2-digit", ...ORA_OPC(this._hass) }) }) : T("Időzített kikapcsolás törölve."));
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
    if (tobbi.length) return this._hiv("media_player", "unjoin", { entity_id: tobbi }, { csendes: true }).catch(() => {});
  }

  // kimenetváltás: ami szól, átkerül az új kimenetre (mint egy igazi hangszóróválasztón); atvisz=false: csak választ
  async _atviszHaKell(regi, uj) {
    // a hangszóró saját bemenete (BT IN, LINE IN) nem vihető át: a régi szünetel (BT-n a telefon is megáll), az új hallgat;
    // ha visszaváltunk rá, onnan folytatja – hacsak nem visszük rá épp más zenét
    const regiBem = regi.entity !== HELYI && this._bemenetrol(regi.entity);
    if (regiBem) {
      const rs = this._allapot(regi), forras = rs?.attributes?.source;
      if (SZOL(rs) && /^bluetooth$/i.test(forras || "") && !this._foglaloIds([regi.entity])) {
        // BT-n a telefon is megáll; TV- / vonalbemenetet nem némítunk el csak azért, mert a kártyán másikat választottak
        try {
          await this._hiv("media_player", "media_pause", { entity_id: regi.entity }, { csendes: true });
          this._bemSzunet = { ...(this._bemSzunet || {}), [regi.entity]: { forras, ido: Date.now() } };
          this._uzen(T("A(z) {h} a(z) {b} bemenetről szólt – ez nem vihető át, szüneteltettem. Ha visszaváltasz rá, onnan folytatja.", { h: KN(regi), b: BEMENET_NEV(forras) }));
        } catch (_) { /* nem szüneteltethető: szól tovább */ }
      } else if (SZOL(rs)) this._uzen(T("A(z) {h} a(z) {b} bemenetről szól – ez nem vihető át, ott szól tovább.", { h: KN(regi), b: BEMENET_NEV(forras) }));
    }
    const folyt = this._bemSzunet?.[uj.entity];
    if (folyt) {
      delete this._bemSzunet[uj.entity];
      const us = this._hass?.states[uj.entity], rs = this._allapot(regi);
      if ((regiBem || !SZOL(rs)) && us?.state === "paused" && us.attributes?.source === folyt.forras && Date.now() - folyt.ido < 3 * 3600000) {
        await this._csoportAllit(uj);
        return this._hiv("media_player", "media_play", { entity_id: uj.entity });
      }
    }
    if (regiBem) return this._csoportAllit(uj);         // a bemenet hangja nem vihető át
    if (this._spotifyConnectSzol(regi)) {
      // Spotify Connect: a Spotify maga adja át a lejátszást a másik eszköznek
      const eszk = this._spotifyEszkoz(uj);
      if (!eszk) { this._hsz = this._kimenetek.indexOf(regi); this._hangUtolso(); this._uzen(T("A Spotify Connect-lejátszás csak Spotify Connect-hangszóróra vihető át – a(z) {r} szól tovább.", { r: KN(regi) })); return this._frissit(); }
      return this._hiv("media_player", "select_source", { entity_id: this._stream.spotify_entity, source: eszk });
    }
    // PARTY: a régi hangszórón leáll, az újon ugyanazzal a válogatással indul
    const pk = TAR.json("tablet-magno-kazetta");
    if (pk?.party && pk.entity === regi.entity && uj.entity !== HELYI) {
      const futo = await this._hass.callWS({ type: "cantabile/party/state" }).then((r) => r.parties.find((x) => x.entity_id === regi.entity), () => null);
      if (futo) {
        await this._hass.callWS({ type: "cantabile/party/stop", entity_id: regi.entity }).catch(() => {});
        await this._hiv("media_player", "media_stop", { entity_id: regi.entity }, { csendes: true }).catch(() => {});
        if (await this._partyIndit(uj, pk.cfg)) this._uzen(T("A PARTY átkerült ide: {h}.", { h: KN(uj) }));
        return;
      }
    }
    // saját lista: az új hangszórón indul (ott az szól belőle, amit az tud)
    if (pk?.lista && pk.entity === regi.entity && uj.entity !== HELYI && (SZOL(this._allapot(regi)) || SZUNETEL(this._allapot(regi)))) {
      await this._hiv("media_player", "media_stop", { entity_id: regi.entity }, { csendes: true }).catch(() => {});
      this._hass.callWS({ type: "cantabile/lock/release", entity_id: regi.entity }).catch(() => {});
      return this._listaJatszik(pk.lista, pk.cim, 0, uj);
    }
    // Music Assistant sora: megkeressük, hogyan szólhat tovább az új kimeneten –
    //  1. MA-lejátszó, vagy a cél készüléknek van MA-párja (Sonos 1 ↔ Sonos MA, Technics ↔ WiiM MA): az MA viszi át;
    //  2. nincs MA-pár (TV, BT…), de a szám a zenemappából szól: a Cantabile veszi át ugyanattól a számtól és ponttól;
    //  3. különben (az MA streaming-szolgáltatója): marad, ahol szól
    const ms = this._allapot(regi);
    if (this._maLejatszo(regi.entity) && this._maSorSzol(regi.entity) && (SZOL(ms) || SZUNETEL(ms))) {
      await this._maInfoLeker();
      const cel = uj.entity === HELYI ? null : this._maLejatszo(uj.entity) ? uj.entity : this._maInfo?.pairs?.[uj.entity] || null;
      if (cel) {
        try {
          await this._hass.callWS({ type: "cantabile/ma/transfer", source: regi.entity, target: cel, device: ESZKOZ() });
          if (cel !== uj.entity) {
            // a választó a pár MA-lejátszójára áll (ha a kártyán van), hogy a QUEUE és a kijelző az MA sorát mutassa
            const i = this._kimenetek.findIndex((h) => h.entity === cel && !h.tagok);
            if (i >= 0) { this._hsz = i; this._hangUtolso(); TAR.ir("tablet-radio-hangszoro", this._kimenetek[i].kulcs || cel); this._frissit(); }
            this._uzen(T("Music Assistant: a sor átkerült a(z) {h} készülékre (az MA-lejátszóján át).", { h: KN(uj) }));
          }
        } catch (err) { this._maHiba(cel, err); }
        return;
      }
      let most = null;
      try { most = await this._hass.callWS({ type: "cantabile/ma/now", entity_id: regi.entity, mappa: String(this._config.magno?.nas || "").replace(/\/$/, "") }); } catch (_) { /* nincs adat */ }
      if (most?.file && most.folder) {
        const szamok = await this._albumSzamok(most.folder).catch(() => []);
        const kezdo = szamok.indexOf(most.file);
        if (kezdo >= 0) {
          await this._hiv("media_player", "media_stop", { entity_id: regi.entity }, { csendes: true }).catch(() => {});
          await this._csoportAllit(uj);
          const kaz = { forras: "nas", id: most.folder, cim: most.current?.album || FAJLNEV(most.folder), alcim: most.current?.artist || "", szamok };
          const f = { kaz, kezdo, poz: Number(most.elapsed) || 0 };
          this._atvitel = { ado: -1, forras: f, hova: uj.entity, ido: Date.now() };
          this._uzen(T("A Music Assistant a zenemappából játszotta – a(z) {h} hangszórón a Cantabile folytatja ugyanonnan.", { h: KN(uj) }));
          return this._kazettaFolytat(f, uj);
        }
      }
      this._hsz = this._kimenetek.indexOf(regi); this._hangUtolso();
      this._uzen(T("Ezt a Music Assistant-számot ({p}) csak Music Assistant-lejátszó játszhatja – a(z) {r} szól tovább.", { p: most?.provider?.split("--")[0] || "MA", r: KN(regi) }));
      return this._frissit();
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
      if (uj.mod === "sonos") await this._hiv("media_player", "play_media", { entity_id: vez, media_content_id: id, media_content_type: "music", enqueue: "add" }, { csendes: true }).catch(() => {});
      else await this._hiv("cantabile", "add_tracks", { entity_id: uj.entity, tracks: [id] }, { csendes: true }).catch(() => {});
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
    this._hiv("media_player", "media_seek", { entity_id: uj.entity, seek_position: Math.round(f.poz) }, { csendes: true }).catch(() => {});
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
    this._inditasJel = null;
    const n = this._kimenetek.length, regi = this._hangszoro(), regiAll = this._allapot(regi);
    const cel = this._kimenetek[((i % n) + n) % n], kiz = atvisz ? this._kizarolagos(regi, regiAll) : null;
    const celAll = cel && cel.entity !== HELYI ? this._hass?.states[cel.entity] : null;
    const fr = cel !== regi && this._foglalo(cel);
    if (fr) { this._foglaltUzen(fr); this._frissit(); return; }
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
    // a TV, amelyről elváltottunk (vagy amelyik az előzőt tükrözte), hang nélkül tovább mutatja, ami most szól – átvitelnél
    // csak utána, amikor a régi sorozatlejátszó már leállt (különben a TV elhallgatását számváltásnak venné)
    const kovet = () => {
      if (regi && regi !== uj && regi.entity !== HELYI && uj.entity !== HELYI && this._ent && !this._nincsIntegracio)
        this._hass.callWS({ type: "cantabile/tv/follow", source: regi.entity, target: uj.entity }).catch(() => {});
    };
    if (atvisz && regi && regi !== uj) {
      this._valtSor = (this._valtSor || Promise.resolve()).then(() => this._atviszHaKell(regi, uj))
        .catch((e) => this._uzen(T("Az átváltás nem sikerült: {h}", { h: e?.message || e }))).then(kovet);
    } else { this._csoportAllit(uj); kovet(); }
    // a régi hangszóró foglalása: ha átváltás után már nem szól, elengedjük (ami az új állásnak is tagja, az marad)
    if (regi && regi !== uj && regi.entity !== HELYI) {
      const marad = uj.tagok || [uj.entity], ids = (regi.tagok || [regi.entity]).filter((e) => !marad.includes(e));
      setTimeout(() => this._elenged(ids.filter((e) => !SZOL(this._hass?.states[e]))), 4000);
    }
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
    p.then(() => this._inditasFigyel(hsz, a.nev), () => {});
    this._frissit();
    return p;
  }

  // SIGNAL: a stream „térereje” – bitrátából (cantabile/signal, ffprobe), él-e az adás, pufferel-e; léptetéskor SEEK
  _jelRajz() {
    const sr = this.shadowRoot, ra = this._radioAll;
    if (!sr || !ra) return;
    let v = 0, fel = "";
    if (this._netGiro) { v = 0.12; fel = "SEEK"; }
    else if (ra.szol) {
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

  // Gyro-Touch lendkerék: a Radio Browser-lista adóin lép (egy fog ≈ 40 px húzás vagy egy görgőkattanás) – a szóló
  // (NET- vagy gombos) adótól indulva; a kijelző mutatja, megállás / elengedés után az az adó szól
  _giroKezel(giro) {
    const kerek = giro.querySelector("#kerek");
    let x0 = null, id = null, poz = 0, gyujt = 0;
    const lep = (dx, fog) => {
      poz += dx; kerek.style.backgroundPositionX = `${poz.toFixed(1)}px`;
      gyujt += dx;
      while (Math.abs(gyujt) >= fog) { const d = Math.sign(gyujt); gyujt -= d * fog; this._netGiroLep(d); }
    };
    giro.addEventListener("pointerdown", (e) => {
      e.stopPropagation(); id = e.pointerId; giro.setPointerCapture(id); x0 = e.clientX; gyujt = 0;
      clearTimeout(this._netGiroIdo);
    });
    giro.addEventListener("pointermove", (e) => {
      if (x0 == null || e.pointerId !== id) return;
      const dx = e.clientX - x0; x0 = e.clientX; lep(dx, 40);
    });
    const fel = (e) => { if (x0 == null || e.pointerId !== id) return; x0 = null; this._netGiroVege(); };
    giro.addEventListener("pointerup", fel); giro.addEventListener("pointercancel", fel);
    giro.addEventListener("wheel", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!this._netGiro) gyujt = 0;
      lep(Math.max(-100, Math.min(100, e.deltaY || e.deltaX)) * 0.4, 40);
      this._netGiroVege(1200);
    }, { passive: false });
  }

  // adógomb: koppintás = hangol (üres helyen: NET-katalógus); hosszú nyomás = a most szóló NET-adót menti ide (felülírhatja)
  _adoGombKezel(b) {
    let ido = null, hosszu = false;
    const ures = b.classList.contains("adoures");
    const le = () => { clearTimeout(ido); ido = null; };
    b.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      hosszu = false; le();
      ido = setTimeout(() => { ido = null; hosszu = true; navigator.vibrate?.(25); this._gombraMent(ures ? null : Number(b.dataset.i), b); }, 750);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, le));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    b.addEventListener("click", (e) => {
      if (hosszu) { hosszu = false; e.preventDefault(); return; }
      if (ures) this._netNyit(); else this._hangol(Number(b.dataset.i));
    });
  }

  async _gombraMent(i, gomb) {
    const ra = this._radioAll, k = ra?.szol && ra.i === KULSO ? this._kulso() : null;
    if (!k?.url) return this._uzen(T("Hosszan nyomva a gomb a most szóló NET-adót menti el – a gíró kerékkel vagy a NET gombbal keress egyet."));
    if (!this._hass?.user?.is_admin) return this._uzen(T("A gombra mentéshez rendszergazdai felhasználó kell."));
    const c = this._config, nev = String(k.nev || "").trim() || CIM(k.url);
    const van = c.adok.findIndex((a) => CIM(a.url) === CIM(k.url));
    if (van >= 0) return this._uzen(T("„{n}” már a(z) {g}. gombon van.", { n: nev, g: van + 1 }));
    const regiAdok = c.adok.map(({ virt, ...a }) => (virt ? { ...a, frekvencia: "" } : a)), adok = regiAdok.map((a) => ({ ...a }));
    const regi = i != null ? c.adok[i] : null;
    // a felülírt gomb a helyén marad (a frekvenciáját örökli); üres helyre a névben szereplő frekvencia, vagy WEB
    const uj = { nev, url: k.url, frekvencia: regi ? (regi.virt ? "" : regi.frekvencia) : this._savFrek(nev) };
    if (regi) adok[i] = uj;
    else if (adok.length >= 12) return this._uzen(T("Mind a 12 gomb foglalt – nyomj hosszan egy foglalt gombot, és felülírja."));
    else adok.push(uj);
    gomb?.classList.add("ment");
    const ok = await this._adokMent(adok, () => regi ? T("„{n}” a(z) {g}. gombra mentve (helyette: {r}).", { n: nev, g: i + 1, r: regi.nev }) : T("„{n}” gombra mentve.", { n: nev }),
      regi ? { szoveg: T("Visszavon"), fn: (k) => k._adokMent(regiAdok, () => T("Visszaállítva: „{r}”.", { r: regi.nev })) } : null);
    if (!ok) gomb?.classList.remove("ment");
  }

  // az adólista mentése a ⚙ mentésével (ugyanazokra a vezérlőpultokra), a beállítások ablaka nélkül
  _adokMent(adok, kesz, gomb = null) {
    const c = this._config;
    this._szerk = JSON.parse(JSON.stringify({ marka: c.marka || "Cantabile", deezer: c.deezer !== false, felulet: c.felulet === "black" ? "black" : "silver",
      hangszorok: c.hangszorok.map(({ automod, ...h }) => h), adok, magno: c.magno || {} }));
    return this._beallMent({ kesz, gomb });
  }

  _bekapcs() {
    this._inditasJel = null;
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
          ${sz.adok.map((a, i) => `<div class="bsor ado">${be("adok", i, "nev", a.nev, `placeholder="${T("Név")}"`)}${be("adok", i, "rovid", a.rovid, `placeholder="${T("(a név)")}"`)}${be("adok", i, "frekvencia", a.frekvencia, `inputmode="decimal" placeholder="${MHZ(this._sav[0])}–${MHZ(this._sav[1])}"`)}${be("adok", i, "url", a.url, 'placeholder="https://…"')}<button class="bproba" data-a="proba" data-i="${i}" title="${T("Lejátszás a választott hangszórón")}">${T("▶ Próba")}</button><button class="bx" data-a="torol" data-l="adok" data-i="${i}" title="${T("Törlés")}">×</button></div>`).join("")}
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
    this._mikHozza(b.querySelector("#bkeres"), () => this._keres());
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
      const f = this._savFrek(t.name);
      sz.adok.push({ nev: t.name.trim(), frekvencia: f, url: t.url_resolved || t.url });
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
  // `csendes`: gyors mentés (pl. hosszú nyomás egy adógombon) – az eredmény üzenetben, nem a beállítások ablakában
  async _beallMent(csendes = null) {
    const sz = this._szerk, hibak = [];
    const hibaUzen = (m) => { if (!csendes) return this._beallRajz(m); this._beallZar(); this._uzen(m); return false; };
    const adok = sz.adok.map((a) => ({ ...a, nev: String(a.nev || "").trim(), rovid: String(a.rovid || "").trim(), url: String(a.url || "").trim(), frekvencia: String(a.frekvencia ?? "").trim() === "" ? NaN : Number(String(a.frekvencia).replace(",", ".")) }));
    adok.forEach((a, i) => {
      if (!a.nev) hibak.push(T("{n}. adó: hiányzik a név", { n: i + 1 }));
      if (Number.isFinite(a.frekvencia) && !(a.frekvencia >= this._sav[0] && a.frekvencia <= this._sav[1])) hibak.push(T("{n}: a frekvencia {a} és {b} közé essen (vagy hagyd üresen)", { n: a.nev || T("{n}. adó", { n: i + 1 }), a: MHZ(this._sav[0]), b: MHZ(this._sav[1]) }));
      if (!/^https?:\/\//.test(a.url)) hibak.push(T("{n}: a stream-cím http:// vagy https:// kezdetű legyen", { n: a.nev || T("{n}. adó", { n: i + 1 }) }));
    });
    const hsz = sz.hangszorok.map((h) => { const o = { nev: String(h.nev || "").trim(), entity: h.entity, mod: h.mod === "sonos" ? "sonos" : "url" }; if (String(h.rovid || "").trim()) o.rovid = String(h.rovid).trim(); return o; });
    // gyors mentésnél a hangszórók változatlanok: azokat nem ellenőrzi (egy régi, túl hosszú név ne akassza meg)
    if (!csendes) hsz.forEach((h, i) => {
      if (!h.nev || !h.entity) hibak.push(T("{n}. hangszóró: név és lejátszó kell", { n: i + 1 }));
      else if ((h.rovid || "").length > NEV_MAX) hibak.push(T("{n}: a kártyán megjelenő név legfeljebb 8 karakter lehet", { n: h.nev }));
      else if (!h.rovid && h.nev.length > NEV_MAX) hibak.push(T("{n}: a név 8 karakternél hosszabb – adj meg rövidebb nevet a kártyára", { n: h.nev }));
    });
    if (!hsz.length) hibak.push(T("Legalább egy hangszóró kell."));
    if (hibak.length) return hibaUzen(hibak.join(" · "));
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
          // a ⚙ által kezelt, de KULCS-ban nem szereplő kulcs (deezer) a régiből nem marad meg (különben nem lehetne visszakapcsolni)
          const regi = Object.fromEntries(Object.entries(y).filter(([k]) => !(k in KULCS) && !(k in VISSZA) && k !== "deezer"));
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
      const nem = hibas.length ? " " + T("Nem sikerült: {h}.", { h: hibas.map((u) => lista.find((d) => d.url_path === u)?.title || u || T("Áttekintés")).join(", ") }) : "";
      const uz = (csendes ? csendes.kesz() : T("Beállítások elmentve: {n}.", { n: nevek })) + nem, gomb = csendes?.gomb || null;
      ATADANDO = { szoveg: uz, gomb, regi: this, ido: Date.now() };
      this._uzen(uz, gomb);
      return true;
    } catch (err) {
      const m = String(err?.message || err?.code || err);
      return hibaUzen(/unauthorized|admin/i.test(m) ? T("A mentéshez rendszergazdai felhasználó kell.") : T("A mentés nem sikerült: {h}", { h: m }));
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
    else if (!this._nincsIntegracio) this._hiv("cantabile", "stop_tracks", { entity_id: hsz.entity }, { csendes: true }).catch(() => {});
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
    if (k === "stop" || k === "pause") this._inditasJel = null;     // a felhasználó leállította: az indításfigyelő ne szóljon
    // a hangszóró saját bemenetéről (BT IN, LINE IN) szól: a STOP szünet – a WiiM a stopot nem adja tovább a telefonnak, az pár
    // másodperc múlva újraindulna; a szünetet igen, és a PLAY onnan folytatja
    if (k === "stop" && this._bemenetrol(hsz.entity)) {
      const p = SZOL(s) ? this._hiv("media_player", "media_pause", e) : Promise.resolve();
      return p.then(() => this._elenged([hsz.entity]));
    }
    if (kaz?.party && (k === "stop" || k === "ff" || (k === "play" && !SZUNETEL(s) && !SZOL(s)))) {
      if (k === "play") return this._partyIndit(hsz, kaz.cfg);
      if (k === "ff") return this._hass.callWS({ type: "cantabile/party/skip", entity_id: hsz.entity }).catch(() => this._hiv("media_player", "media_next_track", e));
      await this._hass.callWS({ type: "cantabile/party/stop", entity_id: hsz.entity }).catch(() => {});
    }
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
    if (kaz.lista) return this._listaJatszik(kaz.lista, kaz.cim, kezdo);
    const hsz = this._hangszoro(), h = this._hass, e = { entity_id: hsz.entity };
    if (hsz.entity !== HELYI && h?.states[hsz.entity]?.state === "unavailable") return this._nemElerheto(hsz.entity);
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
      if (kaz.forras === "stream" && kaz.tipus === "wiim_preset") {
        if (!this._wiim(hsz)) throw Object.assign(new Error(T("A(z) {h} hangszórón ez nem játszható le – lejátszható: {l}.", { h: KN(hsz), l: this._kepesek(kaz, hsz) })), { hely: true });
        await this._hiv("media_player", "play_media", { ...e, media_content_id: kaz.id, media_content_type: "music" });
      } else if (kaz.forras === "stream") {
        if (hsz.mod !== "sonos" && kaz.tipus === "spotify" && this._stream?.spotify_entity && hsz.entity !== HELYI) return this._spotifyConnect(kaz, hsz);
        if (hsz.mod !== "sonos") throw Object.assign(new Error(T("A(z) {h} hangszórón ez nem játszható le – lejátszható: {l}.", { h: KN(hsz), l: this._kepesek(kaz, hsz) })), { hely: true });
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
      this._inditasFigyel(hsz, kaz.cim, kaz);
      this._frissit();
    } catch (err) {
      const m = err?.message || String(err);
      this._uzen(kaz?.tipus === "deezer" && !err?.hely ? T("A Deezer nem indult el ({h}). A Sonos appban kösd be a Deezer-fiókot (Beállítások → Szolgáltatások), vagy a ⚙ beállításokban rejtsd el a DEEZER fület.", { h: m }) : m,
        err?.hely ? this._valtGombok(this._kepesLista(kaz, hsz), () => this._betolt(kaz, kezdo)) : null);
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
  // `gomb`: {szoveg, fn} vagy ezek listája – műveletek az üzenetben (pl. „Átveszem”, „▶ Nappali”)
  _uzen(szoveg, gomb = null) {
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
      reteg.innerHTML = `<div class="uzablak" role="status" aria-live="polite"><div class="uzfej"><i></i>CANTABILE</div><div class="uzszoveg"></div><div class="uzgombok" hidden></div><div class="uzido"></div></div>`;
      reteg.querySelector(".uzablak").addEventListener("click", () => this._uzenZar());
      reteg.querySelector(".uzgombok").addEventListener("click", (e) => {
        const b = e.target.closest(".uzgomb"); if (!b) return;
        e.stopPropagation(); const f = this._uzenGombok?.[Number(b.dataset.i)]?.fn; this._uzenZar(); f?.(this);
      });
      kartya.appendChild(reteg);
    }
    const ablak = reteg.querySelector(".uzablak"), ido = Math.max(gomb ? 12000 : 0, Math.min(10000, 4000 + String(szoveg).length * 55));
    reteg.querySelector(".uzszoveg").textContent = szoveg;
    const gombok = this._uzenGombok = [].concat(gomb || []).slice(0, 4), gb = reteg.querySelector(".uzgombok");
    gb.hidden = !gombok.length;
    gb.innerHTML = gombok.map((g, i) => `<button class="uzgomb" type="button" data-i="${i}">${ESC(g.szoveg)}</button>`).join("");
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
    const lehet = ["eloado", "mind", "party", "listak", "nas", "tel", ...(this._config.magno?.nas || this._config.deezer !== false ? ["mufaj"] : []), ...(this._vanSonos() ? ["stream", ...(this._config.deezer !== false ? ["deezer"] : [])] : []), ...["spotify", "tidal"].filter((x) => this._szolgLatszik(x)), ...(this._maInfo?.available ? ["ma"] : [])];
    this._polc = { ful: lehet.includes(ful) ? ful : "eloado", ut: [] };
    this._polcRajz();
    // a Music Assistant (ha van) fülét az első megnyitáskor tudjuk meg: utána megjelenik a fejlécben
    this._maInfoLeker().then(() => {
      if (this._maInfo?.available) this._maKonyvtar(this._polc?.maTip || "album").catch(() => {});
      const pf = this.shadowRoot.getElementById("polc");
      if (this._polc && this._maInfo?.available && pf && !pf.querySelector('[data-ful="ma"]')) {
        if (ful === "ma") this._polc.ful = "ma";
        this._polcRajz();
      }
    });
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

  // ---- hangos keresés: mikrofon gomb a keresőmezőkben. A HA Assist beszédfelismerője (az alapértelmezett hangsegéd
  // folyamatának STT-része, assist_pipeline/run), ha nincs ilyen, a böngészőé (Web Speech). A felismert szöveg a mezőbe
  // kerül, és a keresés elindul; a mező a szokott módon javítható.
  _mikHozza(inp, utana = null) {
    if (!inp || inp.parentElement?.classList.contains("mikdoboz")) return;
    const w = document.createElement("span"), b = document.createElement("button");
    w.className = "mikdoboz";
    b.type = "button"; b.className = "pmik"; b.title = T("Hangos keresés"); b.setAttribute("aria-label", T("Hangos keresés"));
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
    inp.replaceWith(w); w.append(inp, b);
    if (this._mik?.id === inp.id) { this._mik.b = b; b.classList.add(this._mik.fazis); }   // újrarajzolás felvétel közben
    b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this._mik) return this._mik.allj?.();
      this._mikIndit(inp.id, b, utana);
    });
  }

  _mikFazis(f) {
    const m = this._mik; if (!m) return;
    m.b?.classList.remove(m.fazis); m.fazis = f; m.b?.classList.add(f);
  }

  async _mikIndit(id, b, utana) {
    const m = this._mik = { id, b, fazis: "rogzit", allj: null, megszakit: null };
    b.classList.add("rogzit");
    let szoveg = null;
    try {
      szoveg = await this._mikAssist(m);
    } catch (e) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (e?.tartalek && SR && this._mik === m) {
        try { szoveg = await this._mikBongeszo(m, SR); } catch (e2) { this._mikHiba(e2); }
      } else this._mikHiba(e?.tartalek ? { kod: "nincs" } : e);
    } finally {
      m.b?.classList.remove("rogzit", "dolgozik");
      if (this._mik === m) this._mik = null;
    }
    if (szoveg == null || m.megszakitva) return;
    const t = String(szoveg).trim().replace(/[.!?]+$/, "");
    if (!t) return this._uzen(T("Nem értettem – próbáld újra."));
    const inp = this.shadowRoot?.getElementById(id);
    if (!inp) return;
    inp.value = t;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    utana?.();
  }

  _mikHiba(e) {
    const uz = {
      https: T("A hangos kereséshez mikrofon kell, amit a böngésző csak https-kapcsolaton enged."),
      engedely: T("A mikrofon nincs engedélyezve – engedd meg a böngészőben vagy a HA app beállításaiban."),
      mik: T("Nem érhető el mikrofon: {e}", { e: e?.e?.message || e?.e || "" }),
      nincs: T("Nincs beszédfelismerő: állíts be egy hangsegédet beszédfelismeréssel (Beállítások → Hangsegédek)."),
      csend: T("Nem hallottam semmit – próbáld újra."),
    }[e?.kod] || T("A beszédfelismerés nem sikerült: {e}", { e: e?.e?.message || e?.e?.code || e?.e || e?.message || e || "" });
    this._uzen(uz);
  }

  // a HA Assist STT-je: 16 kHz-es, 16 bites mono PCM a websocketen (bináris keretek: az első bájt a kezelő azonosítója);
  // a HA hangfelismerése (VAD) jelzi, ha elhallgattunk – vagy a gomb újbóli megnyomása, legkésőbb 10 mp
  _mikAssist(m) {
    return new Promise((ok, hiba) => {
      const conn = this._hass?.connection;
      if (!conn?.socket) return hiba({ tartalek: true });
      if (!navigator.mediaDevices?.getUserMedia) return hiba({ kod: "https" });
      let folyam = null, ctx = null, unsub = null, kezelo = null, vege = false, kesz = false, szoveg = null, hibaJott = null;
      const sor = [], idok = [];
      const takarit = () => {
        idok.forEach(clearTimeout);
        try { folyam?.getTracks().forEach((t) => t.stop()); } catch (e) { /* már leállt */ }
        try { ctx?.close(); } catch (e) { /* már zárva */ }
        unsub?.then((u) => u?.(), () => {});
      };
      const befejez = (fn, v) => { if (kesz) return; kesz = true; takarit(); fn(v); };
      const kuld = (d) => { try { conn.socket.send(d); } catch (e) { /* bontott kapcsolat: a run-end / az időkorlát zár */ } };
      const keret = (i16) => { const d = new Uint8Array(1 + i16.byteLength); d[0] = kezelo; d.set(new Uint8Array(i16.buffer), 1); kuld(d); };
      const allj = () => {
        if (vege) return;
        vege = true; this._mikFazis("dolgozik");
        try { folyam?.getTracks().forEach((t) => t.stop()); } catch (e) { /* már leállt */ }
        if (kezelo != null) kuld(new Uint8Array([kezelo]));
      };
      m.allj = allj;
      m.megszakit = () => { m.megszakitva = true; allj(); befejez(ok, null); };
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then((f) => {
        folyam = f;
        if (kesz) return takarit();
        const AC = window.AudioContext || window.webkitAudioContext;
        try { ctx = new AC({ sampleRate: 16000 }); } catch (e) { ctx = new AC(); }
        const arany = ctx.sampleRate / 16000, forras = ctx.createMediaStreamSource(f), proc = ctx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = (ev) => {
          if (vege) return;
          const be = ev.inputBuffer.getChannelData(0), n = Math.floor(be.length / arany), i16 = new Int16Array(n);
          for (let i = 0; i < n; i++) i16[i] = Math.max(-1, Math.min(1, be[Math.floor(i * arany)])) * 0x7fff;
          if (kezelo == null) sor.push(i16); else keret(i16);
        };
        forras.connect(proc); proc.connect(ctx.destination);
        unsub = conn.subscribeMessage((ev) => {
          if (ev.type === "run-start") {
            kezelo = ev.data?.runner_data?.stt_binary_handler_id;
            if (kezelo == null) { hibaJott = { code: "nincs-stt" }; return; }
            sor.splice(0).forEach(keret);
            if (vege) kuld(new Uint8Array([kezelo]));
          } else if (ev.type === "stt-vad-end") allj();
          else if (ev.type === "stt-end") szoveg = ev.data?.stt_output?.text || "";
          else if (ev.type === "error") hibaJott = ev.data || {};
          else if (ev.type === "run-end") {
            if (szoveg != null) return befejez(ok, szoveg);
            if (hibaJott?.code === "stt-no-text-recognized") return befejez(ok, "");
            // nem jutott el a hangig (nincs hangsegéd / beszédfelismerő): a böngésző felismerője jöhet
            befejez(hiba, kezelo == null || hibaJott?.code === "nincs-stt" ? { tartalek: true } : { kod: "stt", e: hibaJott });
          }
        }, { type: "assist_pipeline/run", start_stage: "stt", end_stage: "stt", input: { sample_rate: 16000 } });
        unsub.catch(() => befejez(hiba, { tartalek: true }));
        idok.push(setTimeout(allj, 10000), setTimeout(() => befejez(hiba, { kod: "stt", e: "időtúllépés" }), 30000));
      }, (e) => befejez(hiba, { kod: e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "engedely" : "mik", e }));
    });
  }

  // tartalék: a böngésző beszédfelismerője (Chrome: a Google-é); a félkész szöveg már gépelés közben a mezőben látszik
  _mikBongeszo(m, SR) {
    return new Promise((ok, hiba) => {
      const r = new SR(), ny = String(this._hass?.locale?.language || this._hass?.language || "en");
      r.lang = ny === "hu" ? "hu-HU" : ny; r.interimResults = true; r.maxAlternatives = 1;
      let vegso = "", rossz = null;
      r.onresult = (e) => {
        vegso = [...e.results].map((x) => x[0].transcript).join("");
        const inp = this.shadowRoot?.getElementById(m.id); if (inp) inp.value = vegso;
      };
      r.onerror = (e) => { rossz = e.error === "not-allowed" || e.error === "service-not-allowed" ? { kod: "engedely" } : e.error === "no-speech" ? { kod: "csend" } : e.error === "aborted" ? null : { kod: "stt", e: e.error }; };
      r.onend = () => (rossz ? hiba(rossz) : ok(m.megszakitva ? null : vegso));
      r.onspeechend = () => this._mikFazis("dolgozik");
      m.allj = () => { this._mikFazis("dolgozik"); r.stop(); };
      m.megszakit = () => { m.megszakitva = true; r.abort(); };
      try { r.start(); } catch (e) { hiba({ kod: "stt", e }); }
    });
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
    this._mikHozza(inp);
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
      if (n.ful === "mufaj" && !n.tag && nev.length < 2) {
        const tagek = (await this._rb("/json/tags?order=stationcount&reverse=true&limit=60&hidebroken=true")).filter((t) => t.name && /^[\p{L}0-9 &'-]{2,24}$/u.test(t.name));
        if (most !== kulcs(this._net)) return;
        lista.innerHTML = `<div class="eloadok">${tagek.map((t, i) => `<button data-t="${i}">${ESC(t.name)} <small>${t.stationcount}</small></button>`).join("")}</div>`;
        lista.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { n.tag = tagek[Number(b.dataset.t)].name; this._netRajz(); }));
        return;
      }
      adok = await this._netLeker(n);
      if (most !== kulcs(this._net)) return;
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
      const sor = { q: { ful: n.ful, tag: n.tag, keres: nev }, adok };
      lista.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { this._netSorAllit(sor); this._netIndit(adok[Number(b.dataset.i)]); }));
      lista.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => this._netGombra(adok[Number(b.dataset.g)])));
    } catch (err) {
      if (most === kulcs(this._net)) lista.innerHTML = `<div class="puzenet">${T("A Radio Browser most nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`;
    }
  }

  // a Radio Browser egy listája (keresés, ország, világ, műfaj) a NET-panel és a gíró kerék közös szűrésével
  async _netLeker(n) {
    const q = "hidebroken=true&order=clickcount&reverse=true&limit=60", nev = (n.keres || "").trim();
    let adok;
    if (nev.length >= 2) adok = await this._rb(`/json/stations/search?name=${encodeURIComponent(nev)}&${q}`);
    else if (n.ful === "mufaj" && n.tag) adok = await this._rb(`/json/stations/search?tag=${encodeURIComponent(n.tag)}&tagExact=true&${q}`);
    else if (n.ful === "vilag") adok = await this._rb(`/json/stations/search?${q}`);
    else adok = await this._rb(`/json/stations/search?countrycode=${this._orszag()}&${q}`);
    // a HLS (.m3u8) adókat a Sonos nem játssza; az azonos nevű és című ismétlődések kiesnek
    const latott = new Set();
    return adok.filter((t) => {
      const u = t.url_resolved || t.url, k = `${(t.name || "").trim().toLowerCase()}|${CIM(u)}`;
      if (!u || t.hls || /\.m3u8(\?|$)/i.test(u) || latott.has(k)) return false;
      latott.add(k); return true;
    }).slice(0, 40);
  }

  // a lista, amelyből a szóló NET-adó jött: ezen lép a gíró kerék (oldalfrissítés után a lekérdezésből újra betölti)
  // A lista helyben is megmarad (egy napig friss): a kerék azonnal indul, és akkor is működik, ha a Radio Browser épp nem érhető el
  _netSorAllit(sor) {
    this._netSor = sor;
    const adok = sor.adok.map(({ name, url, url_resolved, favicon, countrycode, codec, bitrate, tags, stationuuid }) => ({ name, url, url_resolved, favicon, countrycode, codec, bitrate, tags, stationuuid }));
    TAR.ir("tablet-radio-netsor", JSON.stringify({ ...sor.q, adok, ido: Date.now() }));
  }

  async _netSorKell() {
    if (this._netSor?.adok?.length) return this._netSor;
    const { adok: tarolt, ido, ...q } = TAR.json("tablet-radio-netsor") || { ful: "hu" };
    if (tarolt?.length && Date.now() - (ido || 0) < 86400000) return (this._netSor = { q, adok: tarolt });
    try {
      const adok = await this._netLeker(q);
      if (adok.length) this._netSorAllit({ q, adok });
    } catch (e) {
      if (!tarolt?.length) throw e;
      this._netSor = { q, adok: tarolt };
    }
    return this._netSor;
  }

  // gíró kerék NET-adón: a lista következő / előző adója; a kijelző mutatja, megállás után (vagy elengedéskor) szól
  _netGiroLep(d) {
    const sr = this.shadowRoot;
    if (!this._netGiro) {
      const ra = this._radioAll, k = ra?.szol ? (ra.i === KULSO ? this._kulso() : this._config.adok[ra.i]) : null;
      this._netGiro = { lep: 0, i: null };
      sr.getElementById("elo").classList.add("kezi");
      this._netSorKell().then((sor) => {
        const g = this._netGiro; if (!g) return;
        if (!sor) { this._netGiro = null; sr.getElementById("elo").classList.remove("kezi"); this._frissit(); return this._uzen(T("A Radio Browser most nem érhető el.")); }
        const c = k ? [CIM(k.url), k.alias].filter(Boolean) : [];
        g.i0 = sor.adok.findIndex((t) => c.includes(CIM(t.url_resolved || t.url)));
        g.i = g.i0 < 0 && g.lep > 0 ? g.lep - 1 : g.i0 + g.lep;
        g.i = ((g.i % sor.adok.length) + sor.adok.length) % sor.adok.length;
        this._netGiroRajz();
        if (g.vege) this._netGiroVege();
      }, () => { this._netGiro = null; sr.getElementById("elo").classList.remove("kezi"); this._frissit(); this._uzen(T("A Radio Browser most nem érhető el.")); });
    }
    const g = this._netGiro;
    g.vege = false; clearTimeout(this._netGiroIdo);
    if (g.i == null) { g.lep += d; return this._netGiroRajz(); }
    const n = this._netSor.adok.length;
    g.i = (((g.i + d) % n) + n) % n;
    this._netGiroRajz();
  }

  _netGiroRajz() {
    const g = this._netGiro, sr = this.shadowRoot;
    if (!g || !sr) return;
    // a lista még töltődik
    if (g.i == null) { sr.getElementById("ado").innerHTML = "<b>NET</b> · Radio Browser…"; sr.getElementById("cim").textContent = ""; return; }
    const l = this._netSor.adok, t = l[g.i], [a, b] = this._sav || SAVOK.std;
    sr.getElementById("mutato").style.left = `${this._poz(a + ((g.i + 0.5) / l.length) * (b - a))}%`;
    sr.getElementById("ado").innerHTML = `<b>${ESC((t.name || "").trim())}</b> · NET${t.countrycode ? ` · ${ESC(t.countrycode)}` : ""} · ${g.i + 1}/${l.length}`;
    sr.getElementById("cim").textContent = [[t.codec, t.bitrate ? `${t.bitrate} kbps` : ""].filter(Boolean).join(" "), (t.tags || "").split(",").filter(Boolean).slice(0, 3).join(", ")].filter(Boolean).join(" · ");
  }

  // elengedés / görgetés vége: ha másik adón áll, rövid szünet után indítja; ha visszaért a szólóra, csak visszaáll
  _netGiroVege(kesik = 900) {
    const g = this._netGiro; if (!g) return;
    if (g.i == null) { g.vege = true; return; }
    clearTimeout(this._netGiroIdo);
    this._netGiroIdo = setTimeout(() => {
      const t = g.i !== g.i0 ? this._netSor.adok[g.i] : null;
      this._netGiro = null; this.shadowRoot.getElementById("elo").classList.remove("kezi");
      if (t) this._netIndit(t); else this._frissit();
    }, kesik);
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
    try { await this._hiv("media_player", "play_media", { entity_id: hsz.entity, media_content_id: cim, media_content_type: "music" }); this._inditasFigyel(hsz, k.nev); }
    catch (err) { this._kezi = null; this._uzen(T("A(z) {h} nem tudta lejátszani: {e}", { h: KN(hsz), e: err?.message || err })); }
    // a Radio Browser népszerűségi számlálója (az adatbázis kéri lejátszáskor)
    if (kattint && t.stationuuid) this._rb(`/json/url/${t.stationuuid}`).catch(() => {});
    this._frissit();
  }

  _netGombra(t) {
    this._netZar(); this._beallNyit();
    const f = this._savFrek(t.name);
    this._szerk.adok.push({ nev: (t.name || "").trim(), frekvencia: f, url: t.url_resolved || t.url });
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
    if (!eszk) throw new Error(T("A(z) {h} nem szerepel a Spotify Connect-eszközök között (nyisd meg rajta egyszer a Spotify appot, vagy add meg a nevét: spotify_device).", { h: KN(hsz) }) + " " + T("Lejátszható: {l}.", { l: this._kepesek(kaz, hsz) }));
    const uri = kaz.uri || kaz.id;
    // ha már ezen az eszközön van a lejátszás, nem kell (és listából hiányzó eszközre nem is lehet) átváltani
    if (this._hass.states[sp]?.attributes?.source !== eszk) await this._hiv("media_player", "select_source", { entity_id: sp, source: eszk });
    await this._hiv("media_player", "play_media", { entity_id: sp, media_content_id: uri, media_content_type: kaz.mtype || (String(uri).split(":")[1] || "playlist") });
    this._inditasFigyel(hsz, kaz.cim, kaz);
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
  // WiiM (a HA wiim-integrációja): a WiiM Home appban bármelyik zenei szolgáltatásból mentett presetek kazettaként
  _wiim(h) { return !!h && h.entity !== HELYI && this._hass?.entities?.[h.entity]?.platform === "wiim"; }

  async _wiimPresetek(cel) {
    const r = await this._hass.callWS({ type: "media_player/browse_media", entity_id: cel.entity, media_content_id: "wiim_library/library_root/favorites", media_content_type: "playlist" });
    return (r.children || []).filter((x) => x.can_play).map((x) => ({ cim: x.title, alcim: T("WiiM-preset {n}", { n: x.media_content_id }), forras: "stream", tipus: "wiim_preset", id: String(x.media_content_id), kep: x.thumbnail || null }));
  }

  // ---- KERESÉS fül: egy keresőmező, minden forrásban egyszerre (NAS, Deezer, Spotify, WiiM-presetek, Sonos-kedvencek, rádiók).
  // Az azonos album / szám egy sorba kerül, címkékkel, hogy honnan érhető el; koppintásra az ezen a hangszórón szóló
  // legjobb forrásból indul (a NAS mindenhol szól), a címkére koppintva abból; ha sehol nem szól itt, megmondja, hol igen.
  _forrasSzol(forras, hsz) {
    if (forras === "nas" || forras === "radio") return true;
    if (!hsz || hsz.entity === HELYI) return false;
    if (forras === "wiim") return this._wiim(hsz);
    if (forras === "spotify") return hsz.mod === "sonos" || !!(this._stream?.spotify_entity && this._spotifyEszkoz(hsz));
    return hsz.mod === "sonos";                                  // deezer, sonos-kedvenc
  }

  async _mindRajz(lista) {
    const pl = this._polc, kerdes = (pl.keres || "").trim(), hsz = this._hangszoro();
    if (KERES_NORM(kerdes).length < 2) {
      lista.innerHTML = `<div class="puzenet">${T("Írd be, mit keresel – egyszerre keres a zenemappában, a Deezeren, a Spotifyn, a WiiM-presetek, a kedvencek és a rádiók között.")}</div>`;
      return;
    }
    lista.innerHTML = `<div class="puzenet">${T("Keresés mindenhol…")}</div>`;
    const szavak = KERES_NORM(kerdes).split(/\s+/).filter(Boolean), illik = (t) => { const k = KERES_NORM(t); return szavak.every((w) => k.includes(w)); };
    const kulcs = (...t) => t.map((x) => KERES_NORM(String(x || "").replace(/\[[^\]]*\]|\([^)]*\)/g, " ")).replace(/[^\p{L}\p{N}]+/gu, "") || String(x || "")).join("|");
    const nas = this._config.magno?.nas, q = encodeURIComponent(kerdes), orszag = this._orszag();
    const wiimCel = this._wiim(hsz) ? hsz : this._kimenetek.find((h) => this._wiim(h));
    const kerdesek = {
      nas: nas && HELYI_TAR(nas) ? this._nasLista() : null,
      dz: this._config.deezer !== false && this._vanSonos() ? Promise.all(["album&limit=12", "track&limit=15", "artist&limit=6"].map((t) => this._dz(`/search/${t.split("&")[0]}?q=${q}&${t.split("&")[1]}`))) : null,
      sp: this._szolgLatszik("spotify") ? this._hass.callWS({ type: "cantabile/spotify", ut: `/search?q=${q}&type=artist,album,track&limit=8&market=${orszag}` }) : null,
      wiim: wiimCel ? this._wiimPresetek(wiimCel) : null,
      kedv: this._vanSonos() ? this._streamKazettak() : null,
      rb: this._rb(`/json/stations/search?name=${q}&limit=8&hidebroken=true&order=clickcount&reverse=true`),
    };
    // a lassú forrás (pl. elérhetetlen Radio Browser) ne tartsa fel a többit: forrásonként legfeljebb 6 mp
    const korlat = (pr) => Promise.race([pr, new Promise((_, nem) => setTimeout(() => nem(new Error("timeout")), 6000))]);
    const nevek = Object.keys(kerdesek), eredm = await Promise.allSettled(nevek.map((k) => (kerdesek[k] ? korlat(kerdesek[k]) : Promise.resolve(null))));
    if (this._polc !== pl || pl.ful !== "mind" || (pl.keres || "").trim() !== kerdes) return;
    const v = Object.fromEntries(nevek.map((k, i) => [k, eredm[i].status === "fulfilled" ? eredm[i].value : null]));
    const hibak = nevek.filter((k, i) => kerdesek[k] && eredm[i].status === "rejected").map((k) => ({ nas: T("Zenemappa"), dz: "Deezer", sp: "Spotify", wiim: "WiiM", kedv: T("Sonos kedvencek"), rb: "Radio Browser" })[k]);

    // összefésülés: kulcs = előadó + cím; forrásonként egy kazetta (a NAS-számnál az albuma, ettől a számtól)
    const albumok = new Map(), szamok = new Map(), eloadok = new Map();
    const tesz = (tar, k, alap, forras, kaz) => { if (!tar.has(k)) tar.set(k, { ...alap, f: {} }); const x = tar.get(k); if (!x.f[forras]) x.f[forras] = kaz; if (!x.kep && kaz.kep) x.kep = kaz.kep; };
    if (v.nas) {
      const MAX = 25;
      v.nas.m.filter((x) => !x.rel.includes("/") && illik(x.nev)).slice(0, 6).forEach((x) => tesz(eloadok, kulcs(x.nev), { cim: x.nev }, "nas", { ut: [{ id: `${nas}/${x.rel}`, cim: x.nev }] }));
      // a mappanévből a tiszta albumcím: „(1978) Dire Straits - Dire Straits [16Bit-44.1kHz]” → „Dire Straits” (1978)
      const albumNev = (nev, el) => {
        // évszám: „(1979)” vagy a név elején „1979 - ” (1900–2039); a „2050 Before the Massacre” nem év
        const evM = /\(((?:19\d|20[0-3])\d)\)/.exec(nev) || /^\s*((?:19\d|20[0-3])\d)\s*[-–.]\s/.exec(nev), ev = evM ? evM[1] : "";
        let c = nev.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/^\s*(?:19\d|20[0-3])\d\s*[-–.]\s+/, "").replace(/\s+/g, " ").trim();
        if (el && KERES_NORM(c).startsWith(KERES_NORM(el) + " ") && / [-–] /.test(c)) c = c.replace(/^.*? [-–] /, "");
        return { c: c || nev, ev };
      };
      v.nas.m.filter((x) => x.rel.includes("/") && illik(x.rel)).slice(0, MAX).forEach((x) => {
        const el = x.rel.split("/")[0], { c, ev } = albumNev(x.nev, el);
        tesz(albumok, kulcs(el, c), { cim: c, al: [el, ev].filter(Boolean).join(" · ") }, "nas", { cim: c, alcim: el, forras: "nas", id: `${nas}/${x.rel}` });
      });
      v.nas.f.filter((x) => illik(x.rel)).slice(0, MAX).forEach((x) => {
        const t = x.rel.split("/"), el = t[0], alb = t.length > 2 ? albumNev(t[t.length - 2], el).c : "", cim = x.nev.replace(/^\s*\d{1,3}[\s.\-_]+/, "");
        tesz(szamok, kulcs(el, cim), { cim, al: [el, alb].filter(Boolean).join(" · ") }, "nas", { nasSzam: x.rel });
      });
    }
    if (v.dz) {
      const [aa, sa, ea] = v.dz;
      (ea?.data || []).filter((x) => illik(x.name)).forEach((x) => tesz(eloadok, kulcs(x.name), { cim: x.name }, "deezer", { ut: [{ id: String(x.id), cim: x.name, kep: x.picture_medium }], kep: x.picture_medium }));
      (aa?.data || []).filter((x) => illik(`${x.artist?.name} ${x.title}`)).forEach((x) => tesz(albumok, kulcs(x.artist?.name, x.title), { cim: x.title, al: x.artist?.name || "" }, "deezer", { cim: x.title, alcim: x.artist?.name || "", forras: "stream", tipus: "deezer", id: x.link, kep: x.cover_medium || null }));
      (sa?.data || []).filter((x) => illik(`${x.artist?.name} ${x.title} ${x.album?.title}`)).forEach((x) => tesz(szamok, kulcs(x.artist?.name, x.title), { cim: x.title, al: [x.artist?.name, x.album?.title].filter(Boolean).join(" · ") }, "deezer",
        { cim: x.album?.title || x.title, alcim: x.artist?.name || "", forras: "stream", tipus: "deezer", id: `https://www.deezer.com/album/${x.album?.id}`, kep: x.album?.cover_medium || null, dzSzam: x.id, dzAlbum: x.album?.id }));
    }
    if (v.sp) {
      const sp = (tip, id) => ({ id: `https://open.spotify.com/${tip}/${id}`, uri: `spotify:${tip}:${id}`, mtype: tip, forras: "stream", tipus: "spotify" });
      (v.sp.artists?.items || []).filter((x) => illik(x.name)).forEach((x) => tesz(eloadok, kulcs(x.name), { cim: x.name }, "spotify", { ut: [{ id: x.id, cim: x.name }], kep: x.images?.[1]?.url || null }));
      (v.sp.albums?.items || []).filter((x) => illik(`${x.artists?.[0]?.name} ${x.name}`)).forEach((x) => tesz(albumok, kulcs(x.artists?.[0]?.name, x.name), { cim: x.name, al: x.artists?.[0]?.name || "" }, "spotify", { cim: x.name, alcim: x.artists?.[0]?.name || "", kep: x.images?.[1]?.url || x.images?.[0]?.url || null, ...sp("album", x.id) }));
      (v.sp.tracks?.items || []).filter((x) => illik(`${x.artists?.[0]?.name} ${x.name} ${x.album?.name}`)).forEach((x) => tesz(szamok, kulcs(x.artists?.[0]?.name, x.name), { cim: x.name, al: [x.artists?.[0]?.name, x.album?.name].filter(Boolean).join(" · ") }, "spotify", { cim: x.name, alcim: x.artists?.[0]?.name || "", kep: x.album?.images?.[1]?.url || null, ...sp("track", x.id) }));
    }
    const presetek = [...(v.wiim || []).filter((k) => illik(k.cim)).map((k) => ({ k, f: "wiim" })), ...(v.kedv || []).filter((k) => illik(k.cim)).map((k) => ({ k, f: "sonos" }))];
    const adok = [...this._config.adok.map((a, i) => ({ a, i })).filter((x) => illik(x.a.nev) || illik(x.a.rovid || "")).map((x) => ({ cim: x.a.nev, al: x.a.virt ? "WEB" : `${MHZ(x.a.frekvencia)} MHz`, sajat: x.i })),
      ...(v.rb || []).filter((t) => t.url_resolved || t.url).map((t) => ({ cim: (t.name || "").trim(), al: [t.countrycode, t.codec, t.bitrate ? `${t.bitrate} kbps` : ""].filter(Boolean).join(" · "), rb: t }))];

    const SORREND = ["nas", "deezer", "spotify", "wiim", "sonos"], CIMKE = { nas: "NAS", deezer: "DEEZER", spotify: "SPOTIFY", wiim: "WIIM", sonos: "SONOS" };
    const cimkek = (x) => SORREND.filter((f) => x.f[f]).map((f) => `<span class="fchip${this._forrasSzol(f, hsz) ? " ok" : ""}" data-f="${f}">${CIMKE[f]}</span>`).join("");
    const MAXS = 20, eL = [...eloadok.values()].slice(0, 10), aL = [...albumok.values()].slice(0, MAXS), sL = [...szamok.values()].slice(0, MAXS);
    const csoport = (cim, db, belso) => db ? `<h5 class="kcsop">${cim}<span>${db}</span></h5>${belso}` : "";
    const sor = (t, i, x) => `<div class="ktsor mindsor"><button data-${t}="${i}"><b>${ESC(x.cim)}</b><small>${ESC(x.al || "")}</small></button><span class="fchipek" data-${t}c="${i}">${cimkek(x)}</span></div>`;
    lista.innerHTML = (hibak.length ? `<div class="puzenet">${T("Nem érhető el most: {h}", { h: hibak.join(", ") })}</div>` : "")
      + ((eL.length + aL.length + sL.length + adok.length + presetek.length === 0) ? `<div class="puzenet">${T("Nincs találat erre: „{q}”.", { q: ESC(kerdes) })}</div>`
      : csoport("ARTISTS", eL.length, `<div class="eloadok">${eL.map((x, i) => `<button data-e="${i}">${ESC(x.cim)} <small>${SORREND.filter((f) => x.f[f]).map((f) => CIMKE[f]).join(" · ")}</small></button>`).join("")}</div>`)
        + csoport("ALBUMS", aL.length, `<div class="ktalal">${aL.map((x, i) => sor("a", i, x)).join("")}</div>`)
        + csoport("TRACKS", sL.length, `<div class="ktalal">${sL.map((x, i) => sor("s", i, x)).join("")}</div>`)
        + csoport(T("RÁDIÓK"), adok.length, `<div class="ktalal">${adok.map((x, i) => `<div class="ktsor"><button data-r="${i}"><b>${ESC(x.cim)}</b><small>${ESC(x.al)}</small></button></div>`).join("")}</div>`)
        + csoport("PRESETS", presetek.length, `<div class="kazettak">${presetek.map((x, i) => this._kazettaCsempe(x.k, i)).join("")}</div>`));
    lista.scrollTop = 0;

    // indítás: a megadott forrásból, vagy az ezen a hangszórón szóló első forrásból; ha egyik sem szól itt, megmondja, hol
    const indit = async (x, forras) => {
      const hsz = this._hangszoro();                              // közben válthatott hangszórót
      const valaszt = forras || SORREND.find((f) => x.f[f] && this._forrasSzol(f, hsz));
      if (!valaszt) {
        const hol = SORREND.filter((f) => x.f[f]).map((f) => `${CIMKE[f]}: ${this._kepesek({ forras: "stream", tipus: f === "wiim" ? "wiim_preset" : f })}`).join(" · ");
        const kepes = this._kimenetek.filter((h) => h !== hsz && !h.tagok && h.entity !== HELYI && this._hass?.states[h.entity]?.state !== "unavailable" && SORREND.some((f) => x.f[f] && this._forrasSzol(f, h)));
        return this._uzen(T("A(z) {h} hangszórón ez egyik forrásból sem szól – {l}.", { h: KN(hsz), l: hol }), this._valtGombok(kepes, () => indit(x)));
      }
      const kaz = x.f[valaszt];
      if (kaz.nasSzam) {
        const t = kaz.nasSzam.split("/"), mappa = t.slice(0, -1).join("/"), id = mappa ? `${nas}/${mappa}` : nas, fajl = `${nas}/${kaz.nasSzam}`;
        let sz;
        try { sz = await this._albumSzamok(id); } catch (err) { return this._uzen(T("A zenemappa nem olvasható: {h}", { h: err?.message || err })); }
        let kezdo = sz.findIndex((y) => y === fajl || SAFE_DECODE(y) === fajl);
        if (kezdo < 0) kezdo = sz.findIndex((y) => SAFE_DECODE(y).endsWith(`/${t[t.length - 1]}`));
        this._polcZar();
        return this._betolt({ cim: mappa ? mappa.split("/").pop() : "NAS", alcim: mappa ? mappa.split("/")[0] : "", forras: "nas", id, szamok: sz.length ? sz : [fajl] }, Math.max(0, kezdo));
      }
      let kezdo = 0;
      if (kaz.dzSzam && kaz.dzAlbum) { try { kezdo = Math.max(0, ((await this._dz(`/album/${kaz.dzAlbum}/tracks?limit=200`)).data || []).findIndex((t) => t.id === kaz.dzSzam)); } catch (e) { /* az album elejéről */ } }
      this._polcZar();
      return this._betolt(kaz, kezdo);
    };
    const elem = { a: aL, s: sL };
    lista.querySelectorAll("[data-a], [data-s]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.a != null ? "a" : "s"; indit(elem[k][Number(b.dataset[k])]); }));
    lista.querySelectorAll(".fchipek .fchip").forEach((c) => c.addEventListener("click", () => {
      const sz = c.parentElement, k = sz.dataset.ac != null ? "a" : "s"; indit(elem[k][Number(sz.dataset[`${k}c`])], c.dataset.f);
    }));
    lista.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => {
      // előadó: a zenemappában ha ott van, különben a Deezer / Spotify előadó-oldala
      // az ELŐADÓK közös lapja (zenemappa + Music Assistant + Deezer); csak Spotify-találatnál a Spotify előadó-oldala
      const x = eL[Number(b.dataset.e)];
      pl.vissza = { ful: "mind", keres: kerdes };                  // a „‹ Vissza” ide hoz vissza
      if (!x.f.nas && !x.f.deezer && x.f.spotify) { pl.ful = "spotify"; pl.ut = x.f.spotify.ut; pl.dzKeres = ""; pl.keres = ""; return this._polcRajz(); }
      const sajat = this._eloTar?.l.find((y) => y.kulcs === KERES_NORM(x.cim).trim());
      const nasUt = x.f.nas?.ut?.[0], dzUt = x.f.deezer?.ut?.[0];
      pl.ful = "eloado"; pl.keres = "";
      pl.ut = [{ id: `e:${KERES_NORM(x.cim).trim()}`, cim: x.cim, nas: nasUt?.id || sajat?.nas, ma: sajat?.ma, dz: dzUt?.id, kep: x.kep || sajat?.kep || null }];
      this._polcRajz();
    }));
    lista.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => {
      const x = adok[Number(b.dataset.r)]; this._polcZar();
      if (this._mod !== "radio") { this._mod = "radio"; TAR.ir("tablet-radio-mod", "radio"); this._frissit(); this._igazitKesobb(); }
      if (x.sajat != null) this._hangol(x.sajat); else this._netIndit(x.rb);
    }));
    lista.querySelectorAll(".kazettak .kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(presetek[Number(b.dataset.i)].k); }));
  }

  async _wiimRajz(lista) {
    const pl = this._polc, hsz = this._hangszoro();
    const cel = this._wiim(hsz) ? hsz : this._kimenetek.find((h) => this._wiim(h));
    if (!cel) { lista.innerHTML = `<div class="puzenet">${T("Nincs WiiM a hangszórók között.")}</div>`; return; }
    lista.innerHTML = `<div class="puzenet">${T("Betöltés…")}</div>`;
    let kaz;
    try { kaz = await this._wiimPresetek(cel); }
    catch (err) { lista.innerHTML = `<div class="puzenet">${T("A WiiM-presetek nem olvashatók: {h}", { h: ESC(err?.message || err) })}</div>`; return; }
    if (this._polc !== pl || pl.ful !== "wiim") return;
    lista.innerHTML = (this._wiim(hsz) ? "" : `<div class="puzenet">${T("A WiiM-presetek a(z) {h} hangszórón szólnak – válts rá.", { h: ESC(KN(cel)) })}</div>`)
      + (kaz.length ? `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : "")
      + `<div class="puzenet">${kaz.length ? "" : T("Még nincs WiiM-preset.") + " "}${T("Presetet a WiiM Home appban menthetsz – bármelyik zenei szolgáltatásból (Tidal, Qobuz, Amazon, Deezer, rádió…).")}</div>`;
    lista.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.i)]); }));
  }

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
    // WiiM saját sora (pl. presetből vagy a WiiM appból indított album): a HA wiim-integrációjának böngészőjéből
    if (this._wiim(hsz)) {
      const cimek = this._wiimSorCimek?.[hsz.entity] || [], akt = cimek.indexOf(a.media_title || "");
      // a sor csak akkor töltődik újra, ha a szóló szám nincs a listában (új preset / album), nem minden számváltáskor
      return { mod: "wiimsor", hsz, kulcs: `wiimsor|${hsz.entity}|${cimek.length}|${akt < 0 ? a.media_title || "" : ""}`, akt };
    }
    return { mod: "nincs", hsz };
  }

  async _sorRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const mh = this._hangszoro()?.entity;
    if (this._maLejatszo(mh) && this._maSorSzol(mh)) return this._maSorRajz(lista, mh);
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
      } else if (f.mod === "wiimsor") {
        const v = await this._hass.callWS({ type: "media_player/browse_media", entity_id: f.hsz.entity, media_content_id: "wiim_library/library_root/playlists", media_content_type: "playlist" });
        elemek = (v.children || []).map((x) => ({ cim: x.title || T("(cím nélkül)"), al: "", idx: x.media_content_id }));
        this._wiimSorCimek = { ...(this._wiimSorCimek || {}), [f.hsz.entity]: elemek.map((e) => e.cim) };
        if (!elemek.length) { lista.innerHTML = `<div class="puzenet">${T("A(z) {h} hangszórón most nincs lejátszási sor. Tegyél be egy kazettát.", { h: ESC(KN(f.hsz)) })}</div>`; return; }
      } else {
        const szamok = f.mod === "helyi" ? this._helyiLista.szamok : f.kaz.szamok;
        const kiir = (id) => this._helyiNevek?.get(id) || FAJLNEV(id);
        elemek = szamok.map((id) => ({ cim: kiir(id), al: f.mod === "wiim" ? f.kaz.cim || "" : "" }));
      }
    } catch (err) {
      lista.innerHTML = `<div class="puzenet">${T("A sor nem olvasható: {h}", { h: ESC(err?.message || err) })}</div>`; return;
    }
    if (this._polc !== pl || pl.ful !== "sor") return;
    pl.sor = { kulcs: f.mod === "wiimsor" ? this._sorForras().kulcs : f.kulcs, db: elemek.length, elemek };
    const kevert = !!this._hass?.states[f.vez || ""]?.attributes?.shuffle, szerk = f.mod === "sonos";
    // húzással átrendezhető: Sonoson (keverés nélkül – ott a sor sorrendje nem a lejátszásé), WiiM-en és BT-n
    const huz = elemek.length > 1 && !(szerk && kevert) && f.mod !== "wiimsor";
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
      else if (f.mod === "wiimsor") await this._hiv("media_player", "play_media", { entity_id: f.hsz.entity, media_content_id: String(this._polc?.sor?.elemek?.[i]?.idx ?? i), media_content_type: "track" });
    } catch (err) { this._uzen(T("Nem sikerült a számra ugrani: {h}", { h: err?.message || err })); }
  }

  async _polcRajz() {
    const p = this.shadowRoot.getElementById("polc"), pl = this._polc;
    if (!pl) return;
    p.hidden = false;
    const nasGyoker = this._config.magno?.nas;
    const szolg = ["spotify", "tidal"].includes(pl.ful), szolgNev = pl.ful === "spotify" ? "Spotify" : "Tidal";
    const ut = pl.ful === "eloado" ? (pl.ut.length ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut.map((x) => x.cim).join(" › "))}`
        : `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Előadó keresése…")}" value="${ESC(pl.keres || "")}">`)
      : (pl.ful === "nas" || pl.ful === "deezer" || szolg) && pl.ut.length
      ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut.map((x) => x.cim).join(" › "))}`
      : pl.ful === "sor" ? ""
      : pl.ful === "party" ? T("Végtelen keverés · vendégkívánságok")
      : pl.ful === "listak" ? (pl.ut.length ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut[0].cim)}` : T("Listák"))
      : pl.ful === "mufaj" ? (pl.ut.length ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut[0].cim)}` : T("Műfajok"))
      : pl.ful === "mind" ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés mindenhol…")}" value="${ESC(pl.keres || "")}">`
      : pl.ful === "wiim" ? T("WiiM-presetek")
      : pl.ful === "ma" ? (pl.ut.length ? `<button data-vissza>${T("‹ Vissza")}</button>${ESC(pl.ut[pl.ut.length - 1].cim)}` : `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés a Music Assistantban…")}" value="${ESC(pl.keres || "")}">`)
      : pl.ful === "deezer" ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés a Deezeren…")}" value="${ESC(pl.keres || "")}">`
      : szolg ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés: {s}…", { s: szolgNev })}" value="${ESC(pl.keres || "")}">`
      : nasGyoker ? `<input class="pkeres" id="pkeres" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T("Keresés a zenemappában…")}" value="${ESC(pl.keres || "")}">`
      : (pl.ful === "tel" ? T("Saját zene") : pl.ful === "nas" ? T("Zenemappa") : T("Sonos kedvencek"));
    const forrasok = this._polcForrasok(), forrasban = forrasok.includes(pl.ful);
    p.innerHTML = `
      <div class="uzfej"><i></i>CANTABILE · LIBRARY</div>
      <div class="pfej">
        <button class="pful ${pl.ful === "mind" ? "akt" : ""}" data-ful="mind">${T("KERESÉS")}</button>
        <button class="pful ${pl.ful === "eloado" ? "akt" : ""}" data-ful="eloado">${T("ELŐADÓK")}</button>
        ${nasGyoker || this._config.deezer !== false ? `<button class="pful ${pl.ful === "mufaj" ? "akt" : ""}" data-ful="mufaj">${T("MŰFAJOK")}</button>` : ""}
        ${nasGyoker ? `<button class="pful ${pl.ful === "party" ? "akt" : ""}" data-ful="party">PARTY</button>` : ""}
        <button class="pful ${pl.ful === "listak" ? "akt" : ""}" data-ful="listak">${T("LISTÁK")}</button>
        <button class="pful ${forrasban ? "akt" : ""}" data-ful="forras">${T("FORRÁSOK")}<i class="pnyil"></i></button>
        <button class="pful ${pl.ful === "sor" ? "akt" : ""}" data-ful="sor">QUEUE</button>
        <div class="put">${ut}</div>
        <button class="pzar" title="${T("Bezár")}">×</button>
      </div>
      ${forrasban ? `<div class="pforras">
        ${this._vanSonos() ? `<button class="pful ${pl.ful === "stream" ? "akt" : ""}" data-ful="stream">STREAMING</button>` : ""}
        ${this._config.deezer !== false && this._vanSonos() ? `<button class="pful ${pl.ful === "deezer" ? "akt" : ""}" data-ful="deezer">DEEZER</button>` : ""}
        ${this._szolgLatszik("spotify") ? `<button class="pful ${pl.ful === "spotify" ? "akt" : ""}" data-ful="spotify" title="${T("kísérleti")}">SPOTIFY<sup>β</sup></button>` : ""}
        ${this._szolgLatszik("tidal") ? `<button class="pful ${pl.ful === "tidal" ? "akt" : ""}" data-ful="tidal" title="${T("kísérleti")}">TIDAL<sup>β</sup></button>` : ""}
        ${this._kimenetek.some((h) => this._wiim(h)) ? `<button class="pful ${pl.ful === "wiim" ? "akt" : ""}" data-ful="wiim">WIIM</button>` : ""}
        ${this._maInfo?.available ? `<button class="pful ${pl.ful === "ma" ? "akt" : ""}" data-ful="ma" title="Music Assistant">MA</button>` : ""}
        <button class="pful ${pl.ful === "nas" ? "akt" : ""}" data-ful="nas">NAS</button>
        <button class="pful ${pl.ful === "tel" ? "akt" : ""}" data-ful="tel">PHONE</button>
      </div>` : ""}
      <div class="ptest"><div class="plista"><div class="puzenet">${T("Betöltés…")}</div></div></div>`;
    p.querySelectorAll(".pfej .pful, .pforras .pful").forEach((b) => b.addEventListener("click", () => {
      let f = b.dataset.ful;
      // FORRÁSOK: a legutóbb használt forrás (vagy az első) nyílik, alatta a többi forrás sora
      if (f === "forras") { const t = TAR.olvas("tablet-magno-forras"); f = forrasok.includes(t) ? t : forrasok.includes("nas") ? "nas" : forrasok[0]; }
      if (forrasok.includes(f)) TAR.ir("tablet-magno-forras", f);
      pl.vissza = null; pl.ful = f; pl.ut = []; pl.keres = ""; if (pl.ful !== "sor") TAR.ir("tablet-magno-ful", pl.ful); this._polcRajz();
    }));
    p.querySelector(".pzar").addEventListener("click", () => this._polcZar());
    p.querySelector("[data-vissza]")?.addEventListener("click", () => {
      pl.ut.pop();
      if (!pl.ut.length && pl.vissza) { Object.assign(pl, pl.vissza); pl.vissza = null; }   // a KERESÉS találataihoz
      else if ((pl.ful === "deezer" || szolg) && !pl.ut.length) pl.keres = pl.dzKeres || "";
      this._polcRajz();
    });
    const lista = p.querySelector(".plista");
    const kereso = p.querySelector("#pkeres");
    if (kereso) {
      // gépelés közben csak a találati lista frissül (a mező és a billentyűzet marad)
      kereso.addEventListener("input", () => {
        pl.keres = kereso.value; clearTimeout(this._keresIdo);
        this._keresIdo = setTimeout(() => (pl.ful === "eloado" ? this._eloadoRajz(lista) : pl.ful === "mind" ? this._mindRajz(lista) : pl.ful === "ma" ? this._maRajz(lista) : KERES_NORM(pl.keres).length >= 2 ? (pl.ful === "deezer" ? this._deezerRajz(lista) : szolg ? this._szolgRajz(lista, pl.ful) : this._keresRajz(lista)) : this._polcRajz()), pl.ful === "deezer" || szolg || pl.ful === "mind" || pl.ful === "ma" ? 450 : 180);
      });
      kereso.addEventListener("keydown", (e) => { if (e.key === "Enter") kereso.blur(); });
      this._mikHozza(kereso);
    }
    if (pl.ful === "mind") return this._mindRajz(lista);
    if (pl.ful === "eloado") return this._eloadoRajz(lista);
    if (pl.ful === "party") return this._partyRajz(lista);
    if (pl.ful === "listak") return this._listakRajz(lista);
    if (pl.ful === "ma") return this._maRajz(lista);
    if (pl.ful === "deezer") return this._deezerRajz(lista);
    if (szolg) return this._szolgRajz(lista, pl.ful);
    if (KERES_NORM(pl.keres || "").length >= 2 && !(pl.ful === "nas" && pl.ut.length)) return this._keresRajz(lista);
    const kulcs = (x) => JSON.stringify([x?.ful, x?.ut.map((y) => y.id), KERES_NORM(x?.keres || "").length >= 2 && !x?.ut.length]);
    const allapot = kulcs(pl);
    try {
      if (pl.ful === "tel") return this._telRajz(lista);
      if (pl.ful === "sor") return this._sorRajz(lista);
      if (pl.ful === "wiim") return this._wiimRajz(lista);
      if (pl.ful === "mufaj") return this._mufajRajz(lista);
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

  // a FORRÁSOK alatti fülek (amelyik ezen a kártyán értelmes)
  _polcForrasok() {
    return [...(this._vanSonos() ? ["stream", ...(this._config.deezer !== false ? ["deezer"] : [])] : []), ...["spotify", "tidal"].filter((x) => this._szolgLatszik(x)),
      ...(this._kimenetek.some((h) => this._wiim(h)) ? ["wiim"] : []), ...(this._maInfo?.available ? ["ma"] : []), "nas", "tel"];
  }

  _dzLehet() { return this._config.deezer !== false && this._vanSonos(); }

  // ---- ELŐADÓK: a zenemappa (előadó/album/szám) és a Music Assistant előadói egy névsorban; az előadó lapja minden forrásból ----
  async _eloadoIndex() {
    const t = this._eloTar;
    if (t && Date.now() - t.ido < 300000) return t.l;
    const nas = this._config.magno?.nas, m = new Map();
    const tesz = (nev, adat) => {
      const k = KERES_NORM(nev).trim(); if (!k) return;
      const x = m.get(k) || { nev: String(nev).trim(), kulcs: k };
      m.set(k, Object.assign(x, adat, { kep: x.kep || adat.kep || null }));
    };
    const [nr, mr] = await Promise.all([nas ? this._bongesz(nas).catch(() => null) : null, this._maInfo?.available ? this._maMind("artist").catch(() => null) : null]);
    const kihagy = [this._telMappa(), this._config.magno?.hires];
    for (const x of nr?.children || []) if (x.can_expand && !kihagy.includes(x.title)) tesz(x.title, { nas: x.media_content_id });
    // a címkézetlen fájlokból az MA „01”, „02_Sweet”-féle előadókat is felvesz – ezek kimaradnak (a „50 Cent” nem)
    for (const x of mr?.items || []) if (x.name && !/^\d{1,3}(\s*[-_.)]|\s*$)/.test(x.name)) tesz(x.name, { ma: x.uri, kep: x.image || null });
    const l = [...m.values()].sort((a, b) => a.nev.localeCompare(b.nev, NYELV(), { numeric: true }));
    this._eloTar = { ido: Date.now(), l };
    return l;
  }

  async _eloadoRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const hely = pl.ut[pl.ut.length - 1];
    lista.parentElement?.querySelector(".betuk")?.remove();
    if (hely) return this._eloadoLap(lista, hely);
    const kerdes = (pl.keres || "").trim(), q = KERES_NORM(kerdes);
    const friss = () => this._polc === pl && pl.ful === "eloado" && !pl.ut.length && (pl.keres || "").trim() === kerdes;
    if (!this._eloTar) lista.innerHTML = `<div class="puzenet">${T("Előadók összegyűjtése…")}</div>`;
    await this._maInfoLeker();
    let l;
    try { l = await this._eloadoIndex(); }
    catch (e) { if (friss()) lista.innerHTML = `<div class="puzenet">${T("Hiba: {h}", { h: ESC(e?.message || e) })}</div>`; return; }
    if (!friss()) return;
    const szurt = q ? l.filter((x) => x.kulcs.includes(q)) : l;
    const betu = (t) => { const b = KERES_NORM(t).charAt(0).toUpperCase(); return /[A-Z]/.test(b) ? b : "#"; };
    const pont = (x) => `<span class="edot">${x.nas ? `<i class="fp f-nas"></i>` : ""}${x.ma ? `<i class="fp f-ma"></i>` : ""}${x.dz ? `<i class="fp f-dz"></i>` : ""}</span>`;
    const gombok = (lst, el) => `<div class="eloadok elista">${lst.map((x, i) => `<button data-${el}="${i}" data-b="${betu(x.nev)}">${pont(x)}<span>${ESC(x.nev)}</span></button>`).join("")}</div>`;
    lista.innerHTML = szurt.length ? gombok(szurt, "x")
      : `<div class="puzenet">${l.length ? T("Nincs ilyen előadó a könyvtárban.") : T("Nincs előadó: se zenemappa, se Music Assistant-könyvtár.")}</div>`;
    lista.scrollTop = 0;
    if (!q && szurt.length > 30) {
      const betuk = [...new Set(szurt.map((x) => betu(x.nev)))];
      lista.insertAdjacentHTML("beforebegin", `<div class="betuk">${betuk.map((b) => `<button data-b="${b}">${b}</button>`).join("")}</div>`);
      lista.parentElement.querySelectorAll(".betuk button").forEach((b) => b.addEventListener("click", () => {
        const cel = lista.querySelector(`.elista button[data-b="${b.dataset.b}"]`);
        if (cel) lista.scrollTop = cel.offsetTop - lista.offsetTop;
      }));
    }
    const nyit = (x) => { pl.ut.push({ id: `e:${x.kulcs || x.dz}`, cim: x.nev, nas: x.nas, ma: x.ma, dz: x.dz, kep: x.kep }); pl.keres = ""; this._polcRajz(); };
    lista.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => nyit(szurt[Number(b.dataset.x)])));
    // kereséskor a Deezer előadói is (amelyek nincsenek a saját könyvtárban)
    if (q.length < 2 || !this._dzLehet()) return;
    let dz;
    try { dz = ((await this._dz(`/search/artist?q=${encodeURIComponent(kerdes)}&limit=12`)).data || []).sort((x, y) => (y.nb_fan || 0) - (x.nb_fan || 0)); } catch (e) { return; }
    if (!friss()) return;
    const van = new Set(szurt.map((x) => x.kulcs));
    const uj = dz.filter((x) => !van.has(KERES_NORM(x.name).trim())).map((x) => ({ nev: x.name, dz: String(x.id), kep: x.picture_medium || null }));
    if (!uj.length) return;
    lista.querySelector(".puzenet")?.remove();
    lista.insertAdjacentHTML("beforeend", `<h5 class="kcsop"><i class="fp f-dz"></i>${T("A DEEZEREN")}<span>${uj.length}</span></h5>${gombok(uj, "d")}`);
    lista.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => nyit(uj[Number(b.dataset.d)])));
  }

  // az előadó lapja: fejléc (kép, források, KEVERVE · RÁDIÓ), alatta forrásonként: saját zenemappa, Music Assistant, Deezer (+ hasonló előadók)
  async _eloadoLap(lista, e) {
    const pl = this._polc, nas = String(this._config.magno?.nas || "").replace(/\/$/, "");
    const friss = () => this._polc === pl && pl.ful === "eloado" && pl.ut[pl.ut.length - 1] === e;
    const monogram = e.cim.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    lista.innerHTML = `<div class="ehos" style="--c:${SZIN(e.cim)}">
        <div class="ekep">${e.kep ? `<img src="${ESC(e.kep)}" alt="">` : `<span>${ESC(monogram)}</span>`}</div>
        <div class="enev"><small>ARTIST</small><b>${ESC(e.cim)}</b><span class="echip"></span></div>
        <div class="egomb"><button class="uzgomb" data-ea="kever">▶ ${T("KEVERVE")}</button><button class="uzgomb" data-ea="radio" hidden>◉ ${T("RÁDIÓ")}</button></div>
      </div>
      <div class="eszak" data-sz="nas"></div><div class="eszak" data-sz="ma"></div><div class="eszak" data-sz="dz"></div>
      <div class="puzenet" data-sz="ures" hidden>${T("Nincs találat ennél az előadónál.")}</div>`;
    lista.scrollTop = 0;
    const hos = lista.querySelector(".ehos"), chip = hos.querySelector(".echip"), szak = (k) => lista.querySelector(`[data-sz="${k}"]`);
    const chipek = new Set(), chipTesz = (k, n) => { if (chipek.has(k)) return; chipek.add(k); chip.insertAdjacentHTML("beforeend", `<i class="f-${k}">${n}</i>`); };
    const kepTesz = (u) => { if (u && !hos.querySelector(".ekep img")) { e.kep = u; hos.querySelector(".ekep").innerHTML = `<img src="${ESC(u)}" alt="">`; } };
    const fej = (k, cim, db) => `<h5 class="kcsop"><i class="fp f-${k}"></i>${cim}<span>${db}</span></h5>`;
    hos.querySelector('[data-ea="kever"]').addEventListener("click", () => this._eloadoKever(e));
    hos.querySelector('[data-ea="radio"]').addEventListener("click", () => this._eloadoRadio(e));
    let talalt = 0;
    const kesz = () => { if (friss()) szak("ures").hidden = talalt > 0; };
    const albumNorm = (t) => KERES_NORM(t).replace(/\(.*?\)|\[.*?\]|\b(19|20)\d\d\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    // 1) saját zenemappa: az előadó mappájának albumai
    const nasP = (async () => {
      if (!e.nas) return [];
      const r = await this._bongesz(e.nas);
      const mappak = (r.children || []).filter((x) => x.can_expand).sort((x, y) => x.title.localeCompare(y.title, NYELV(), { numeric: true }));
      const kaz = mappak.map((m) => ({ cim: m.title, alcim: e.cim, forras: "nas", id: m.media_content_id, mappa: true, kep: m.thumbnail || null }));
      const szamok = (r.children || []).filter(ZENE);
      if (szamok.length) kaz.unshift({ cim: e.cim, alcim: T("{n} szám", { n: szamok.length }), forras: "nas", id: e.nas });
      if (!friss() || !kaz.length) return kaz;
      talalt++; chipTesz("nas", "NAS");
      szak("nas").innerHTML = fej("nas", T("SAJÁT ZENEMAPPA"), kaz.length) + `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>`;
      szak("nas").querySelectorAll(".kt").forEach((b) => b.addEventListener("click", async () => {
        const k = kaz[Number(b.dataset.i)];
        let sz;
        try {
          sz = await this._albumSzamok(k.id);
          // CD1 / CD2 almappák: egymás után
          if (!sz.length && k.mappa) for (const x of ((await this._bongesz(k.id)).children || []).filter((y) => y.can_expand)) sz.push(...await this._albumSzamok(x.media_content_id));
        } catch (err) { return this._uzen(T("A zenemappa nem olvasható: {h}", { h: err?.message || err })); }
        if (!sz.length) return this._uzen(T("Ebben a mappában nincs lejátszható szám."));
        this._polcZar();
        this._betolt({ cim: k.cim, alcim: k.alcim, forras: "nas", id: k.id, szamok: sz.slice(0, 80) });
      }));
      return kaz;
    })().catch(() => []);
    // 2) Music Assistant: az előadó albumai, a zenemappában is meglévők nélkül (az MA gyakran ugyanazt a NAS-t olvassa)
    const maP = (async () => {
      if (!e.ma || !this._maInfo?.available) return;
      const [r, nasKaz] = await Promise.all([this._hass.callWS({ type: "cantabile/ma/search", query: e.cim, media_type: ["album"], limit: 50 }), nasP]);
      const nasNev = new Set(nasKaz.map((k) => albumNorm(k.cim)));
      const alb = (r.albums || []).filter((a) => a.name && a.artist.split(", ").some((n) => KERES_NORM(n) === KERES_NORM(e.cim)) && !nasNev.has(albumNorm(a.name)));
      if (!friss()) return;
      chipTesz("ma", "MA");
      if (!alb.length) return;
      talalt++;
      szak("ma").innerHTML = fej("ma", "MUSIC ASSISTANT", alb.length) + `<div class="kazettak">${alb.map((x, i) => this._kazettaCsempe({ cim: x.name, alcim: x.year ? String(x.year) : x.artist, kep: x.image }, i)).join("")}</div>`;
      szak("ma").querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => this._maJatszik(alb[Number(b.dataset.i)])));
    })().catch(() => {});
    // 3) Deezer: népszerű számok, albumok, hasonló előadók (Sonoson szól)
    const dzP = (async () => {
      if (!this._dzLehet()) return;
      if (!e.dz) {
        const r = await this._dz(`/search/artist?q=${encodeURIComponent(e.cim)}&limit=8`);
        const x = (r.data || []).filter((a) => KERES_NORM(a.name).trim() === KERES_NORM(e.cim).trim()).sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0))[0];
        if (!x) return;
        e.dz = String(x.id); e.dzKep = x.picture_medium || null;
      }
      const [top, alb, hason] = await Promise.all([`/artist/${e.dz}/top?limit=25`, `/artist/${e.dz}/albums?limit=60`, `/artist/${e.dz}/related?limit=12`].map((u) => this._dz(u).catch(() => ({ data: [] }))));
      if (!friss()) return;
      kepTesz(e.dzKep || e.kep);
      chipTesz("dz", "DEEZER");
      hos.querySelector('[data-ea="radio"]').hidden = false;
      const kaz = [];
      if (top.data?.length) kaz.push({ cim: T("{e} – népszerű számok", { e: e.cim }), alcim: T("{n} szám", { n: top.data.length }), forras: "stream", tipus: "deezer", id: top.data[0].link, szamok: top.data.map((t) => t.link), kep: e.dzKep || e.kep || null });
      for (const x of alb.data || []) kaz.push({ cim: x.title, alcim: `${x.record_type === "single" ? T("kislemez") : x.record_type === "compile" ? T("válogatás") : T("album")} · ${String(x.release_date || "").slice(0, 4)}`, forras: "stream", tipus: "deezer", id: x.link, kep: x.cover_medium || null });
      const rok = (hason.data || []).map((x) => ({ nev: x.name, dz: String(x.id), kep: x.picture_medium || null }));
      if (!kaz.length && !rok.length) return;
      talalt++;
      const figy = this._hangszoro().mod === "sonos" ? "" : `<div class="puzenet">${T("A Deezer csak Sonos hangszórón szól – válts Sonos hangszóróra.")}</div>`;
      szak("dz").innerHTML = (kaz.length ? fej("dz", "DEEZER", kaz.length) + figy + `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>` : "")
        + (rok.length ? fej("dz", T("HASONLÓ ELŐADÓK"), rok.length) + `<div class="ehason">${rok.map((x, i) => `<button data-h="${i}"><span class="ekis">${x.kep ? `<img src="${ESC(x.kep)}" alt="" loading="lazy">` : ""}</span><b>${ESC(x.nev)}</b></button>`).join("")}</div>` : "");
      szak("dz").querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.i)]); }));
      szak("dz").querySelectorAll("[data-h]").forEach((b) => b.addEventListener("click", () => {
        const x = rok[Number(b.dataset.h)], sajat = this._eloTar?.l.find((y) => y.kulcs === KERES_NORM(x.nev).trim());
        pl.ut.push({ id: `e:${x.dz}`, cim: x.nev, nas: sajat?.nas, ma: sajat?.ma, dz: x.dz, kep: x.kep || sajat?.kep }); this._polcRajz();
      }));
    })().catch(() => {});
    await Promise.all([nasP, maP, dzP]);
    kesz();
  }

  // ▶ KEVERVE: a zenemappából az előadó összes száma véletlen sorrendben (kazettaként bárhol szól);
  // ha nincs a zenemappában: Music Assistanton az előadó, különben a Deezer népszerű számai keverve
  async _eloadoKever(e) {
    const nas = String(this._config.magno?.nas || "").replace(/\/$/, "");
    const kever = (l) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
    try {
      if (e.nas && nas) {
        const rel = e.nas.slice(nas.length + 1), l = await this._nasLista();
        const sz = kever(l.fajlok.filter((f) => f.startsWith(`${rel}/`))).slice(0, 80).map((f) => `${nas}/${f}`);
        if (sz.length) { this._polcZar(); return this._betolt({ cim: T("{e} – keverve", { e: e.cim }), alcim: T("{n} szám, véletlen sorrendben", { n: sz.length }), forras: "nas", id: e.nas, szamok: sz }); }
      }
      if (e.ma && this._maInfo?.available && this._maLejatszo(this._hangszoro()?.entity)) return this._maJatszik({ name: e.cim, uri: e.ma, type: "artist" });
      if (e.dz) {
        const t = (await this._dz(`/artist/${e.dz}/top?limit=50`)).data || [];
        if (t.length) { const l = kever(t.map((x) => x.link)); this._polcZar(); return this._betolt({ cim: T("{e} – keverve", { e: e.cim }), alcim: T("{n} szám, véletlen sorrendben", { n: l.length }), forras: "stream", tipus: "deezer", id: l[0], szamok: l, kep: e.kep || null }); }
      }
      if (e.ma && this._maInfo?.available) return this._maJatszik({ name: e.cim, uri: e.ma, type: "artist" });
      this._uzen(T("Ennek az előadónak nincs lejátszható száma."));
    } catch (err) { this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
  }

  // ◉ RÁDIÓ: a Deezer előadó-rádiója (az előadó és hasonlók számai), Sonoson
  async _eloadoRadio(e) {
    try {
      const t = (await this._dz(`/artist/${e.dz}/radio?limit=40`)).data || [];
      if (!t.length) return this._uzen(T("Ennek az előadónak nincs lejátszható száma."));
      this._polcZar();
      this._betolt({ cim: T("{e} rádió", { e: e.cim }), alcim: T("{n} szám · hasonlók is", { n: t.length }), forras: "stream", tipus: "deezer", id: t[0].link, szamok: t.map((x) => x.link), kep: e.kep || null });
    } catch (err) { this._uzen(T("A Deezer most nem érhető el: {h}", { h: err?.message || err })); }
  }

  // ---- LISTÁK (listak.py): saját listák vegyes forrásból, az MA (és rajta a Deezer) listái, Sonos-kedvencek ----
  _listaKepes(hsz) {
    if (this._maLejatszo(hsz?.entity)) return { t: ["ma"], m: T("Music Assistant-lejátszón az MA számai szólnak") };
    if (hsz?.mod === "sonos") return { t: ["nas", "dz"], m: T("Sonoson a zenemappa és a Deezer szól") };
    return { t: ["nas"], m: T("ezen a hangszórón csak a zenemappa szól") };
  }

  async _listaJatszik(lid, nev, kezdo = 0, hsz = this._hangszoro()) {
    if (!hsz || hsz.entity === HELYI) return this._uzen(T("A lista hangszórón szól, nem ezen a készüléken – válassz hangszórót."));
    const fr = this._foglaloIds(hsz.tagok || [hsz.entity]);
    if (fr) return this._foglaltUzen(fr);
    this._szkriptLeallit();
    let r;
    try {
      r = await this._hass.callWS({ type: "cantabile/list/play", lista: lid, entity_id: hsz.entity, tagok: hsz.tagok || [hsz.entity], mod: hsz.mod === "sonos" ? "sonos" : "url",
        kezdo, hires: this._config.magno?.hires || null, mappa: String(this._config.magno?.nas || "").replace(/\/$/, "") || null, device: ESZKOZ() });
    } catch (err) {
      const m = String(err?.message || err);
      return this._uzen(m.startsWith("busy:") ? T("A(z) {h} foglalt: {n} használja.", { h: KN(hsz), n: m.slice(5) })
        : m === "nothing_playable" ? T("Ennek a listának egyik száma sem szól ezen a hangszórón.") : T("A lista nem indult: {h}", { h: m }));
    }
    TAR.ir("tablet-magno-kazetta", JSON.stringify({ cim: nev, alcim: T("{n} szám", { n: r.szol }), forras: "lista", lista: lid, id: lid, entity: hsz.entity }));
    if (this._mod !== "magno") { this._mod = "magno"; TAR.ir("tablet-radio-mod", this._mod); }
    if (r.kimaradt) this._uzen(T("Ezen a hangszórón {n} szám szól, {k} kimarad ({m}).", { n: r.szol, k: r.kimaradt, m: this._listaKepes(hsz).m }));
    this._polcZar();
    this._frissit();
  }

  // hozzáadás egy listához: a meglévők közül, vagy új néven
  async _listaValaszto(lista, elemek) {
    const pl = this._polc;
    let r;
    try { r = await this._hass.callWS({ type: "cantabile/lists" }); } catch (err) { return this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
    lista.innerHTML = `<div class="lvalaszt">
        <h5 class="kcsop"><i class="fp f-dz"></i>${ESC(T("HOZZÁADÁS LISTÁHOZ · {n} szám", { n: elemek.length }))}</h5>
        <div class="ltetel">${elemek.slice(0, 3).map((x) => `<span>${ESC([x.eloado, x.cim].filter(Boolean).join(" – "))}</span>`).join("")}${elemek.length > 3 ? `<span>…</span>` : ""}</div>
        <div class="malcim pval">${r.listak.map((x, i) => `<button data-li="${i}">${ESC(x.nev)} <small>${x.db}</small></button>`).join("")}</div>
        <div class="lujsor"><input class="pkeres" id="lujnev" maxlength="60" placeholder="${T("Új lista neve")}"><button class="uzgomb" data-luj>${T("LÉTREHOZÁS")}</button><button class="uzgomb" data-lmegse>${T("Mégse")}</button></div>
      </div>`;
    const kesz = (nev, db) => { this._uzen(T("{n} szám hozzáadva: „{l}”.", { n: db, l: nev })); if (this._polc === pl) this._listakRajz(lista); };
    lista.querySelectorAll("[data-li]").forEach((b) => b.addEventListener("click", async () => {
      const x = r.listak[Number(b.dataset.li)];
      try { const v = await this._hass.callWS({ type: "cantabile/list/add", lista: x.id, elemek }); kesz(x.nev, v.hozzaadva); } catch (err) { this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
    }));
    const inp = lista.querySelector("#lujnev");
    lista.querySelector("[data-luj]").addEventListener("click", async () => {
      const nev = inp.value.trim(); if (!nev) return inp.focus();
      try { await this._hass.callWS({ type: "cantabile/list/create", nev, elemek }); kesz(nev, elemek.length); } catch (err) { this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
    });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") lista.querySelector("[data-luj]").click(); });
    lista.querySelector("[data-lmegse]").addEventListener("click", () => this._listakRajz(lista));
  }

  async _listakRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const hely = pl.ut[pl.ut.length - 1];
    const friss = () => this._polc === pl && pl.ful === "listak" && pl.ut[pl.ut.length - 1] === hely && lista.isConnected;
    if (hely) return this._listaLap(lista, hely, friss);
    const hsz = this._hangszoro(), szol = hsz && hsz.entity !== HELYI && (SZOL(this._allapot(hsz)) || SZUNETEL(this._allapot(hsz)));
    let r;
    try { r = await this._hass.callWS({ type: "cantabile/lists" }); }
    catch (err) { if (friss()) lista.innerHTML = `<div class="puzenet">${T("Hiba: {h}", { h: ESC(err?.message || err) })}</div>`; return; }
    if (!friss()) return;
    const pont = (f) => f.map((t) => `<i class="fp f-${t}"></i>`).join("");
    lista.innerHTML = `<div class="tsor lfelso">${szol ? `<button class="uzgomb" data-ln="1">${T("＋ A MOST SZÓLÓ SZÁM")}</button><button class="uzgomb" data-ln="2">${T("＋ A TELJES SOR")}</button>` : ""}</div>
      <h5 class="kcsop"><i class="fp f-nas"></i>${T("SAJÁT LISTÁK")}<span>${r.listak.length}</span></h5>
      <div class="mcsempek">${r.listak.map((x, i) => `<button class="mcs" data-l="${i}" style="--c:${SZIN(x.nev)}">${x.kep ? `<img src="${ESC(x.kep)}" alt="" loading="lazy">` : ""}
          <span class="mcsn"><b>${ESC(x.nev)}</b><small>${pont(x.forrasok)}${ESC(T("{n} szám", { n: x.db }))}${x.gazda_nev ? ` · ${ESC(x.gazda_nev)}` : ""}</small></span></button>`).join("")}
        <button class="mcs luj" data-luj><span class="mcsn"><b>${T("＋ ÚJ LISTA")}</b></span></button></div>
      ${r.listak.length ? "" : `<div class="puzenet">${T("Még nincs saját lista. Hozz létre egyet, vagy tedd listába a most szóló számot.")}</div>`}
      <div class="eszak" data-sz="ma"></div><div class="eszak" data-sz="sonos"></div>`;
    lista.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { const x = r.listak[Number(b.dataset.l)]; pl.ut = [{ id: x.id, cim: x.nev }]; this._polcRajz(); }));
    lista.querySelector("[data-luj]").addEventListener("click", () => this._listaValaszto(lista, []));
    lista.querySelectorAll("[data-ln]").forEach((b) => b.addEventListener("click", async () => {
      let v;
      try { v = await this._hass.callWS({ type: "cantabile/list/now", entity_id: hsz.entity, mind: b.dataset.ln === "2" }); } catch (err) { return this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
      if (!v.elemek.length) return this._uzen(T("Most nem szól semmi, amit listába lehetne tenni."));
      this._listaValaszto(lista, v.elemek);
    }));
    // a Music Assistant listái (köztük a Deezer kedvencei) és a Sonos-kedvencek
    const fej = (k, cim, db) => `<h5 class="kcsop"><i class="fp f-${k}"></i>${cim}<span>${db}</span></h5>`;
    await this._maInfoLeker();
    if (this._maInfo?.available) {
      try {
        const l = ((await this._maMind("playlist")).items || []).filter((x) => x.name);
        if (friss() && l.length) {
          const sz = lista.querySelector('[data-sz="ma"]');
          sz.innerHTML = fej("ma", "MUSIC ASSISTANT · DEEZER", l.length) + `<div class="kazettak">${l.map((x, i) => this._kazettaCsempe({ cim: x.name, alcim: T("lejátszási lista"), kep: x.image }, i)).join("")}</div>`
            + `<div class="puzenet">${T("A Deezer Flow és a mixek a Music Assistant felületén ♥-vel kerülnek ide (Böngészés → Deezer).")}</div>`;
          sz.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => this._maJatszik(l[Number(b.dataset.i)])));
        }
      } catch (_) { /* az MA most nem érhető el */ }
    }
    if (this._vanSonos()) {
      try {
        const k = (await this._streamKazettak()).filter((x) => x.alcim === T("lejátszási lista"));
        if (friss() && k.length) {
          const sz = lista.querySelector('[data-sz="sonos"]');
          sz.innerHTML = fej("dz", T("SONOS KEDVENCEK"), k.length) + `<div class="kazettak">${k.map((x, i) => this._kazettaCsempe(x, i)).join("")}</div>`;
          sz.querySelectorAll(".kt").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(k[Number(b.dataset.i)]); }));
        }
      } catch (_) { /* nincs Sonos-kedvenc */ }
    }
  }

  async _listaLap(lista, hely, friss) {
    let l;
    try { l = await this._hass.callWS({ type: "cantabile/list/get", lista: hely.id }); }
    catch (err) { if (friss()) lista.innerHTML = `<div class="puzenet">${T("Hiba: {h}", { h: ESC(err?.message || err) })}</div>`; return; }
    if (!friss()) return;
    const hsz = this._hangszoro(), kepes = this._listaKepes(hsz), jo = l.elemek.filter((x) => kepes.t.includes(x.t)).length;
    const nev = { nas: "NAS", dz: "DEEZER", ma: "MA" }, db = (t) => l.elemek.filter((x) => x.t === t).length;
    lista.innerHTML = `<div class="ehos" style="--c:${SZIN(l.nev)}">
        <div class="ekep">${l.kep ? `<img src="${ESC(l.kep)}" alt="">` : `<span>${ESC(l.nev.slice(0, 2).toUpperCase())}</span>`}</div>
        <div class="enev"><small>PLAYLIST${l.gazda_nev ? ` · ${ESC(l.gazda_nev)}` : ""}</small><b>${ESC(l.nev)}</b><span class="echip">${["nas", "dz", "ma"].filter(db).map((t) => `<i class="f-${t}">${nev[t]} ${db(t)}</i>`).join("")}</span></div>
        <div class="egomb">${l.elemek.length ? `<button class="uzgomb" data-la="play">${T("▶ LEJÁTSZÁS")}</button>` : ""}${l.sajat ? `<button class="uzgomb" data-la="atnev">${T("ÁTNEVEZÉS")}</button><button class="uzgomb pvege" data-la="torol">${T("TÖRLÉS")}</button>` : ""}</div>
      </div>
      ${l.elemek.length && jo < l.elemek.length ? `<div class="puzenet">${ESC(T("Ezen a hangszórón {n} szám szól, {k} kimarad ({m}).", { n: jo, k: l.elemek.length - jo, m: kepes.m }))}</div>` : ""}
      ${l.elemek.length ? `<div class="lelemek">${l.elemek.map((x, i) => `<div class="lelem${kepes.t.includes(x.t) ? "" : " nem"}"><button data-le="${i}"><i class="fp f-${x.t}"></i><span><b>${ESC(x.cim || x.id.split("/").pop())}</b><small>${ESC(x.eloado || nev[x.t])}</small></span></button>${l.sajat ? `<button class="sm" data-lx="${i}" title="${T("Törlés")}">×</button>` : ""}</div>`).join("")}</div>`
        : `<div class="puzenet">${T("Üres lista.")}</div>`}`;
    lista.querySelector('[data-la="play"]')?.addEventListener("click", () => this._listaJatszik(l.id, l.nev, 0));
    lista.querySelectorAll("[data-le]").forEach((b) => b.addEventListener("click", () => this._listaJatszik(l.id, l.nev, Number(b.dataset.le))));
    lista.querySelectorAll("[data-lx]").forEach((b) => b.addEventListener("click", async () => {
      try { await this._hass.callWS({ type: "cantabile/list/remove", lista: l.id, index: Number(b.dataset.lx) }); } catch (err) { return this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
      this._listaLap(lista, hely, friss);
    }));
    lista.querySelector('[data-la="atnev"]')?.addEventListener("click", () => {
      const b = lista.querySelector(".enev b");
      b.innerHTML = `<input class="pkeres" id="latnev" maxlength="60" value="${ESC(l.nev)}">`;
      const inp = b.querySelector("input"); inp.focus(); inp.select();
      const ment = async () => {
        const v = inp.value.trim();
        if (v && v !== l.nev) { try { await this._hass.callWS({ type: "cantabile/list/rename", lista: l.id, nev: v }); hely.cim = v; } catch (err) { this._uzen(T("Hiba: {h}", { h: err?.message || err })); } }
        this._polcRajz();
      };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ment(); if (e.key === "Escape") this._polcRajz(); });
      inp.addEventListener("blur", ment);
    });
    lista.querySelector('[data-la="torol"]')?.addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      if (!b.classList.contains("biztos")) { b.classList.add("biztos"); b.textContent = T("Biztos? Koppints újra"); return; }
      try { await this._hass.callWS({ type: "cantabile/list/delete", lista: l.id }); } catch (err) { return this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
      this._polc.ut = []; this._polcRajz();
    });
  }

  // ---- PARTY (party.py): végtelen keverés a zenemappából a szerveren, vendégkívánságok QR-kóddal ----
  async _partyIndit(hsz, cfg) {
    const nas = String(this._config.magno?.nas || "").replace(/\/$/, "");
    if (!nas) { this._uzen(T("A PARTY a zenemappából szól – adj meg zenemappát (⚙ → Tape deck → Zenemappa).")); return false; }
    if (!hsz || hsz.entity === HELYI) { this._uzen(T("A PARTY hangszórón szól, nem ezen a készüléken – válassz hangszórót.")); return false; }
    const fr = this._foglaloIds(hsz.tagok || [hsz.entity]);
    if (fr) { this._foglaltUzen(fr); return false; }
    this._szkriptLeallit();
    try {
      await this._hass.callWS({ type: "cantabile/party/start", entity_id: hsz.entity, tagok: hsz.tagok || [hsz.entity], mod: hsz.mod === "sonos" ? "sonos" : "url",
        mappa: nas, ...(cfg.albumok ? { albumok: cfg.albumok } : {}), cim: cfg.cim, hires: this._config.magno?.hires || null, device: ESZKOZ() });
    } catch (err) {
      const m = String(err?.message || err);
      this._uzen(m.startsWith("busy:") ? T("A(z) {h} foglalt: {n} használja.", { h: KN(hsz), n: m.slice(5) }) : T("A PARTY nem indult: {h}", { h: m }));
      return false;
    }
    TAR.ir("tablet-magno-kazetta", JSON.stringify({ cim: "PARTY", alcim: cfg.cim, forras: "nas", id: nas, entity: hsz.entity, party: true, cfg }));
    if (this._mod !== "magno") { this._mod = "magno"; TAR.ir("tablet-radio-mod", this._mod); }
    this._frissit();
    return true;
  }

  async _partyRajz(lista) {
    const pl = this._polc; if (!pl) return;
    clearTimeout(this._partyIdo);
    const friss = () => this._polc === pl && pl.ful === "party" && lista.isConnected;
    const hsz = this._hangszoro(), e = hsz?.entity;
    let r;
    try { r = await this._hass.callWS({ type: "cantabile/party/state", qr: true }); }
    catch (err) { if (friss()) lista.innerHTML = `<div class="puzenet">${T("Hiba: {h}", { h: ESC(err?.message || err) })}</div>`; return; }
    if (!friss()) return;
    const p = r.parties.find((x) => x.entity_id === e || (x.tagok || []).includes(e));
    const masutt = r.parties.filter((x) => x !== p);
    const masHtml = masutt.length ? `<div class="puzenet">${ESC(T("PARTY szól: {h}", { h: masutt.map((x) => this._hszNev(x.entity_id)).join(", ") }))}</div>` : "";
    if (p) {
      // fut: most szól, kívánságok, gombok; jobbra a QR-kód
      const m = p.most;
      lista.innerHTML = `<div class="party">
        <div class="pbal">
          <div class="ehos" style="--c:#b48cff"><div class="ekep pkep"><span>♫</span></div>
            <div class="enev"><small>${T("MOST SZÓL")} · ${ESC(KN(hsz))}</small><b>${ESC(m ? m.cim : T("Mindjárt szól…"))}</b>
              <span class="psub">${ESC(m ? [m.eloado, m.album].filter(Boolean).join(" · ") : "")}</span>${m?.ki ? `<span class="pki">${ESC(T("♥ {n} kérte", { n: m.ki }))}</span>` : ""}</div></div>
          <div class="pgombok"><button class="uzgomb" data-pa="skip">${T("⏭ KÖVETKEZŐ")}</button><button class="uzgomb" data-pa="vendeg">${p.vendeg ? T("VENDÉGEK: BE") : T("VENDÉGEK: KI")}</button><button class="uzgomb pvege" data-pa="stop">${T("■ PARTY VÉGE")}</button></div>
          <h5 class="kcsop"><i class="fp f-dz"></i>${T("SORON KÖVETKEZŐ KÍVÁNSÁGOK")}<span>${p.kivansag.length}</span></h5>
          ${p.kivansag.length ? `<div class="ktalal">${p.kivansag.map((k, i) => `<div class="pkiv"><b>${i + 1}. ${ESC(k.cim)}</b><small>${ESC([k.eloado, k.ki ? `♥ ${k.ki}` : ""].filter(Boolean).join(" · "))}</small></div>`).join("")}</div>` : `<div class="puzenet">${T("Még nincs kívánság.")}</div>`}
          <div class="puzenet pinfo">${ESC(p.cim)} · ${ESC(T("{n} szám a válogatásban · indította: {g}", { n: p.db, g: p.gazda || "?" }))}</div>${masHtml}
        </div>
        <div class="pjobb">${p.vendeg ? (p.qr ? `<div class="pqr">${p.qr}</div><small>${T("Kívánság: olvasd be a telefonoddal (az otthoni Wi-Fin).")}</small><code>${ESC(p.url || "")}</code>`
          : `<div class="puzenet">${T("A QR-kódhoz a Home Assistant belső címe kell (Beállítások → Rendszer → Hálózat).")}</div>${p.url ? `<code>${ESC(p.url)}</code>` : ""}`)
          : `<div class="puzenet">${T("A vendégkívánságok szünetelnek – a régi QR-kód már nem érvényes.")}</div>`}</div>
      </div>`;
      // a QR-kód a dobozhoz méreteződjön: méret helyett viewBox (különben a CSS-méret levágja)
      lista.querySelectorAll(".pqr svg").forEach((sv) => {
        const w = sv.getAttribute("width"), h = sv.getAttribute("height");
        if (!sv.getAttribute("viewBox") && w && h) sv.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
        sv.removeAttribute("width"); sv.removeAttribute("height");
      });
      lista.querySelectorAll("[data-pa]").forEach((b) => b.addEventListener("click", async () => {
        const a = b.dataset.pa;
        try {
          if (a === "skip") await this._hass.callWS({ type: "cantabile/party/skip", entity_id: p.entity_id });
          else if (a === "vendeg") await this._hass.callWS({ type: "cantabile/party/guests", entity_id: p.entity_id, on: !p.vendeg });
          else if (a === "stop") {
            await this._hass.callWS({ type: "cantabile/party/stop", entity_id: p.entity_id });
            await this._hiv("media_player", "media_stop", { entity_id: p.entity_id }).catch(() => {});
          }
        } catch (err) { this._maHiba(p.entity_id, err); }
        setTimeout(() => friss() && this._partyRajz(lista), 1200);
      }));
      this._partyIdo = setTimeout(() => friss() && this._partyRajz(lista), 5000);
      return;
    }
    // nem fut: miből szóljon (az egész zenetár vagy műfajcsaládok), indítás
    let csal = [];
    try { csal = (await this._mufajAdat()).l.filter((x) => x.albumok.length); } catch (_) { /* csak az egész zenetár */ }
    if (!friss()) return;
    const val = pl.partyVal = pl.partyVal || new Set();
    const rajz = () => {
      lista.innerHTML = `<div class="ehos" style="--c:#b48cff"><div class="ekep pkep"><span>♫</span></div>
          <div class="enev"><small>CANTABILE</small><b>PARTY</b><span class="psub">${T("Végtelen keverés a zenemappából: ugyanaz a szám sokáig nem jön újra, ugyanaz az előadó nem jön kétszer egymás után. Akkor is szól, ha a kártyát bezárod. A vendégek a telefonjukkal kérhetnek számot (QR-kód).")}</span></div></div>
        <h5 class="kcsop"><i class="fp f-nas"></i>${T("MIBŐL SZÓLJON?")}</h5>
        <div class="malcim pval"><button class="${val.size ? "" : "akt"}" data-pv="">${T("EGÉSZ ZENETÁR")}</button>${csal.map((x, i) => `<button class="${val.has(x.id) ? "akt" : ""}" data-pv="${i}">${ESC(x.cim)} <small>${x.albumok.length}</small></button>`).join("")}</div>
        <div class="tsor pindul"><button class="uzgomb pnagy" data-pi>${ESC(T("▶ PARTY INDUL · {h}", { h: KN(hsz) }))}</button></div>${masHtml}`;
      lista.querySelectorAll("[data-pv]").forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.pv === "") val.clear(); else { const id = csal[Number(b.dataset.pv)].id; if (val.has(id)) val.delete(id); else val.add(id); }
        rajz();
      }));
      lista.querySelector("[data-pi]").addEventListener("click", async () => {
        const v = csal.filter((x) => val.has(x.id));
        const cfg = v.length ? { cim: `PARTY · ${v.map((x) => x.cim).join(" + ")}`, albumok: [...new Set(v.flatMap((x) => x.albumok))] } : { cim: `PARTY · ${T("EGÉSZ ZENETÁR")}` };
        if (await this._partyIndit(this._hangszoro(), cfg)) setTimeout(() => friss() && this._partyRajz(lista), 2500);
      });
    };
    rajz();
  }

  // ---- MŰFAJOK: a Deezer mintájára nagy, képes műfajcsaládok; a zenefájlok (gyakran aprólékos) címkéi a családjukba kerülnek ----
  // (a címkéket a szerver gyűjti albumonként, a háttérben – mufaj.py); ami egyikbe sem illik, a TOVÁBBI MŰFAJOK közé
  async _mufajAdat(frissit = false) {
    const nas = String(this._config.magno?.nas || "").replace(/\/$/, "");
    const [nr, dr] = await Promise.all([
      nas ? this._hass.callWS({ type: "cantabile/genres", mappa: nas, kihagy: [this._telMappa(), this._config.magno?.hires].filter(Boolean), frissit }) : { genres: [] },
      this._config.deezer !== false ? (this._dzMufajP ||= this._dz("/genre").catch((e) => { this._dzMufajP = null; return { data: [] }; })) : { data: [] }]);
    const dzNev = new Map((dr.data || []).filter((g) => g.id).map((g) => [g.id, g]));
    const csal = new Map(), tobbi = [];
    for (const [id, nev] of MUFAJ_NEV) {
      const d = dzNev.get(id);
      csal.set(id, { id, cim: d?.name || nev, kep: d?.picture_big || d?.picture_medium || null, dz: dzNev.size ? (d ? id : null) : null, al: [], albumok: [] });
    }
    for (const g of nr.genres || []) {
      const k = KERES_NORM(g.name || ""), c = g.name ? MUFAJ_CSALAD.find(([, re]) => re.test(k)) : null;
      if (c) { const x = csal.get(c[0]); x.al.push({ nev: g.name, albumok: g.albums }); x.albumok.push(...g.albums); }
      else tobbi.push({ nev: g.name, albumok: g.albums });
    }
    for (const x of csal.values()) x.albumok = [...new Set(x.albumok)];
    // a sorrend: amiből több saját album van, elöl; utána a Deezer sorrendje
    const dzSor = [...dzNev.keys()];
    const l = [...csal.values()].filter((x) => x.albumok.length || x.dz)
      .sort((a, b) => b.albumok.length - a.albumok.length || dzSor.indexOf(a.id) - dzSor.indexOf(b.id));
    return { nas, l, tobbi: tobbi.sort((a, b) => b.albumok.length - a.albumok.length), running: nr.running, done: nr.done, total: nr.total };
  }

  async _mufajRajz(lista) {
    const pl = this._polc;
    clearTimeout(this._mufajIdo);
    const hely = pl.ut[pl.ut.length - 1];
    let r;
    try { r = await this._mufajAdat(!!pl.mufajFrissit); }
    catch (e) { if (this._polc === pl && pl.ful === "mufaj") lista.innerHTML = `<div class="puzenet">${T("A műfajok nem olvashatók: {h}", { h: ESC(e?.message || e) })}</div>`; return; }
    pl.mufajFrissit = false;
    if (this._polc !== pl || pl.ful !== "mufaj" || pl.ut[pl.ut.length - 1] !== hely) return;
    const fut = r.running ? `<div class="puzenet">${T("Műfajok gyűjtése a zenefájlok címkéiből… {k} / {n} album", { k: r.done, n: r.total || "…" })}</div>` : "";
    if (r.running) this._mufajIdo = setTimeout(() => { if (this._polc === pl && pl.ful === "mufaj" && lista.isConnected && !pl.ut.length) this._mufajRajz(lista); }, 2500);
    if (hely) return this._mufajLap(lista, hely, r);
    const pont = (x) => `${x.albumok.length ? `<i class="fp f-nas"></i>` : ""}${x.dz ? `<i class="fp f-dz"></i>` : ""}`;
    lista.innerHTML = fut + (r.l.length || r.tobbi.length ? "" : `<div class="puzenet">${T("Nincs műfaj: a zenefájlokban nincs címke, a Deezer pedig ki van kapcsolva.")}</div>`)
      + `<div class="mcsempek">${r.l.map((x, i) => `<button class="mcs" data-c="${i}" style="--c:${SZIN(x.cim)}">${x.kep ? `<img src="${ESC(x.kep)}" alt="" loading="lazy">` : ""}
          <span class="mcsn"><b>${ESC(x.cim)}</b><small>${pont(x)}${x.albumok.length ? ESC(T("{n} album", { n: x.albumok.length })) : "Deezer"}</small></span></button>`).join("")}</div>`
      + (r.tobbi.length ? `<h5 class="kcsop"><i class="fp f-nas"></i>${T("TOVÁBBI MŰFAJOK")}<span>${r.tobbi.length}</span></h5>
          <div class="eloadok">${r.tobbi.map((x, i) => `<button data-t="${i}">${ESC(x.nev || T("Nincs műfaj"))} <small>${x.albumok.length}</small></button>`).join("")}</div>` : "")
      + (r.nas && !r.running ? `<div class="tsor"><button class="tgomb halk" data-frissit>${T("↻ Újraolvasás")}</button></div>` : "");
    lista.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => { const x = r.l[Number(b.dataset.c)]; pl.ut = [{ id: `c:${x.id}`, cim: x.cim, cs: x.id }]; this._polcRajz(); }));
    lista.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { const x = r.tobbi[Number(b.dataset.t)]; pl.ut = [{ id: `n:${x.nev}`, cim: x.nev || T("Nincs műfaj"), nev: x.nev }]; this._polcRajz(); }));
    lista.querySelectorAll(".mcs img").forEach((im) => im.addEventListener("error", () => im.remove()));
    lista.querySelector("[data-frissit]")?.addEventListener("click", () => { pl.mufajFrissit = true; this._mufajRajz(lista); });
  }

  // a műfaj lapja: fejléc (kép, KEVERVE · RÁDIÓ), alcímkék szűrője, saját albumok, Deezer: toplista, albumok, listák, rádiók, előadók
  async _mufajLap(lista, hely, r) {
    const pl = this._polc, friss = () => this._polc === pl && pl.ful === "mufaj" && pl.ut[pl.ut.length - 1] === hely;
    const c = hely.cs != null ? r.l.find((x) => x.id === hely.cs) : null, tobb = c ? null : r.tobbi.find((x) => x.nev === hely.nev);
    const al = c ? c.al : tobb ? [tobb] : [], valasztott = al.find((x) => x.nev === hely.al);
    const albumok = valasztott ? valasztott.albumok : c ? c.albumok : tobb?.albumok || [];
    const dz = c?.dz && this._config.deezer !== false ? c.dz : null, dzSzol = dz && this._dzLehet();
    const nas = r.nas;
    lista.innerHTML = `<div class="ehos" style="--c:${SZIN(hely.cim)}">
        <div class="ekep">${c?.kep ? `<img src="${ESC(c.kep)}" alt="">` : `<span>${ESC(hely.cim.slice(0, 2).toUpperCase())}</span>`}</div>
        <div class="enev"><small>GENRE</small><b>${ESC(hely.cim)}</b><span class="echip">${albumok.length ? `<i class="f-nas">${ESC(T("{n} album", { n: albumok.length }))}</i>` : ""}${dz ? `<i class="f-dz">DEEZER</i>` : ""}</span></div>
        <div class="egomb">${albumok.length ? `<button class="uzgomb" data-ea="kever">▶ ${T("KEVERVE")}</button>` : ""}${dzSzol ? `<button class="uzgomb" data-ea="radio">◉ ${T("RÁDIÓ")}</button>` : ""}</div>
      </div>
      ${al.length > 1 ? `<div class="malcim"><button class="${valasztott ? "" : "akt"}" data-al="">${T("Mind")} <small>${c.albumok.length}</small></button>${al.map((x, i) => `<button class="${x === valasztott ? "akt" : ""}" data-al="${i}">${ESC(x.nev)} <small>${x.albumok.length}</small></button>`).join("")}</div>` : ""}
      <div class="eszak" data-sz="nas"></div><div class="eszak" data-sz="dz"></div>`;
    lista.scrollTop = 0;
    const fej = (k, cim, db) => `<h5 class="kcsop"><i class="fp f-${k}"></i>${cim}<span>${db}</span></h5>`, szak = (k) => lista.querySelector(`[data-sz="${k}"]`);
    lista.querySelectorAll("[data-al]").forEach((b) => b.addEventListener("click", () => { hely.al = b.dataset.al === "" ? null : al[Number(b.dataset.al)].nev; this._mufajLap(lista, hely, r); }));
    lista.querySelector('[data-ea="kever"]')?.addEventListener("click", () => this._mufajKever(hely.cim, albumok, nas));
    // saját albumok
    if (albumok.length) {
      const kaz = albumok.map((rel) => { const t = rel.split("/"); return { cim: t[t.length - 1], alcim: t.length > 1 ? t[t.length - 2] : "", forras: "nas", id: `${nas}/${rel}` }; })
        .sort((a, b) => a.alcim.localeCompare(b.alcim, NYELV(), { numeric: true }) || a.cim.localeCompare(b.cim, NYELV(), { numeric: true }));
      szak("nas").innerHTML = fej("nas", T("SAJÁT ZENEMAPPA"), kaz.length) + `<div class="kazettak">${kaz.map((k, i) => this._kazettaCsempe(k, i)).join("")}</div>`;
      szak("nas").querySelectorAll(".kt").forEach((b) => b.addEventListener("click", async () => {
        const k = kaz[Number(b.dataset.i)];
        let sz;
        try { sz = await this._albumSzamok(k.id); } catch (e) { return this._uzen(T("A zenemappa nem olvasható: {h}", { h: e?.message || e })); }
        if (!sz.length) return this._uzen(T("Ebben a mappában nincs lejátszható szám."));
        this._polcZar();
        this._betolt({ ...k, szamok: sz });
      }));
    }
    if (!dz) return;
    // Deezer: a műfaj toplistája (számok, albumok, listák), rádiói és előadói
    const [ch, rad, art] = await Promise.all([`/chart/${dz}`, `/genre/${dz}/radios`, `/genre/${dz}/artists`].map((u) => this._dz(u).catch(() => ({}))));
    if (!friss()) return;
    const tr = ch.tracks?.data || [], kaz = [];
    if (tr.length) kaz.push({ cim: T("{g} – toplista", { g: hely.cim }), alcim: T("{n} szám", { n: tr.length }), forras: "stream", tipus: "deezer", id: tr[0].link, szamok: tr.map((t) => t.link), kep: c.kep });
    for (const x of ch.albums?.data || []) kaz.push({ cim: x.title, alcim: x.artist?.name || T("album"), forras: "stream", tipus: "deezer", id: x.link, kep: x.cover_medium || null });
    const listak = (ch.playlists?.data || []).map((x) => ({ cim: x.title, alcim: T("Deezer-lista · {n} szám", { n: x.nb_tracks }), forras: "stream", tipus: "deezer", id: x.link, kep: x.picture_medium || null }));
    const radiok = (rad.data || []).slice(0, 18), eloadok = (art.data || []).slice(0, 24);
    hely.radiok = radiok;
    const figy = this._hangszoro().mod === "sonos" ? "" : `<div class="puzenet">${T("A Deezer csak Sonos hangszórón szól – válts Sonos hangszóróra.")}</div>`;
    const kazHtml = (l, el) => `<div class="kazettak">${l.map((k, i) => this._kazettaCsempe(k, i).replace('class="kt"', `class="kt" data-${el}="${i}"`)).join("")}</div>`;
    szak("dz").innerHTML = (kaz.length ? fej("dz", T("TOPLISTA"), kaz.length) + figy + kazHtml(kaz, "k") : "")
      + (listak.length ? fej("dz", "PLAYLISTS", listak.length) + kazHtml(listak, "l") : "")
      + (radiok.length ? fej("dz", T("DEEZER RÁDIÓK"), radiok.length) + kazHtml(radiok.map((x) => ({ cim: x.title, alcim: "Deezer · RADIO", kep: x.picture_medium })), "r") : "")
      + (eloadok.length ? fej("dz", T("ELŐADÓK"), eloadok.length) + `<div class="ehason">${eloadok.map((x, i) => `<button data-h="${i}"><span class="ekis">${x.picture_medium ? `<img src="${ESC(x.picture_medium)}" alt="" loading="lazy">` : ""}</span><b>${ESC(x.name)}</b></button>`).join("")}</div>` : "");
    const d = szak("dz");
    d.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(kaz[Number(b.dataset.k)]); }));
    d.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { this._polcZar(); this._betolt(listak[Number(b.dataset.l)]); }));
    d.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => this._dzRadio(radiok[Number(b.dataset.r)])));
    d.querySelectorAll("[data-h]").forEach((b) => b.addEventListener("click", () => {
      // az előadó lapja az ELŐADÓK fülön nyílik; a „‹ Vissza” ide hoz vissza
      const x = eloadok[Number(b.dataset.h)], sajat = this._eloTar?.l.find((y) => y.kulcs === KERES_NORM(x.name).trim());
      pl.vissza = { ful: "mufaj", ut: [...pl.ut], keres: "" };
      Object.assign(pl, { ful: "eloado", keres: "", ut: [{ id: `e:${x.id}`, cim: x.name, nas: sajat?.nas, ma: sajat?.ma, dz: String(x.id), kep: x.picture_medium || sajat?.kep || null }] });
      this._polcRajz();
    }));
    lista.querySelector('[data-ea="radio"]')?.addEventListener("click", () => radiok.length ? this._dzRadio(radiok[0]) : this._uzen(T("Ennél a műfajnál nincs lejátszható szám.")));
  }

  // ▶ KEVERVE egy műfajra: a műfaj saját albumainak számai véletlen sorrendben, egy kazettán (bárhol szól)
  async _mufajKever(cim, albumok, nas) {
    try {
      const l = await this._nasLista(), al = new Set(albumok);
      const sz = l.fajlok.filter((f) => { const d = f.slice(0, f.lastIndexOf("/")); return al.has(d) || al.has(d.slice(0, d.lastIndexOf("/"))); });
      for (let i = sz.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sz[i], sz[j]] = [sz[j], sz[i]]; }
      if (!sz.length) return this._uzen(T("Ennél a műfajnál nincs lejátszható szám."));
      const v = sz.slice(0, 80).map((f) => `${nas}/${f}`);
      this._polcZar();
      this._betolt({ cim: T("{g} – keverve", { g: cim }), alcim: T("{n} szám, véletlen sorrendben", { n: v.length }), forras: "nas", id: v[0].slice(0, v[0].lastIndexOf("/")), szamok: v });
    } catch (err) { this._uzen(T("Hiba: {h}", { h: err?.message || err })); }
  }

  // egy Deezer-rádió (műfaj- vagy hangulat-rádió) számai egy kazettán, Sonoson
  async _dzRadio(x) {
    try {
      const t = (await this._dz(`/radio/${x.id}/tracks?limit=40`)).data || [];
      if (!t.length) return this._uzen(T("Ennél a műfajnál nincs lejátszható szám."));
      this._polcZar();
      this._betolt({ cim: x.title, alcim: T("{n} szám · Deezer-rádió", { n: t.length }), forras: "stream", tipus: "deezer", id: t[0].link, szamok: t.map((y) => y.link), kep: x.picture_medium || null });
    } catch (err) { this._uzen(T("A Deezer most nem érhető el: {h}", { h: err?.message || err })); }
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

  // ---- jelút (ⓘ): honnan jön a hang, mi történik vele, hol szól – élőben, a füstüveg ablakban ----

  _jelutNyit() {
    this._jelutE = true;
    this.shadowRoot.querySelectorAll(".infog").forEach((b) => b.classList.add("be"));
    this._jelutKulcs = null;
    this._jelutRajz();
    this._jelutEbreszt();
  }

  _jelutZar() {
    this._jelutE = null; clearTimeout(this._jelutIdo);
    const sr = this.shadowRoot;
    sr?.querySelectorAll(".infog").forEach((b) => b.classList.remove("be"));
    const r = sr?.querySelector(".jelreteg"), a = r?.querySelector(".uzablak");
    if (!a) return;
    a.classList.remove("lat"); a.classList.add("zar");
    setTimeout(() => { if (!this._jelutE) r.remove(); }, 600);
  }

  _jelutEbreszt() { clearTimeout(this._jelutIdo); this._jelutIdo = setTimeout(() => this._jelutZar(), 60000); }

  // a mostani lejátszás útja: forrás, a feldolgozás lépései, a kimenet
  _jelutModell() {
    const c = this._config, hsz = this._hangszoro(), e = hsz?.entity, s = this._allapot(hsz), a = s?.attributes || {};
    const ra = this._radioAll || {}, ma = this._magnoAllapot || {}, vez = this._vezTar?.[e]?.adat, f = this._formatum;
    const ures = (x) => !x || /^(unknown|unavailable|not provided|none|null)$/i.test(String(x).trim()) || URLSZERU(x);
    const cimSor = [a.media_artist, a.media_title].filter((x) => !ures(x)).join(" – ");
    const forma = f ? [f.kodek, f.khz ? `${String(f.khz).replace(".", ",")} kHz` : "", f.bit ? `${f.bit} bit` : "", f.kbps ? `${f.kbps} kbps` : ""].filter(Boolean).join(" · ") : "";
    const SZIN = { ma: "#9ec9ff", radio: "#ffb547", nas: "#5ad1e6", tel: "#8fd16a", deezer: "#b48cff", stream: "#ff7aa8", fav: "#ff8a5c", bem: "#e3e36a", mas: "#6d9bff", nincs: "#7d8188" };
    const helyi = e === HELYI, sonos = hsz?.mod === "sonos";
    let fajta = "nincs", forras = { cim: "—", al: [T("Most nem szól semmi.")] }, lepes = [];
    if (!helyi && e && this._bemenetrol(e)) {
      fajta = "bem";
      const ki = vez?.bt?.devices?.find((d) => d.connected);
      forras = { cim: BEMENET_NEV(a.source), al: [/bluetooth/i.test(a.source || "") ? (ki ? `Bluetooth · ${ki.name}` : T("telefon / tablet Bluetooth-on")) : T("külső készülék a bemeneten"), cimSor].filter(Boolean) };
      lepes = [T("Közvetlen bemenet: a hang egyenesen a hangszóróba megy, a Home Assistanton nem halad át")];
    } else if (ra.szol) {
      fajta = "radio";
      const k = ra.i === KULSO ? this._kulso() : null, ado = k ? null : c.adok[ra.i];
      forras = { cim: k ? k.nev : ado?.nev || T("Rádió"), al: [k ? `NET · Radio Browser${k.orszag ? ` · ${k.orszag}` : ""}` : ado?.virt ? "WEB" : ado?.frekvencia ? `${MHZ(ado.frekvencia)} MHz` : "", cimSor, forma].filter(Boolean) };
      lepes = [helyi ? T("Továbbító: a HA saját címén jön a böngészőbe (/api/cantabile/stream)") : sonos ? T("Közvetlen stream-cím (x-rincon-mp3radio): a Sonos maga tölti az adót") : T("Közvetlen stream-cím: a hangszóró maga tölti az adót")];
    } else if (ma.szol || ma.szun || SZOL(s) || SZUNETEL(s)) {
      const fc = String(this._kazForras || ""), kaz = ma.kaz;
      fajta = fc === "MA" ? "ma" : /^NAS/.test(fc) ? "nas" : /^(TEMP|PHONE)/.test(fc) ? "tel" : /DEEZER/.test(fc) ? "deezer" : /SPOTIFY|TIDAL|STREAM|APPLE|YOUTUBE|SOUNDCLOUD/.test(fc) ? "stream" : (ma.szol || ma.szun) && kaz ? "fav" : "mas";
      forras = { cim: (!ures(a.media_title) && a.media_title) || kaz?.cim || T("Ismeretlen szám"), al: [[fc, kaz?.cim && kaz.cim !== a.media_title ? kaz.cim : ""].filter(Boolean).join(" · "), !ures(a.media_artist) ? a.media_artist : "", forma].filter(Boolean) };
      if (fajta === "nas") lepes.push(T("Aláírt médialink a HA /media útvonalára (8 óráig érvényes)"));
      if (/^TEMP/.test(fc)) lepes.push(T("Átmeneti feltöltés a HA-ra (24 óráig)"));
      if (/^PHONE/.test(fc) && helyi) lepes.push(T("Helyi fájl: a böngésző játssza, el sem hagyja a készüléket"));
      if (fajta === "deezer" || fajta === "stream") lepes.push(T("Katalógus-link: a hangszóró a saját szolgáltatás-fiókjával tölti"));
      if (fajta === "nas" || /^TEMP/.test(fc)) lepes.push(helyi ? T("Böngésző-lejátszó (<audio> + Web Audio)") : sonos ? T("Sonos-sor (a 48 kHz-es másolat, ha van)") : T("Sorozatlejátszó: számonként, WiiM-en / DLNA-n hézagmentesen"));
      if (fajta === "ma") lepes.push(T("Music Assistant sora: az MA keresi elő, tölti és játssza le (saját motorral)"));
      if (fajta === "mas") lepes.push(T("A lejátszó saját forrása (nem a Cantabile indította)"));
    }
    if (vez?.eq) lepes.push(vez.eq.on ? T("EQ: {n}", { n: (this._eqMost(e) || "").replace(/^\w+:/, "") || vez.eq.name || "CUSTOM" }) : T("EQ: kikapcsolva"));
    else if (vez?.tone?.fajta === "sonos") lepes.push(`${T("Hangszín")}: BASS ${vez.tone.bass ?? 0} · TREBLE ${vez.tone.treble ?? 0}${vez.loudness ? " · LOUDNESS" : ""}`);
    const vu = fajta === "nincs" ? "" : fajta === "bem" ? T("utánzat – a hang nem halad át a szerveren") : this._jelAllapot === "elemzes" ? T("valódi jel (ffmpeg, 50 ms)") : T("utánzat");
    // kimenet: a hangszóró, csoportnál a tagok, és ha egy TV tükrözi, az is
    const nev = (x) => this._hass?.states[x]?.attributes?.friendly_name || x;
    const tukor = helyi ? [] : Object.values(this._hass?.states || {}).filter((st) => st.attributes?.mirror_of === e).map((st) => T("+ TV-tükör: {n}", { n: st.attributes.friendly_name || st.entity_id }));
    const vol = a.volume_level != null ? `${Math.round(a.volume_level * 100)}%` : "";
    const hol = helyi ? T("ez a készülék (böngésző)") : hsz?.tagok ? hsz.tagok.map(nev).join(" + ") : nev(e);
    const ki = { cim: KN(hsz), al: [hol !== KN(hsz) ? hol : "", [SZOL(s) ? "PLAY" : SZUNETEL(s) ? "PAUSE" : "STOP", vol].filter(Boolean).join(" · "), ...tukor].filter(Boolean) };
    return { szin: SZIN[fajta], szol: SZOL(s), forras, lepes, ki, vu };
  }

  _jelutRajz() {
    if (!this._jelutE) return;
    const kartya = this.shadowRoot?.querySelector("ha-card");
    if (!kartya) return;
    const m = this._jelutModell(), kulcs = JSON.stringify(m);
    let r = kartya.querySelector(".jelreteg");
    if (!r) {
      r = document.createElement("div"); r.className = "jelreteg";
      r.innerHTML = `<div class="uzablak jelablak" role="dialog" aria-label="${T("Jelút")}"></div>`;
      const ab = r.firstElementChild;
      ab.addEventListener("pointerdown", () => this._jelutEbreszt());
      ab.addEventListener("click", (ev) => { ev.stopPropagation(); if (ev.target.closest(".jzar")) this._jelutZar(); });
      kartya.appendChild(r);
      const kr = kartya.getBoundingClientRect(), fent = Math.max(0, -kr.top), lent = Math.min(kr.height, innerHeight - kr.top);
      r.style.top = `${Math.round(fent + Math.max(8, (lent - fent) * 0.08))}px`;
      requestAnimationFrame(() => ab.classList.add("lat"));
    }
    if (kulcs === this._jelutKulcs) return;
    this._jelutKulcs = kulcs;
    const ab = r.firstElementChild, nyil = `<div class="jnyil"><svg viewBox="0 0 40 14"><line x1="0" y1="7" x2="32" y2="7"/><path d="M32 2.5 40 7l-8 4.5z"/></svg></div>`;
    const sorok = (l) => l.map((x) => `<span>${ESC(x)}</span>`).join("");
    ab.style.setProperty("--c", m.szin);
    ab.classList.toggle("jablak-szol", m.szol);
    ab.innerHTML = `<div class="uzfej"><i></i>CANTABILE · SIGNAL PATH</div>
      <div class="jsor">
        <div class="jdoboz"><small>SOURCE</small><b>${ESC(m.forras.cim)}</b>${sorok(m.forras.al)}</div>${nyil}
        <div class="jdoboz"><small>PROCESSING</small><ul>${(m.lepes.length ? m.lepes : [T("—")]).map((x) => `<li>${ESC(x)}</li>`).join("")}</ul></div>${nyil}
        <div class="jdoboz"><small>OUTPUT</small><b>${ESC(m.ki.cim)}</b>${sorok(m.ki.al)}</div>
      </div>
      <div class="jlab">${m.vu ? `<span>VU: <em>${ESC(m.vu)}</em></span>` : ""}<button class="uzgomb jzar" type="button">CLOSE</button></div>`;
  }

  // ---- Music Assistant (ma.py): választható forrás, ha a HA-ban be van állítva ----

  _maLejatszo(e) { return !!e && !!this._hass?.states[e]?.attributes?.mass_player_type; }
  // az MA saját sora szól: az MA-lejátszó akkor is „Music Assistant Queue”-t jelez, ha kívülről (pl. a Sonos appból) szól
  // valami – ezért az MA-azonosítójú szám (library://…, spotify://…) dönt
  _maSorSzol(e) {
    const a = e && this._hass?.states[e]?.attributes;
    return !!a && a.app_id === "music_assistant" && /^[\w.-]+:\/\//.test(a.media_content_id || "") && !/^https?:/i.test(a.media_content_id || "");
  }

  async _maInfoLeker() {
    if (this._maInfo && Date.now() - this._maInfo.ido < 300000) return;
    try { this._maInfo = { ...(await this._hass.callWS({ type: "cantabile/ma/info" })), ido: Date.now() }; }
    catch (_) { this._maInfo = { available: false, ido: Date.now() }; }
  }

  // a könyvtár egy-egy típusa 5 percig megjegyezve (az első lekérés lassú lehet); a polc megnyitásakor előre letöltjük
  // az MA teljes könyvtára egy típusból, lapozva (az ELŐADÓK névsorához), 5 percig tárolva
  _maMind(tip) {
    this._maMindTar = this._maMindTar || {};
    const t = this._maMindTar[tip];
    if (t && Date.now() - t.ido < 300000) return t.p;
    const p = (async () => {
      const items = [];
      for (let lap = 0; lap < 15; lap++) {
        const r = await this._hass.callWS({ type: "cantabile/ma/library", media_type: tip, limit: 200, offset: items.length });
        items.push(...(r.items || []));
        if (!r.more) break;
      }
      return { items };
    })();
    this._maMindTar[tip] = { ido: Date.now(), p };
    p.catch(() => { if (this._maMindTar[tip]?.p === p) delete this._maMindTar[tip]; });
    return p;
  }

  _maKonyvtar(tip) {
    this._maTar = this._maTar || {};
    const t = this._maTar[tip];
    if (t && Date.now() - t.ido < 300000) return t.p;
    const p = this._hass.callWS({ type: "cantabile/ma/library", media_type: tip, limit: 150 });
    this._maTar[tip] = { ido: Date.now(), p };
    p.catch(() => { if (this._maTar[tip]?.p === p) delete this._maTar[tip]; });
    return p;
  }

  _maHiba(e, err) {
    const m = String(err?.message || "");
    if (m.startsWith("busy:")) this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(e), n: m.slice(5) }));
    else if (m === "not_ma") this._uzen(T("Ez nem Music Assistant-lejátszó."));
    else this._hivHiba(e, err);
  }

  // MA fül: keresés, könyvtár (albumok, előadók, listák, számok, rádió), előadó → albumai; koppintásra MA-lejátszón szól
  async _maRajz(lista) {
    const pl = this._polc; if (!pl) return;
    const kerdes = pl.keres || "", hely = pl.ut[pl.ut.length - 1], tip = pl.maTip || "album", keres = KERES_NORM(kerdes).length >= 2;
    const allapot = JSON.stringify([kerdes, tip, pl.ut.map((x) => x.id)]);
    const friss = () => this._polc === pl && pl.ful === "ma" && allapot === JSON.stringify([pl.keres || "", pl.maTip || "album", pl.ut.map((x) => x.id)]);
    const hsz = this._hangszoro(), maNevek = this._kimenetek.filter((h) => h.entity !== HELYI && !h.tagok && this._maLejatszo(h.entity)).map(KN);
    const figy = this._maLejatszo(hsz?.entity) ? "" : `<div class="puzenet">${ESC(maNevek.length ? T("A Music Assistant tartalma Music Assistant-lejátszón szól: {l}.", { l: maNevek.join(", ") }) : T("A Music Assistant tartalma Music Assistant-lejátszón szól – vegyél fel egyet a hangszórók közé (⚙)."))}</div>`;
    const TIP = [["album", "ALBUMS"], ["artist", "ARTISTS"], ["playlist", "PLAYLISTS"], ["track", "TRACKS"], ["radio", "RADIO"]];
    const fulek = hely || keres ? "" : `<div class="maful">${TIP.map(([k, n]) => `<button class="pful${tip === k ? " akt" : ""}" data-mt="${k}">${n}</button>`).join("")}</div>`;
    lista.innerHTML = figy + fulek + `<div class="puzenet">${T("Betöltés…")}</div>`;
    const kot = () => lista.querySelectorAll("[data-mt]").forEach((b) => b.addEventListener("click", () => { pl.maTip = b.dataset.mt; this._maRajz(lista); }));
    kot();
    const csempe = (x, i) => this._kazettaCsempe({ cim: x.name, alcim: x.artist || (x.year ? String(x.year) : x.type === "radio" ? "RADIO" : ""), kep: x.image }, i);
    const sor = (x, i) => `<div class="ktsor"><button data-ms="${i}"><b>${ESC(x.name)}</b><small>${ESC([x.artist, x.album].filter(Boolean).join(" · "))}</small></button></div>`;
    try {
      let elemek = [], cs = null;
      if (hely) {
        const r = await this._hass.callWS({ type: "cantabile/ma/search", query: hely.cim, media_type: ["album"], limit: 50 });
        const sajat = (r.albums || []).filter((a) => a.artist.split(", ").includes(hely.cim));
        elemek = sajat.length ? sajat : r.albums || [];
      } else if (keres) cs = await this._hass.callWS({ type: "cantabile/ma/search", query: kerdes.trim(), limit: 12 });
      else elemek = (await this._maKonyvtar(tip)).items || [];
      if (!friss()) return;
      // a címkézetlen fájlokból az MA név nélküli albumot / számot is felvesz – ezek üres csempék lennének
      elemek = elemek.filter((x) => x.name);
      if (cs) for (const k of Object.keys(cs)) cs[k] = (cs[k] || []).filter((x) => x.name);
      let html = "", osszes = [];
      const kazHtml = (l) => { const k = osszes.length; osszes.push(...l); return `<div class="kazettak">${l.map((x, i) => csempe(x, k + i)).join("")}</div>`; };
      const sorHtml = (l) => { const k = osszes.length; osszes.push(...l); return `<div class="ktalal">${l.map((x, i) => sor(x, k + i)).join("")}</div>`; };
      const eloHtml = (l) => { const k = osszes.length; osszes.push(...l); return `<div class="eloadok">${l.map((x, i) => `<button data-me="${k + i}">${ESC(x.name)}</button>`).join("")}</div>`; };
      const csoport = (cim, l, f) => (l?.length ? `<h5 class="kcsop">${cim}<span>${l.length}</span></h5>${f(l)}` : "");
      if (cs) {
        html = csoport("ARTISTS", cs.artists, eloHtml) + csoport("ALBUMS", cs.albums, kazHtml) + csoport("TRACKS", cs.tracks, sorHtml)
          + csoport("PLAYLISTS", cs.playlists, kazHtml) + csoport("RADIO", cs.radio, kazHtml);
        if (!html) html = `<div class="puzenet">${T("Nincs találat: „{q}”.", { q: ESC(kerdes) })}</div>`;
      } else if (!elemek.length) html = `<div class="puzenet">${T("A Music Assistant könyvtárában itt még nincs semmi.")}</div>`;
      else html = !hely && tip === "artist" ? eloHtml(elemek) : !hely && tip === "track" ? sorHtml(elemek) : kazHtml(elemek);
      lista.innerHTML = figy + fulek + html;
      lista.scrollTop = 0;
      kot();
      lista.querySelectorAll("[data-me]").forEach((b) => b.addEventListener("click", () => { const x = osszes[Number(b.dataset.me)]; pl.ut = [{ id: x.uri, cim: x.name }]; pl.keres = ""; this._polcRajz(); }));
      lista.querySelectorAll(".kt, [data-ms]").forEach((b) => b.addEventListener("click", () => this._maJatszik(osszes[Number(b.dataset.i ?? b.dataset.ms)])));
    } catch (err) {
      if (friss()) lista.innerHTML = figy + fulek + `<div class="puzenet">${T("A Music Assistant most nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`;
    }
  }

  // MA-tartalom indítása: csak MA-lejátszón (a sor az MA-é); máshol felajánlja a kártya MA-lejátszóit
  async _maJatszik(x, cel = null) {
    if (!x) return;
    const hsz = cel || this._hangszoro(), e = hsz?.entity;
    if (!this._maLejatszo(e)) {
      const lista = this._kimenetek.map((h, i) => [h, i]).filter(([h]) => h.entity !== HELYI && !h.tagok && this._maLejatszo(h.entity));
      if (!lista.length) return this._uzen(T("A Music Assistant tartalma Music Assistant-lejátszón szól – vegyél fel egyet a hangszórók közé (⚙)."));
      return this._uzen(T("„{c}” a Music Assistanté – Music Assistant-lejátszón szól. Hol szóljon?", { c: x.name }),
        lista.slice(0, 4).map(([h, i]) => ({ szoveg: `▶ ${KN(h)}`, fn: () => { this._kimenetValt(i, false); this._maJatszik(x, h); } })));
    }
    const fr = this._foglaloIds([e]);
    if (fr) return this._foglaltUzen(fr);
    this._polcZar();
    try { await this._hass.callWS({ type: "cantabile/ma/play", entity_id: e, uri: x.uri, ...(x.type ? { media_type: x.type } : {}), enqueue: "replace", device: ESZKOZ() }); }
    catch (err) { this._maHiba(e, err); }
  }

  // QUEUE fül MA-sornál: a szóló és a következő szám (az MA sorát az MA szerkeszti – a HA ehhez nem ad műveletet)
  async _maSorRajz(lista, e) {
    lista.innerHTML = `<div class="puzenet">${T("Betöltés…")}</div>`;
    let q;
    try { q = await this._hass.callWS({ type: "cantabile/ma/queue", entity_id: e }); }
    catch (err) { lista.innerHTML = `<div class="puzenet">${T("A Music Assistant most nem érhető el: {h}", { h: ESC(err?.message || err) })}</div>`; return; }
    if (this._polc?.ful !== "sor") return;
    if (!q?.active || !q.current) { lista.innerHTML = `<div class="puzenet">${T("A Music Assistant sora üres.")}</div>`; return; }
    const elem = (x, cim) => `<div class="masorelem">${x.image ? `<img src="${ESC(x.image)}" alt="">` : `<i></i>`}<div><small>${cim}</small><b>${ESC(x.name)}</b><span>${ESC([x.artist, x.album].filter(Boolean).join(" · "))}</span></div></div>`;
    const ism = { off: T("ki"), one: T("egy szám"), all: T("az egész sor") }[q.repeat] || q.repeat || "–";
    lista.innerHTML = `<h5 class="kcsop">MUSIC ASSISTANT<span>${ESC(T("{n} szám", { n: q.items ?? "?" }))}</span></h5>
      <div class="masor">${elem(q.current, "NOW PLAYING")}${q.next ? elem(q.next, "NEXT") : ""}</div>
      <div class="puzenet">${ESC(T("A sort a Music Assistant kezeli (keverés: {k}, ismétlés: {i}); átrendezni és törölni az MA saját felületén lehet.", { k: q.shuffle ? T("be") : T("ki"), i: ism }))}</div>`;
  }

  // ---- lenyíló előlap: bemenet és hangszín (hangszin.py) ----

  // a hangszóró bemenetei és hangszíne; hangszóróváltáskor és percenként frissül (a fogó csak akkor látszik, ha van mit állítani)
  _fedelFigyel(hsz) {
    const e = hsz && hsz.entity !== HELYI && !hsz.tagok ? hsz.entity : null, sr = this.shadowRoot;
    const t = e && this._vezTar?.[e], van = !!(t?.adat && (t.adat.inputs.length || t.adat.tone));
    sr.querySelectorAll(".fedfog").forEach((b) => { b.hidden = !van; });
    if (!e || this._hass?.states[e]?.state === "unavailable") { if (this._fedelE) this._fedelZar(); return; }
    if (this._fedelE && this._fedelE !== e) this._fedelZar();
    if (!t || (Date.now() - t.ido > 60000 && !t.tolt)) this._vezerlok(e);
    else if (this._fedelE === e && !this._fedelHuz) this._fedelRajz();
  }

  async _vezerlok(e) {
    this._vezTar = this._vezTar || {};
    const t = this._vezTar[e] = { ...(this._vezTar[e] || {}), tolt: true, ido: Date.now() };
    let ok = true;
    try { t.adat = await this._hass.callWS({ type: "cantabile/controls", entity_id: e }); } catch (_) { t.adat = t.adat || null; ok = false; }
    t.tolt = false; t.ido = Date.now();
    if (ok && !this._fuggo(e)) { if (this._hangTar) delete this._hangTar[e]; if (this._eqTar) delete this._eqTar[e]; }
    this._fedelFigyel(this._hangszoro());
    if (this._fedelE === e && !this._fedelHuz) this._fedelRajz();
  }

  // van-e még el nem küldött vagy úton lévő állítás ezen a hangszórón (addig a helyi állapot az érvényes)
  _fuggo(e) { return !!this._eqKuld?.[e] || Date.now() - (this._valtIdo?.[e] || 0) < 1200; }
  _valtozott(e) { this._valtIdo = this._valtIdo || {}; this._valtIdo[e] = Date.now(); this._fedelEbreszt();
  }

  // a hangszóró most a saját bemenetéről szól (BT, LINE IN…), nem a hálózatról
  _bemenetrol(e) {
    const t = this._vezTar?.[e]?.adat, src = this._hass?.states[e]?.attributes?.source;
    if (!src || src === "Network") return false;
    // még nem olvastuk ki a bemeneteit (pl. épp most töltött be a kártya): a BT- és vonalbemenet neve is elárulja
    if (!t) return /^(bluetooth|line[- ]?in|optical( in)?|phono( in)?)$/i.test(src);
    return t.inputs.includes(src) && t.inputs.includes("Network");
  }

  _fedelNyit() {
    const hsz = this._hangszoro(), p = this.shadowRoot.getElementById("fedel");
    if (!p || !hsz || hsz.entity === HELYI) return;
    if (this._fedelE) return this._fedelZar();
    this._fedelE = hsz.entity;
    this._fedelRajz();
    p.hidden = false; void p.offsetWidth; p.classList.add("nyitva");
    this._fedelEbreszt();
    this._vezerlok(hsz.entity);
  }

  _fedelZar() {
    const p = this.shadowRoot?.getElementById("fedel");
    this._fedelE = null; this._fedelHuz = false; this._eqNev = null; this._eqTorol = false; clearTimeout(this._fedelIdo); this._btFigyel(null);
    clearTimeout(this._eqToloIdo); this._eqKuldendo = null;
    if (this._fedelLap === "bt") this._fedelLap = "alap";
    if (!p || p.hidden) return;
    p.classList.remove("nyitva");
    setTimeout(() => { if (!this._fedelE) { p.hidden = true; p.innerHTML = ""; } }, 450);
  }

  // tétlenség után magától becsukódik; minden érintés újraindítja az órát
  _fedelEbreszt() {
    const MP = this._fedelLap === "auto" || this._fedelLap === "bt" || this._eqNev != null ? 60 : 20, p = this.shadowRoot.getElementById("fedel"), cs = p?.querySelector(".fido");
    clearTimeout(this._fedelIdo);
    this._fedelIdo = setTimeout(() => this._fedelZar(), MP * 1000);
    if (cs) { p.style.setProperty("--fido", `${MP}s`); cs.style.animation = "none"; void cs.offsetWidth; cs.style.animation = ""; }
  }

  // a WiiM sávjai a még el nem küldött helyi állításokkal együtt; a BASS / TREBLE ezekből jön (együtt mozognak)
  _eqSavok(e) {
    const eq = this._vezTar?.[e]?.adat?.eq, helyi = this._eqTar?.[e] || {};
    return eq ? eq.bands.map((b) => ({ n: b.n, v: helyi[b.n] ?? b.v })) : [];
  }
  _eqBe(e) { const eq = this._vezTar?.[e]?.adat?.eq; return !!eq && (this._eqTar?.[e]?.__be ?? eq.on); }
  _eqFok(e, f) {
    const alak = f === "bass" ? EQ_MELY : EQ_MAGAS, sav = this._eqSavok(e).filter((b) => alak[String(b.n).toLowerCase()] === 1);
    if (!this._eqBe(e) || !sav.length) return 0;
    return Math.max(-10, Math.min(10, Math.round((sav.reduce((x, b) => x + Number(b.v), 0) / sav.length - 50) / 2.5)));
  }

  // a profilok listája a ◀ ▶ léptetéshez: a WiiM beépített hangzásai, utána a saját profilok (★)
  _eqLista(e) {
    const eq = this._vezTar?.[e]?.adat?.eq, own = Object.keys(this._eqProf?.own || {}).sort((a, b) => a.localeCompare(b));
    return [...(eq?.presets || []).map((n) => ({ ref: `wiim:${n}`, nev: n })), ...own.map((n) => ({ ref: `own:${n}`, nev: `★ ${n}` }))];
  }
  _eqMost(e) {
    const eq = this._vezTar?.[e]?.adat?.eq;
    if (!eq) return null;
    if (this._eqTar?.[e] && Object.keys(this._eqTar[e]).some((k) => !k.startsWith("__"))) return this._eqTar[e].__ref || null;
    if (this._eqTar?.[e]?.__ref) return this._eqTar[e].__ref;
    if (eq.name && eq.presets.includes(eq.name)) return `wiim:${eq.name}`;
    const savok = Object.fromEntries(eq.bands.map((b) => [String(b.n).toLowerCase(), Number(b.v)]));
    for (const [n, sv] of Object.entries(this._eqProf?.own || {}))
      if (Object.entries(sv).every(([k, v]) => Math.abs(Number(v) - (savok[k.toLowerCase()] ?? 50)) < 0.6)) return `own:${n}`;
    return null;
  }

  _fedelRajz() {
    const p = this.shadowRoot.getElementById("fedel"), e = this._fedelE;
    if (!p || !e) return;
    const t = this._vezTar?.[e], adat = t?.adat, src = this._hass?.states[e]?.attributes?.source;
    const lap = this._fedelLap === "bt" && adat?.bt ? "bt" : adat?.eq && ["eq", "auto"].includes(this._fedelLap) ? this._fedelLap : "alap";
    const par = this._btParosit?.e === e && Date.now() - this._btParosit.ido < 180000;
    const kulcs = JSON.stringify([e, adat, src, lap, this._hangTar?.[e], this._eqTar?.[e], this._eqProfVer || 0, this._eqNev != null, this._eqTorol, this._eqMufajok?.length, par, !!this._hass?.user?.is_admin]);
    if (p.dataset.k === kulcs && p.innerHTML) return;
    const akt = this.shadowRoot.activeElement;
    if (p.innerHTML && akt && p.contains(akt) && /^(INPUT|SELECT)$/.test(akt.tagName)) return;   // ne vegye el a fókuszt
    p.dataset.k = kulcs;
    const zar = `<button class="fzar" title="CLOSE"><i></i><small>CLOSE</small></button><div class="fido"></div>`;
    if (!adat) { p.innerHTML = `<div class="fmeg">${t?.tolt !== false ? T("Olvasom a hangszóró beállításait…") : T("Ezen a hangszórón nincs állítható bemenet vagy hangszín.")}</div>${zar}`; return this._fedelEbreszt(); }
    const fulek = adat.eq ? `<div class="ffulek">${[["alap", "INPUT · TONE"], ["eq", "EQ"]].map(([l, n]) => `<button class="fful${lap === l || (l === "eq" && lap === "auto") ? " akt" : ""}" data-l="${l}">${n}</button>`).join("")}</div>` : "";
    p.classList.toggle("fulos", !!adat.eq);
    p.classList.toggle("autolap", lap === "auto" || lap === "bt");
    if (lap === "bt") p.innerHTML = fulek + this._btLapHtml(e, adat, src) + zar;
    else if (lap === "eq") p.innerHTML = fulek + this._eqLapHtml(e, adat) + zar;
    else if (lap === "auto") p.innerHTML = fulek + this._autoLapHtml(e) + zar;
    else {
      const btKi = adat.bt && src === "Bluetooth" ? adat.bt.devices.find((d) => d.connected) : null;
      const btSor = adat.bt && src === "Bluetooth" ? `<span class="fbtall${btKi ? " ok" : ""}">${btKi ? `✓ ${ESC(btKi.name)}` : ESC(T("várja a telefont / tabletet"))}</span>` : "";
      const bem = adat.inputs.length ? `<div class="fbem"><div class="fbill">${adat.inputs.map((n) => `<button class="bill fbe${n === src || (n === "Network" && !adat.inputs.includes(src)) ? " akt" : ""}" data-n="${ESC(n)}" title="${ESC(T("Bemenet: {b}", { b: n }))}"><span class="led"></span><b>${ESC(BEMENET_NEV(n))}</b></button>`).join("")}${adat.bt ? `<button class="bill fpair" title="${T("Telefon / tablet csatlakoztatása Bluetooth-on – útmutató")}"><span class="led"></span><b>PAIR</b></button>` : ""}</div><small>INPUT${btSor ? " · BT: " : ""}${btSor}</small></div>` : "";
      const ertek = (f) => (adat.eq ? this._eqFok(e, f) : this._hangTar?.[e]?.[f] ?? adat.tone?.[f] ?? 0);
      const tarcsa = (f, cim, felirat) => {
        let jel = "";
        for (let k = -10; k <= 10; k += 2) jel += `<i class="tj${k % 10 === 0 ? " n" : ""}" style="transform:rotate(${k * 13.5}deg)"></i>`;
        return `<div class="fhang" data-f="${f}" title="${cim}">${jel}<b class="tsz" style="left:6px">−</b><b class="tsz" style="right:6px">+</b>
          <div class="kgomb"><div class="ksapka" style="transform:rotate(${ertek(f) * 13.5}deg)"></div></div><div class="tcim">${felirat} <span>${ertek(f) > 0 ? "+" : ""}${ertek(f)}</span></div></div>`;
      };
      const hang = adat.tone ? tarcsa("bass", T("Mély: koppintva, húzva vagy görgetve; dupla koppintás: 0"), "BASS") + tarcsa("treble", T("Magas: koppintva, húzva vagy görgetve; dupla koppintás: 0"), "TREBLE") : "";
      const loud = adat.loudness != null ? `<div class="fbem"><div class="fbill"><button class="bill floud${(this._eqTar?.[e]?.__loud ?? adat.loudness) ? " akt" : ""}" title="${T("Hangosság-kiegyenlítés (a hangszóró saját LOUDNESS-e)")}"><span class="led"></span><b>LOUDNESS</b></button></div><small>TONE</small></div>` : "";
      p.innerHTML = fulek + (bem || hang || loud ? bem + hang + loud : `<div class="fmeg">${T("Ezen a hangszórón nincs állítható bemenet vagy hangszín.")}</div>`) + zar;
      p.querySelectorAll(".fhang").forEach((h) => this._kisTarcsa(h, e));
    }
    p.querySelectorAll(".ftolo").forEach((h) => this._eqTolo(h, e));
    this._fedelEbreszt();
  }

  // EQ fül: profil-kijelző ◀ ▶ léptetéssel, EQ ON · STORE · DEL · AUTO billentyűk és a 10 tolókar (régi grafikus EQ mintára)
  _eqLapHtml(e, adat) {
    const eq = adat.eq, be = this._eqBe(e), most = this._eqMost(e), lista = this._eqLista(e);
    const nev = this._eqNev != null ? "" : most ? (lista.find((x) => x.ref === most)?.nev || most.replace(/^\w+:/, "")) : "CUSTOM";
    const sajat = most?.startsWith("own:");
    const kij = this._eqNev != null
      ? `<input class="feqnev" maxlength="24" placeholder="${T("Profil neve")}" value="${ESC(this._eqNev)}" enterkeyhint="done"><button class="bill feqok"><span class="led"></span><b>OK</b></button>`
      : `<button class="feqlep" data-lep="-1" title="${T("Előző profil")}"><svg viewBox="0 0 10 10"><path d="M7 1 2 5l5 4z"/></svg></button><b class="feqn${be ? "" : " ki"}">${ESC(String(nev).toUpperCase())}</b><button class="feqlep" data-lep="1" title="${T("Következő profil")}"><svg viewBox="0 0 10 10"><path d="M3 1l5 4-5 4z"/></svg></button>`;
    const gomb = (o, n, akt, cim) => `<button class="bill ${o}${akt ? " akt" : ""}" title="${cim}"><span class="led"></span><b>${n}</b></button>`;
    const FREK = { band31hz: "31", band63hz: "63", band125hz: "125", band250hz: "250", band500hz: "500", band1khz: "1k", band2khz: "2k", band4khz: "4k", band8khz: "8k", band16khz: "16k" };
    const tolok = this._eqSavok(e).map((b) => `<div class="ftolo${be ? "" : " ki"}" data-n="${ESC(b.n)}" title="${ESC(FREK[String(b.n).toLowerCase()] || b.n)} Hz"><div class="fsin"><i class="fnull"></i><i class="ffog" style="bottom:${Math.max(0, Math.min(100, Number(b.v)))}%"></i></div><small>${FREK[String(b.n).toLowerCase()] || ""}</small></div>`).join("");
    return `<div class="feq"><div class="feqbal"><div class="fvfd"><small>PROFILE · ${ESC(BEMENET_NEV(eq.source === "wifi" ? "Network" : eq.source === "bluetooth" ? "Bluetooth" : eq.source === "line-in" ? "Line In" : eq.source || ""))}</small><div class="fvsor">${kij}</div></div>
      <div class="fbill feqgombok">${gomb("feqbe", "EQ ON", be, T("Equalizer be / ki"))}${gomb("feqtar", "STORE", this._eqNev != null, T("A mostani beállítás mentése saját profilként"))}${sajat && this._hass?.user?.is_admin ? gomb("feqdel", this._eqTorol ? "DEL?" : "DEL", this._eqTorol, T("A saját profil törlése (még egy koppintás)")) : ""}${gomb("feqauto", "AUTO", false, T("Automatikus profil forrás és műfaj szerint"))}</div></div>
      <div class="ftolok">${tolok}</div></div>`;
  }

  // PAIR: lépésenkénti útmutató a telefon / tablet Bluetooth-csatlakoztatásához. A párosítást mindig a telefon kezdeményezi
  // (a weboldal nem fér a Bluetoothhoz) – a kártya BT-re váltja a hangszórót, megmondja a nevét, és figyeli, ki csatlakozik
  _btLapHtml(e, adat, src) {
    const bt = adat.bt, nev = bt.name || this._hszNev(e), ki = bt.devices.find((d) => d.connected), android = /Android/i.test(navigator.userAgent || "");
    const ismert = bt.devices.length ? bt.devices.map((d) => `<span class="${d.connected ? "ok" : ""}">${d.connected ? "✓ " : ""}${ESC(d.name)}</span>`).join("") : `<span>${T("még nincs")}</span>`;
    const par = this._btParosit?.e === e && Date.now() - this._btParosit.ido < 180000;
    const allapot = src !== "Bluetooth" ? T("Átváltás Bluetooth-bemenetre…")
      : ki ? T("✓ Csatlakozott: {n} – indítsd a zenét az eszközön, a(z) {h} szól.", { n: ki.name, h: this._hszNev(e) })
      : par ? T("Párosítási mód: a(z) {h} most látható (a fénye lassan villog zölden) – várja az eszközt.", { h: this._hszNev(e) })
      : T("A(z) {h} Bluetooth-bemeneten várja az eszközt.", { h: this._hszNev(e) });
    return `<div class="fauto-lap fbt-lap"><div class="fafej"><button class="bill fvissza-bt"><span class="led"></span><b>‹ INPUT</b></button><span class="fbtall${ki ? " ok" : ""}">${ESC(allapot)}</span></div>
      ${ki && src === "Bluetooth" ? `<div class="fbtfoglalt">${ESC(T("A(z) {h} egyszerre csak egy eszközt fogad, és most ez csatlakozik: {n}. Ha nem erről akarsz zenét küldeni, előbb ezen az eszközön kapcsold ki a Bluetooth-t (vagy a Bluetooth-beállításaiban bontsd a kapcsolatot) – addig a többi eszköz nem is látja a hangszórót. A hangszóró maga nem tudja leválasztani.", { h: nev, n: ki.name }))}</div>` : ""}
      <ol class="fbtlep">
        <li>${T("A telefonon / tableten nyisd meg a Bluetooth-beállításokat")}${android ? ` <a class="fbtnyit" href="intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end">${T("Megnyitás")}</a>` : ""}.</li>
        <li>${T("Válaszd ki a listából:")} <b>${ESC(nev)}</b> ${T("(első alkalommal: párosítás). Ha nem látszik, frissítsd a listát, vagy kapcsold be újra a párosítási módot:")} <button class="fbtpar" type="button">PAIRING MODE</button></li>
        <li>${T("Indítsd a zenét az eszköz bármelyik appjában – a hang a hangszóróból szól. A kártyán a kazetta „BT IN”-t mutat.")}</li>
      </ol>
      <div class="fbtism"><small>${T("ISMERT ESZKÖZÖK")}</small>${ismert}</div>
      <div class="fmeg fbtmas">${ESC(T("Párosítás nélkül, Wi-Fi-n: a zenei app hangszóró-ikonjával (Spotify Connect, TIDAL Connect, AirPlay) válaszd a(z) {n} hangszórót; vagy a kártya PHONE fülén játszd le az eszköz saját fájljait.", { n: nev }))}</div></div>`;
  }

  // AUTO lap: forrásonként és műfajonként egy profil; a műfaj erősebb (zenemappából szóló albumnál)
  _autoLapHtml(e) {
    const pr = this._eqProf;
    if (!pr) return `<div class="fmeg">${T("Olvasom a profilokat…")}</div>`;
    const lista = this._eqLista(e);
    const admin = !!this._hass?.user?.is_admin;
    const valaszto = (kind, key, ert) => `<select class="fauto" data-kind="${kind}" data-key="${ESC(key)}"${admin ? "" : " disabled"}><option value="">—</option><option value="off"${ert === "off" ? " selected" : ""}>EQ OFF</option>${lista.map((x) => `<option value="${ESC(x.ref)}"${x.ref === ert ? " selected" : ""}>${ESC(x.nev)}</option>`).join("")}</select>`;
    const FORRAS_NEV = { radio: "RADIO", nas: "NAS", deezer: "DEEZER", tidal: "TIDAL", qobuz: "QOBUZ", spotify: "SPOTIFY", bt: "BT IN", line: "LINE IN", optical: "OPT IN", tv: "TV", phono: "PHONO", egyeb: T("EGYÉB") };
    const forrasok = pr.sources.map((k) => `<label class="fasor"><span>${FORRAS_NEV[k] || k.toUpperCase()}</span>${valaszto("source", k, pr.auto.source[k] || "")}</label>`).join("");
    const kiosztott = Object.values(pr.auto.genre || {}), nevek = new Map();
    kiosztott.forEach((g) => nevek.set(g.name.toLowerCase(), g.name));
    (this._eqMufajok || []).forEach((g) => { if (g.name && !nevek.has(g.name.toLowerCase())) nevek.set(g.name.toLowerCase(), g.name); });
    const ertekG = (n) => kiosztott.find((g) => g.name.toLowerCase() === n.toLowerCase())?.profile || "";
    const mufajok = [...nevek.values()].map((n) => `<label class="fasor"><span>${ESC(n)}</span>${valaszto("genre", n, ertekG(n))}</label>`).join("")
      || `<div class="fmeg">${T("A zenemappa műfajai a GENRE fülön gyűlnek össze; ha nincs zenemappa, csak a forrás szerinti profil működik.")}</div>`;
    return `<div class="fauto-lap"><div class="fafej"><button class="bill fvissza"><span class="led"></span><b>‹ EQ</b></button><span>${T("Automatikus profil: a műfaj (zenemappa) erősebb a forrásnál. Csak forrás- vagy albumváltáskor vált, a kézi állítás addig megmarad.")}${admin ? "" : ` ${T("A szabályokat rendszergazda módosíthatja.")}`}</span></div>
      <div class="fakol"><div><small>SOURCE</small>${forrasok}</div><div><small>GENRE</small>${mufajok}</div></div></div>`;
  }

  // a fedél kezelése egyszer, eseménydelegálással (a tartalma újrarajzolódik)
  _fedelKezel(p) {
    if (!p) return;
    ["pointerdown", "wheel", "keydown", "input", "change"].forEach((ev) => p.addEventListener(ev, () => this._fedelEbreszt(), { passive: true }));
    p.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const e = this._fedelE, c = (s) => ev.target.closest(s);
      if (c(".fzar")) return this._fedelZar();
      if (c(".fful")) { this._fedelLap = c(".fful").dataset.l; this._eqNev = null; this._eqTorol = false; if (this._fedelLap === "eq") this._eqProfilok(); return this._fedelRajz(); }
      const b = c(".fbe");
      if (b && !b.classList.contains("akt")) return this._bemenetValt(e, b.dataset.n);
      if (c(".fpair")) { this._fedelLap = "bt"; this._btFigyel(e); this._fedelRajz(); return this._parositas(e); }
      if (c(".fbtpar")) return this._parositas(e, true);
      if (c(".fvissza-bt")) { this._fedelLap = "alap"; this._btFigyel(null); return this._fedelRajz(); }
      if (c(".fbtnyit")) return;            // a hivatkozás nyissa meg a beállításokat
      if (c(".floud")) { const most = this._eqTar?.[e]?.__loud ?? this._vezTar?.[e]?.adat?.loudness; return this._eqKuldj(e, { loudness: !most }, { __loud: !most }); }
      if (c(".feqbe")) return this._eqKuldj(e, { on: !this._eqBe(e) }, { __be: !this._eqBe(e) });
      if (c(".feqlep")) {
        const L = this._eqLista(e); if (!L.length) return;
        const i = L.findIndex((x) => x.ref === this._eqMost(e)), j = (((i < 0 ? (Number(c(".feqlep").dataset.lep) > 0 ? -1 : 0) : i) + Number(c(".feqlep").dataset.lep)) % L.length + L.length) % L.length;
        return this._eqProfilTesz(e, L[j].ref);
      }
      if (c(".feqtar")) { this._eqNev = this._eqNev != null ? null : ""; this._fedelRajz(); return p.querySelector(".feqnev")?.focus(); }
      if (c(".feqok")) return this._eqMent(e);
      if (c(".feqdel")) {
        if (!this._eqTorol) { this._eqTorol = true; this._fedelRajz(); clearTimeout(this._eqTorolIdo); this._eqTorolIdo = setTimeout(() => { this._eqTorol = false; this._fedelRajz(); }, 4000); return; }
        this._eqTorol = false;
        const ref = this._eqMost(e);
        if (ref?.startsWith("own:")) this._hass.callWS({ type: "cantabile/eq/profile/delete", name: ref.slice(4) }).then(() => this._eqProfilok(true)).catch((err) => this._hivHiba(e, err));
        return;
      }
      if (c(".feqauto")) { this._fedelLap = "auto"; this._eqProfilok(true); this._eqMufajLista(); return this._fedelRajz(); }
      if (c(".fvissza")) { this._fedelLap = "eq"; return this._fedelRajz(); }
    });
    p.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.closest(".feqnev")) { ev.preventDefault(); this._eqMent(this._fedelE); } });
    p.addEventListener("input", (ev) => { if (ev.target.closest(".feqnev")) this._eqNev = ev.target.value; });
    p.addEventListener("change", (ev) => {
      const s = ev.target.closest(".fauto"); if (!s) return;
      this._hass.callWS({ type: "cantabile/eq/auto/set", kind: s.dataset.kind, key: s.dataset.key, profile: s.value })
        .then(() => this._eqProfilok(true)).catch((err) => this._hivHiba(this._fedelE, err));
    });
  }

  // PAIR: BT-bemenetre vált, és ha épp nem csatlakozik hozzá más eszköz, párosítási módba teszi (a WiiM fénye lassan
  // villog zölden) – így egy új telefon / tablet is megtalálja. `kezi`: a PAIRING MODE billentyű (újra, ha lejárt)
  async _parositas(e, kezi = false) {
    if (this._foglaloIds([e])) return this._foglaltUzen(this._foglaloIds([e]));
    if (this._hass.states[e]?.attributes?.source !== "Bluetooth") {
      if (!(await this._bemenetValt(e, "Bluetooth"))) return;
      await new Promise((r) => setTimeout(r, 2500));      // a WiiM előbb a legutóbbi eszközt próbálja visszahívni
      if (this._fedelE !== e || this._fedelLap !== "bt") return;
      await this._vezerlok(e);
    }
    if (this._fedelE !== e || this._fedelLap !== "bt") return;
    if (this._vezTar?.[e]?.adat?.bt?.devices?.some((d) => d.connected)) { if (kezi) this._uzen(T("Előbb a csatlakozott eszközön kapcsold ki a Bluetooth-t.")); return; }
    try {
      await this._hass.callWS({ type: "cantabile/bt/pair", entity_id: e });
      this._btParosit = { e, ido: Date.now() };
    } catch (err) {
      const m = String(err?.message || "");
      if (m.startsWith("busy:")) this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(e), n: m.slice(5) })); else this._hivHiba(e, err);
    }
    this._fedelRajz();
  }

  // amíg a PAIR-útmutató nyitva van, 3 mp-enként megnézi, csatlakozott-e már az eszköz
  _btFigyel(e) {
    clearInterval(this._btIdo); this._btIdo = null;
    if (!e) return;
    this._btIdo = setInterval(() => {
      if (this._fedelE !== e || this._fedelLap !== "bt") { clearInterval(this._btIdo); this._btIdo = null; return; }
      if (!this._vezTar?.[e]?.tolt) this._vezerlok(e);
    }, 3000);
  }

  async _eqProfilok(friss = false) {
    if (this._eqProf && !friss) return;
    try { this._eqProf = await this._hass.callWS({ type: "cantabile/eq/profiles" }); } catch (_) { this._eqProf = this._eqProf || { own: {}, auto: { source: {}, genre: {} }, sources: [] }; }
    this._eqProfVer = (this._eqProfVer || 0) + 1;
    this._fedelRajz();
  }

  async _eqMufajLista() {
    const nas = String(this._config.magno?.nas || "").replace(/\/$/, "");
    if (!nas || this._eqMufajok) return;
    try {
      const r = await this._hass.callWS({ type: "cantabile/genres", mappa: nas, kihagy: [this._telMappa(), this._config.magno?.hires].filter(Boolean) });
      this._eqMufajok = (r.genres || []).filter((g) => g.name);
    } catch (_) { this._eqMufajok = []; }
    this._fedelRajz();
  }

  // beküldés (foglalás-figyeléssel); a helyi állapot azonnal látszik, utána a hangszóró friss adata
  async _eqKuldj(e, adat, helyi = null) {
    const fr = this._foglaloIds([e]);
    if (fr) return this._foglaltUzen(fr);
    this._eqTar = this._eqTar || {}; this._eqKuld = this._eqKuld || {};
    if (helyi) { this._eqTar[e] = { ...(this._eqTar[e] || {}), ...helyi }; this._fedelRajz(); }
    this._eqKuld[e] = (this._eqKuld[e] || 0) + 1;
    try { await this._hass.callWS({ type: "cantabile/eq/set", entity_id: e, ...adat }); }
    catch (err) {
      const m = String(err?.message || "");
      if (m.startsWith("busy:")) this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(e), n: m.slice(5) })); else this._hivHiba(e, err);
    } finally { this._eqKuld[e]--; }
    if (!this._eqKuld[e]) { clearTimeout(this._eqFrissIdo); this._eqFrissIdo = setTimeout(() => this._vezerlok(e), 500); }
  }

  _eqProfilTesz(e, ref) {
    clearTimeout(this._eqToloIdo); this._eqKuldendo = null;
    this._eqTar = this._eqTar || {};
    this._eqTar[e] = {};
    return this._eqKuldj(e, ref.startsWith("own:") ? { profile: ref.slice(4) } : { preset: ref.slice(5) }, { __ref: ref, __be: true });
  }

  async _eqMent(e) {
    const nev = String(this._eqNev || "").trim();
    if (!nev) return;
    this._eqNev = null;
    this.shadowRoot.activeElement?.blur?.();
    try {
      await this._hass.callWS({ type: "cantabile/eq/profile/save", name: nev, entity_id: e });
      await this._eqProfilok(true);
      this._uzen(T("Elmentve: {n}", { n: nev }));
    } catch (err) { this._hivHiba(e, err); }
    this._fedelRajz();
  }

  // egy EQ-tolókar: függőleges húzás, görgő ±2,5, dupla koppintás 0 (50); a változott sávok 350 ms után együtt mennek
  _eqTolo(h, e) {
    const n = h.dataset.n, sin = h.querySelector(".fsin"), fog = h.querySelector(".ffog");
    const most = () => Number(this._eqSavok(e).find((b) => b.n === n)?.v ?? 50);
    const allit = (v) => {
      v = Math.max(0, Math.min(100, Math.round(v * 2) / 2));
      this._eqTar = this._eqTar || {};
      this._eqTar[e] = { ...(this._eqTar[e] || {}), [n]: v, __be: true, __ref: null };
      fog.style.bottom = `${v}%`;
      this._valtozott(e);
      this._eqKuldendo = { ...(this._eqKuldendo || {}), [n]: v };
      clearTimeout(this._eqToloIdo);
      this._eqToloIdo = setTimeout(() => { const s = this._eqKuldendo; this._eqKuldendo = null; if (s) this._eqKuldj(e, { bands: s }); }, 350);
      if (id == null) this._fedelRajz();          // görgetés: a kijelző (CUSTOM) és a BASS / TREBLE rögtön; húzásnál az elengedéskor
    };
    const hely = (ev) => { const r = sin.getBoundingClientRect(); return (1 - (ev.clientY - r.top) / r.height) * 100; };
    let id = null;
    sin.addEventListener("pointerdown", (ev) => { ev.stopPropagation(); id = ev.pointerId; sin.setPointerCapture(id); this._fedelHuz = true; allit(hely(ev)); });
    sin.addEventListener("pointermove", (ev) => { if (ev.pointerId === id) allit(hely(ev)); });
    const vege = (ev) => { if (ev.pointerId !== id) return; id = null; this._fedelHuz = false; this._fedelRajz(); };
    sin.addEventListener("pointerup", vege); sin.addEventListener("pointercancel", vege); sin.addEventListener("lostpointercapture", vege);
    sin.addEventListener("dblclick", (ev) => { ev.stopPropagation(); allit(50); });
    h.addEventListener("wheel", (ev) => { ev.preventDefault(); ev.stopPropagation(); allit(most() + ((ev.deltaY || -ev.deltaX) < 0 ? 2.5 : -2.5)); }, { passive: false });
  }

  async _bemenetValt(e, n) {
    if (!e) return false;
    const fr = this._foglaloIds([e]);
    if (fr) { this._foglaltUzen(fr); return false; }
    this.shadowRoot.querySelectorAll(".fbe").forEach((x) => x.classList.toggle("akt", x.dataset.n === n));
    try {
      await this._hass.callWS({ type: "cantabile/input/select", entity_id: e, source: n, device: ESZKOZ() });
      return true;
    } catch (err) {
      const m = String(err?.message || "");
      if (m.startsWith("busy:")) this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(e), n: m.slice(5) }));
      else this._hivHiba(e, err);
      const p = this.shadowRoot.getElementById("fedel"); if (p) p.dataset.k = "";
      this._fedelRajz();
      return false;
    }
  }

  // BASS / TREBLE tárcsa: −10 … +10 (±135°); húzás a tárcsa körül, görgő ±1, koppintás a bal / jobb felén ∓1, dupla koppintás 0
  _kisTarcsa(h, e) {
    const f = h.dataset.f, g = h.querySelector(".kgomb"), sapka = h.querySelector(".ksapka"), felirat = h.querySelector(".tcim span");
    this._hangTar = this._hangTar || {};
    const vanEq = () => !!this._vezTar?.[e]?.adat?.eq;
    const most = () => (vanEq() ? this._eqFok(e, f) : this._hangTar[e]?.[f] ?? this._vezTar?.[e]?.adat?.tone?.[f] ?? 0);
    const allit = (v) => {
      v = Math.max(-10, Math.min(10, Math.round(v)));
      if (v === most() && (vanEq() || this._hangTar[e]?.[f] != null)) return;
      this._hangTar[e] = { ...(this._hangTar[e] || {}), [f]: v };
      if (vanEq()) {
        // a tolókarok is mozdulnak: ugyanaz a sávalak, mint a szerveren (hangszin.py)
        const alak = f === "bass" ? EQ_MELY : EQ_MAGAS, masik = f === "bass" ? "treble" : "bass", mv = this._eqBe(e) ? this._eqFok(e, masik) : 0;
        const masAlak = f === "bass" ? EQ_MAGAS : EQ_MELY, uj = { __be: true, __ref: null };
        for (const b of this._eqSavok(e)) {
          const k = String(b.n).toLowerCase();
          if (alak[k]) uj[b.n] = 50 + v * 2.5 * alak[k];
          else if (!this._eqBe(e) && masAlak[k]) uj[b.n] = 50 + mv * 2.5 * masAlak[k];
        }
        this._eqTar = this._eqTar || {}; this._eqTar[e] = { ...(this._eqTar[e] || {}), ...uj };
      }
      sapka.style.transform = `rotate(${v * 13.5}deg)`; felirat.textContent = `${v > 0 ? "+" : ""}${v}`;
      this._valtozott(e);
      clearTimeout(this._hangKuld?.[f]); this._hangKuld = this._hangKuld || {};
      const kuld = v;
      this._hangKuld[f] = setTimeout(async () => {
        this._eqKuld = this._eqKuld || {}; this._eqKuld[e] = (this._eqKuld[e] || 0) + 1;
        try { await this._hass.callWS({ type: "cantabile/tone/set", entity_id: e, [f]: kuld }); this._eqKuld[e]--; if (!this._eqKuld[e]) setTimeout(() => this._vezerlok(e), 500); }
        catch (err) {
          const m = String(err?.message || "");
          if (m.startsWith("busy:")) this._uzen(T("A(z) {h} foglalt: {n} használja.", { h: this._hszNev(e), n: m.slice(5) })); else this._hivHiba(e, err);
          this._eqKuld[e]--; if (this._hangTar?.[e]) delete this._hangTar[e][f]; if (this._eqTar) delete this._eqTar[e];
          this._vezerlok(e); this._fedelRajz();
        }
      }, 350);
    };
    const szog = (ev) => {
      const r = g.getBoundingClientRect();
      let a = (Math.atan2(ev.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - ev.clientY) * 180) / Math.PI;
      if (a > 135 || a < -135) a = most() > 0 ? 135 : -135;
      return a / 13.5;
    };
    let id = null, mozdult = false, kezd = null;
    g.addEventListener("pointerdown", (ev) => { ev.stopPropagation(); id = ev.pointerId; g.setPointerCapture(id); mozdult = false; kezd = [ev.clientX, ev.clientY]; this._fedelHuz = true; });
    g.addEventListener("pointermove", (ev) => {
      if (ev.pointerId !== id) return;
      if (!mozdult && Math.hypot(ev.clientX - kezd[0], ev.clientY - kezd[1]) < 6) return;
      mozdult = true; allit(szog(ev));
    });
    const vege = (ev) => {
      if (ev.pointerId !== id) return;
      id = null; this._fedelHuz = false;
      if (!mozdult && ev.type === "pointerup") { const r = g.getBoundingClientRect(); allit(most() + (ev.clientX < r.left + r.width / 2 ? -1 : 1)); }
    };
    g.addEventListener("pointerup", vege);
    g.addEventListener("pointercancel", vege); g.addEventListener("lostpointercapture", vege);
    g.addEventListener("dblclick", (ev) => { ev.stopPropagation(); allit(0); });
    h.addEventListener("wheel", (ev) => { ev.preventDefault(); ev.stopPropagation(); allit(most() + ((ev.deltaY || -ev.deltaX) < 0 ? 1 : -1)); }, { passive: false });
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
    sr.getElementById("mutato").style.left = `${this._poz(c.adok[mutat]?.frekvencia ?? this._savKozep())}%`;
    sr.querySelectorAll(".ado").forEach((b) => b.classList.toggle("akt", radioSzol && Number(b.dataset.i) === i));
    sr.querySelectorAll(".hsz").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === this._hsz));
    const hu = this._hangUtolso(), L = this._hszIdx, bton = this._hsz === this._btIdx;
    sr.querySelectorAll(".hszv").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === hu));
    sr.querySelectorAll(".fhsz, .flamp").forEach((b) => b.classList.toggle("akt", Number(b.dataset.i) === hu));
    // az elérhetetlen lejátszó állása halvány, kiválasztva piros lámpával
    const nincs = (i) => this._hass?.states[this._kimenetek[i]?.entity]?.state === "unavailable";
    sr.querySelectorAll(".fhsz, .flamp, .hszv").forEach((b) => b.classList.toggle("nincs", b.dataset.i != null && nincs(Number(b.dataset.i))));
    // más felhasználó foglalta: halvány, a lámpa lassan villog
    const fogl = (i) => !!this._foglalo(this._kimenetek[i]);
    sr.querySelectorAll(".fhsz, .flamp, .hszv, .hsz").forEach((b) => b.classList.toggle("foglalt", b.dataset.i != null && fogl(Number(b.dataset.i))));
    sr.querySelectorAll(".forgo").forEach((x) => x.classList.toggle("bton", bton));
    sr.querySelectorAll(".forgo .vsapka").forEach((x) => { x.style.transform = `rotate(${this._forgoSzog(hu)}deg)`; });
    sr.querySelectorAll(".thsz .tfog").forEach((x) => x.style.setProperty("--p", L.length > 1 ? L.indexOf(hu) / (L.length - 1) : 0));
    sr.querySelectorAll(".btv").forEach((b) => b.classList.toggle("akt", (b.dataset.b === "1") === bton));
    sr.querySelectorAll(".tbt .tfog").forEach((x) => x.style.setProperty("--p", bton ? 0 : 1));
    sr.querySelectorAll(".tolok").forEach((x) => x.classList.toggle("bton", bton));
    sr.querySelectorAll(".hszfej").forEach((x) => { x.textContent = elerheto ? KN(hsz) : `${KN(hsz)} · UNAVAILABLE`; });
    const adoNev = kulso ? kulso.nev : c.adok[i]?.nev;
    const dal = [a.media_artist, a.media_title].filter((x) => x && x !== adoNev && !URLSZERU(x)).join(" – ");
    const bem = !radioSzol && this._bemenetrol(hsz?.entity) ? BEMENET_NEV(a.source) : "";
    sr.getElementById("ado").innerHTML = radioSzol && kulso ? `<b>${ESC(kulso.nev)}</b> · NET${kulso.orszag ? ` · ${ESC(kulso.orszag)}` : ""}`
      : radioSzol ? `<b>${ESC(c.adok[i].nev)}</b> · ${c.adok[i].virt ? "WEB" : `${MHZ(c.adok[i].frekvencia)} MHz`}`
      : bem ? `<b>${ESC(bem)}</b>` : SZOL(s) ? `<b>TAPE DECK PLAYING</b>` : "OFF";
    sr.getElementById("cim").textContent = radioSzol ? dal : bem ? [a.media_artist, a.media_title].filter((x) => x && !/^(unknown|unavailable|not provided|none|null)$/i.test(x)).join(" – ") : "";
    this._fedelFigyel(hsz);
    {
      // dalszöveghez előadó + cím kell: külön mezőben, vagy „Előadó - Cím” alakban a címben
      let ea = a.media_artist && a.media_artist !== adoNev && !URLSZERU(a.media_artist) ? a.media_artist : "", dc = a.media_title && a.media_title !== adoNev && !URLSZERU(a.media_title) ? a.media_title : "";
      if (!ea && / [-–] /.test(dc)) [ea, dc] = dc.split(/ [-–] /, 2);
      this._radioDal = radioSzol && ea && dc ? { artist: ea.trim(), title: dc.trim() } : null;
      sr.getElementById("cim").classList.toggle("dalos", !!this._radioDal);
    }
    if (!this._forgat && a.volume_level != null) { this._hangero = a.volume_level; this._rajzHangero(a.volume_level); }
    this._radioAll = { szol: radioSzol, keres: !!this._kezi, s, i };
    if (this._jelutE) requestAnimationFrame(() => this._jelutRajz());
    this._alvasRajz();
    this._jelRajz();
    if (this._netGiro) this._netGiroRajz();
    if (ATADANDO && ATADANDO.regi !== this && this.isConnected) {
      const u = ATADANDO; ATADANDO = null;
      if (Date.now() - u.ido < 10000) setTimeout(() => this._uzen(u.szoveg, u.gomb), 300);
    }

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
    sr.getElementById("vufajta").textContent = !szalagSzol ? "TAPE · NORMAL" : this._vuFelirat();
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
      const most = parseFloat(s.style.fontSize) || parseFloat(getComputedStyle(s).fontSize) || 7, uj = (most * hv) / sv;
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
    // keskenyebb széles kártyán a választó felső neve ne csússzon a VOLUME feliratra: akkor a hangerőgomb megy feljebb
    const hc = m.querySelector(".mjobb > .hangero")?.getBoundingClientRect(), fo = m.querySelector(".mjobb > .forgo")?.getBoundingClientRect();
    if (hc?.height && fo?.height && hc.bottom > fo.top - 6) {
      const regi = parseFloat(j.style.getPropertyValue("--hgy")) || 0;
      j.style.setProperty("--hgy", `${Math.max(-60, regi - (hc.bottom - fo.top + 6)).toFixed(1)}px`);
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
    // a hangszóró saját bemenetéről (BT IN, LINE IN) szól: a forrás a bemenet, a betöltött kazetta nem szól
    const bem = megy && hsz && hsz.entity !== HELYI && this._bemenetrol(hsz.entity) ? BEMENET_NEV(a.source) : "";
    const maSor = megy && !bem && this._maSorSzol(hsz?.entity);       // a Music Assistant sora szól (nem a betöltött kazetta)
    const kaz = bem || maSor ? null : !kazTarolt || !megy ? kazTarolt
      : kazTarolt.forras === "nas" ? (nasMost && (!kazTarolt.szamok?.length || this._szamIndex(kazTarolt, a) >= 0) ? kazTarolt : null)
      : kazTarolt.forras === "stream" ? (nasMost ? null : kazTarolt) : kazTarolt;
    const nas = kaz?.forras === "nas" || /\/media\/local\//.test(id) || /\/media\/local\//.test(a.media_title || "");
    const atm = kaz?.atmeneti || /\.cantabile_atmeneti\//.test(`${id} ${a.media_title || ""}`);
    const am = this._atmenetiAll;
    const forras = this._kazForras = bem ? bem : maSor ? "MA" : atm && (megy || kaz) ? (am && am.kesz < am.db ? `TEMP ↑${am.kesz}/${am.db}` : "TEMP") : megy ? (nas ? "NAS" : SZOLGALTATO[sid] ? SZOLGALTATO[sid].split(" ")[0].toUpperCase() : kaz?.forras === "stream" ? (SZOLG_NEV[kaz.tipus] || "STREAM") : kaz?.forras === "tel" ? "PHONE" : "") : (kaz ? (kaz.forras === "nas" ? "NAS" : kaz.forras === "tel" ? "PHONE" : "STREAM") : "");
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
    const ures = (x) => !x || /^(unknown|unavailable|not provided|none|null)$/i.test(String(x).trim());
    if (bem) {
      // a telefon (AVRCP) vagy a lejátszó küldhet címet; ha nem küld, a bemenet neve áll a kazettán
      cim = ures(a.media_title) ? bem : a.media_title;
      eloado = ures(a.media_artist) ? "" : a.media_artist;
      album = ures(a.media_album_name) ? "" : a.media_album_name;
      if (!eloado && cim.includes(" – ")) [eloado, cim] = cim.split(" – ", 2);
    } else if (megy) {
      // a WiiM a nyers fájlnevet adja címként (átmeneti feltöltésnél időbélyeg-előtaggal): azt is megtisztítjuk
      const fajlszeru = /^\d{10,}_|\.(mp3|flac|m4a|aac|ogg|opus|wav|wma)$/i.test(a.media_title || "");
      cim = !URLSZERU(a.media_title) && a.media_title && !fajlszeru ? a.media_title : FAJLNEV(a.media_title || id);
      eloado = a.media_artist || kaz?.alcim || "";
      album = a.media_album_name || kaz?.cim || "";
      if (!a.media_artist && cim.includes(" – ")) [eloado, cim] = cim.split(" – ", 2);
    } else if (kaz) { cim = kaz.cim; eloado = kaz.alcim || ""; album = ""; }
    const f = this._formatum;
    const BEM_FORMA = { "BT IN": ["Bluetooth", "A2DP"], "LINE IN": ["Line in", "analog"], "OPT IN": ["Optical", "S/PDIF"], PHONO: ["Phono", "analog"] };
    const minoseg = bem ? (BEM_FORMA[bem]?.[0] || bem) : f?.kodek || SZOLGALTATO[sid] || (forras === "NAS" ? "NAS" : "");
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
    if (bem) form = (BEM_FORMA[bem] || [bem, "input"]).join(" | ");
    else if (megy && f) {
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
    const ent = this._hangszoro()?.entity;
    const kell = this._lathato !== false && ent !== HELYI && this.isConnected && !!this._hass?.connection && !this._jelHiba && !this._bemenetrol(ent);
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

  // a VU fajtája: valódi jel (elemzés) vagy utánzat; a hangszóró saját bemenetéről (BT IN, LINE IN) a hang nem halad át a
  // szerveren, ott mindig utánzat – a felirat meg is mondja, miért
  _vuFelirat() {
    const h = this._hangszoro();
    if (h && this._bemenetrol(h.entity)) return `${BEMENET_NEV(this._hass?.states[h.entity]?.attributes?.source)} · SIMULATED`;
    return this._jelAllapot === "elemzes" ? (this._config.magno?.vu_kijelzo === "fluor" ? "PEAK · dBFS" : "VU · NORMALIZED") : "VU · SIMULATED";
  }

  _jelUzenet(m) {
    if (m.allapot) {
      this._jelAllapot = m.allapot;
      if (this._mod !== "magno") this._jelRajz();
      const f = this.shadowRoot.getElementById("vufajta");
      if (f && this._magnoAllapot?.szol) f.textContent = this._vuFelirat();
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
// vizuális kártyaszerkesztő (a HA kártyaválasztójában): hangszórók, márkanév, előlap, kijelző, zenemappa, FM-sáv – a
// beállítás nyelvét (angol / magyar kulcsok) megtartja; az adók és a nevek a kártya ⚙ gombjával szerkeszthetők
class CantabileCardEditor extends HTMLElement {
  setConfig(c) { this._c = c; this._adat = null; this._rajz(); }
  set hass(h) { this._h = h; if (this._f) this._f.hass = h; this._rajz(); }

  _rajz() {
    if (!this._h || !this._c || this._adat) return;   // az űrlapot csak új beállításra tölti újra (nem minden állapotváltozásra)
    if (!this._f) {
      const p = document.createElement("p");
      p.style.cssText = "margin:0 0 12px;color:var(--secondary-text-color)";
      p.textContent = T("A rádióadókat, a hangszórók nevét és a kártyán megjelenő rövid nevet a kártya ⚙ gombjával állíthatod be.");
      this._f = document.createElement("ha-form");
      const cimke = { speakers: T("Hangszórók"), brand: T("Márkanév"), finish: T("Előlap"), display: T("Kijelző"), media_folder: T("Zenemappa"), fm_band: T("FM-sáv") };
      this._f.computeLabel = (sema) => cimke[sema.name] || sema.name;
      this._f.addEventListener("value-changed", (e) => this._valt(e.detail.value));
      this.append(p, this._f);
    }
    const b = ATKULCS(this._c, KULCS), kij = b.magno?.vu_kijelzo;
    this._f.hass = this._h;
    this._f.schema = [
      { name: "speakers", selector: { entity: { multiple: true, filter: { domain: "media_player" } } } },
      { name: "brand", selector: { text: {} } },
      { name: "finish", selector: { select: { mode: "dropdown", options: [{ value: "silver", label: T("Ezüst (húzott alumínium)") }, { value: "black", label: T("Fekete (90-es évek)") }] } } },
      { name: "display", selector: { select: { mode: "dropdown", options: [{ value: "vu", label: T("Deprez-műszer (mutatós VU)") }, { value: "vfd", label: T("Fluoreszcens kijelző (VFD)") }] } } },
      { name: "media_folder", selector: { text: {} } },
      { name: "fm_band", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: T("Az ország szerint") }, { value: "std", label: "87,5–108 MHz" }, { value: "jp", label: T("Japán (76–95 MHz)") }] } } },
    ];
    this._f.data = this._adat = { speakers: (b.hangszorok || []).map((h) => h?.entity).filter(Boolean), brand: b.marka || "", finish: b.felulet === "black" ? "black" : "silver",
      display: KIJELZO_KI[kij] || kij || "vu", media_folder: b.magno?.nas || "", fm_band: b.fm_band === "japan" ? "jp" : b.fm_band || "auto" };
  }

  _valt(v) {
    const b = ATKULCS(this._c, KULCS), regi = new Map((b.hangszorok || []).map((h) => [h?.entity, h]));
    // a meglévő hangszóró beállítása (név, rövid név, mód) marad; az újak a lejátszó nevét kapják
    b.hangszorok = (v.speakers || []).map((e) => regi.get(e) || { nev: this._h.states[e]?.attributes?.friendly_name || e.split(".")[1], entity: e });
    if (v.brand) b.marka = v.brand; else delete b.marka;
    if (v.finish === "black") b.felulet = "black"; else delete b.felulet;
    b.magno = { ...(b.magno || {}) };
    // a kijelző csak akkor kerül a beállításba, ha már benne volt, vagy nem az alap (VU)
    if (b.magno.vu_kijelzo || (v.display && v.display !== "vu")) b.magno.vu_kijelzo = KIJELZO_BE[v.display] || "deprez";
    if (v.media_folder) b.magno.nas = v.media_folder; else delete b.magno.nas;
    if (!Object.keys(b.magno).length) delete b.magno;
    if (v.fm_band && v.fm_band !== "auto") b.fm_band = v.fm_band; else delete b.fm_band;
    const angol = !!(this._c.speakers || this._c.stations || this._c.tape || this._c.brand);
    const uj = angol ? ATKULCS({ ...b, ...(b.magno ? { magno: { ...b.magno, ...(b.magno.vu_kijelzo ? { vu_kijelzo: KIJELZO_KI[b.magno.vu_kijelzo] } : {}) } } : {}) }, VISSZA) : b;
    this._c = uj; this._adat = v;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: uj }, bubbles: true, composed: true }));
  }
}
if (!customElements.get("cantabile-card-editor")) customElements.define("cantabile-card-editor", CantabileCardEditor);

["_audio", "_audioE", "_aktAudio", "_elemzo", "_helyiId", "_helyiLista", "_helyiMeret", "_helyiNevek", "_telKaz", "_helyiAlvas", "_helyiAlvasIdo"].forEach((k) =>
  Object.defineProperty(CantabileCard.prototype, k, { get() { return HELYI_KOZOS[k]; }, set(v) { HELYI_KOZOS[k] = v; }, configurable: true }));

if (!customElements.get("cantabile-card")) {
  customElements.define("cantabile-card", CantabileCard);
  // a korábbi név (custom:tablet-radio) is működik
  if (!customElements.get("tablet-radio")) customElements.define("tablet-radio", class extends CantabileCard {});
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "cantabile-card", name: "Cantabile", preview: true,
    description: T("Régi hi-fi rádió és tape deck (ezüst vagy fekete) zenetárral: előadók, műfajok, party vendégkívánságokkal, listák – zenemappa, Music Assistant, Deezer, Spotify, Tidal; NET-rádió, valódi VU-mérők.") });
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
// 12 / 24 órás: a HA-profil beállítása, különben a HA-ban megadott ország szokása (pl. HU → 24, US → 12). Óraciklussal, nem
// `hour12`-vel: a `hour12: false` angol nyelven a Chrome-ban 24-es ciklust ad, éjfél után „24:04”-et írna „0:04” helyett
const ORA_OPC = (h) => {
  const tf = h?.locale?.time_format, orszag = String(h?.config?.country || "").toUpperCase();
  const h12 = tf === "12" ? true : tf === "24" ? false : orszag ? ORA12.includes(orszag) : undefined;
  return h12 !== undefined ? { hourCycle: h12 ? "h12" : "h23" } : {};
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
    if (this._le && this._cv) { this._indit(); this._feliratkozik(); }   // visszakerült (pl. visszanavigáltak a nézetre)
  }
  disconnectedCallback() {
    this._levesz = setTimeout(() => this._elenged(), 3000);
  }

  // óra, haladásjelző, rajzolás – a lekerült példányban leállnak (_elenged), visszakerüléskor újraindulnak
  _indit() {
    this._le = false;
    this._orak = [setInterval(this._ora, 10000), setInterval(() => this._halad(), 500), setInterval(() => this._hatterLep(), 30000)];
    this._rajzol();
  }

  // a lekerült példány elengedi a lejátszót; a hang (közös, az oldalhoz tartozik) szól tovább, az új példány átveszi
  _elenged() {
    if (this.isConnected) return;
    this._le = true;
    (this._orak || []).forEach(clearInterval); this._orak = null;
    clearInterval(this._jelIdo); this._jelIdo = null;
    clearTimeout(this._ujraIdo);
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
      .hat { position: absolute; left: -4%; top: -4%; width: 108%; height: 108%; background: center / cover no-repeat; opacity: 0; transition: opacity 2.5s ease;
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
      <div class="alt lat"><div class="lem">${TV_SVG_LEMEZ}</div></div><div class="hat"></div><div class="hat"></div><div class="sot"></div>
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
      const o = d.toLocaleTimeString(nyelv, { hour: "numeric", minute: "2-digit", ...ORA_OPC(this._h) });
      sr.querySelector(".o").textContent = o; sr.querySelector(".o2").textContent = o;
      sr.querySelector(".d").textContent = d.toLocaleDateString(nyelv, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    };
    ora();
    this._ora = ora;
    this._indit();
  }

  // ---- képernyő ébren tartása ----
  // Az Android TV csak a (képes) videót tekinti „nézett” lejátszásnak: a TV-oldal hangja mellett kb. 15 perc múlva
  // képernyővédőre, majd alvásba vált (a bot leesik a hálózatról). Lejátszás közben a Screen Wake Lock-ot kéri; az
  // eredményt egyszer visszajelzi (cantabile_tv_diag „ebren”: ok / nincs / hiba). Az oldal elrejtésekor a böngésző
  // elengedi – újra láthatóvá váláskor, ha szól, megint kéri.
  async _ebren(kell) {
    const w = window, jelez = (ertek) => { if (!w._cantabileEbrenJelzett) { w._cantabileEbrenJelzett = true; this._diag({ ebren: ertek }); } };
    if (!w._cantabileEbrenFigyel) {
      w._cantabileEbrenFigyel = true;
      document.addEventListener("visibilitychange", () => {
        const akt = w._cantabileTv;
        if (document.visibilityState === "visible" && akt && akt._allapot === "playing") akt._ebren(true);
      });
    }
    w._cantabileEbrenKell = kell;
    if (!kell) { const l = w._cantabileEbren; w._cantabileEbren = null; if (l) l.release().catch(() => {}); return; }
    if ((w._cantabileEbren && !w._cantabileEbren.released) || w._cantabileEbrenKer) return;   // már van, vagy épp kéri
    if (!("wakeLock" in navigator)) return jelez("nincs (a Cast-vevő nem ismeri a Wake Lock API-t)");
    try {
      w._cantabileEbrenKer = true;
      const l = await navigator.wakeLock.request("screen");
      if (!w._cantabileEbrenKell) l.release().catch(() => {});   // közben szünet lett: azonnal elengedi
      else w._cantabileEbren = l;
      jelez("ok");
    } catch (e) { jelez(`hiba: ${e && e.name}: ${e && e.message}`); }
    finally { w._cantabileEbrenKer = false; }
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
      if (ez._tukor) return;                         // tükör: a leállított hang eseményei ne engedjék el a képernyőt
      if (e === "playing") ez._ebren(true);
      else if (e === "pause" || e === "ended" || e === "error") ez._ebren(false);
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
    clearTimeout(this._ujraIdo);
    if (this._leir) return;                          // már fel van iratkozva (ne legyen két előfizetés)
    this._msg = { type: "cantabile/tv/subscribe", features: TV_KEPES };
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
        if (akt && akt !== this) { clearTimeout(akt._levesz); akt._elenged(); this._ujraIdo = setTimeout(() => this._feliratkozik(), 800); return; }   // a régi, lekerült példány tartotta
        this._ujraIdo = setTimeout(() => this._feliratkozik(), 10000);               // még nincs hozzárendelhető lejátszó
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
    // tükör: hang nélkül egy másik hangszórót mutat (a kártyán a TV-ről átváltottak) – adatok, képek, haladás, jelszint
    if (m.cmd === "mirror" || m.cmd === "mirror_state") {
      if (m.cmd === "mirror") {
        if (a.getAttribute("src")) { a.pause(); a.removeAttribute("src"); a.load(); }
        this._src = null; this._cueI = null;
        if (!this._tukor || this._tukor.cel !== m.target) this._tukorJel(m.target);
        this._tukor = { ...(this._tukor || {}), cel: m.target };
        if (m.meta) { this._meta = m.meta; this._mutat(m.meta); }
        this._ebren(true);                           // a tükör végéig (10 perc csend) ébren marad
      }
      if (!this._tukor) return;
      Object.assign(this._tukor, { poz: Number(m.position) || 0, at: m.at ? m.at * 1000 : Date.now(), hossz: Number(m.duration) || 0 });
      this._allapot = m.state === "playing" ? "playing" : m.state === "paused" ? "paused" : "idle";
      this._v.classList.toggle("szun", this._allapot === "paused");
      return;
    }
    if (m.cmd === "play" || m.cmd === "stop") this._tukorVege();
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

  // a követett hangszóró jelszintje (cantabile/signal) az equalizerhez; ha nem elemezhető (pl. Deezer), utánzat
  _tukorJel(cel) {
    const u = this._tukorLeir; this._tukorLeir = null;
    if (u) Promise.resolve(u).then((f) => f && f()).catch(() => {});
    this._tukorSzint = 0; this._tukorNincs = false;
    if (!cel || !this._h) return;
    this._tukorLeir = this._h.connection.subscribeMessage((v) => {
      if (v.allapot === "nincs") { this._tukorNincs = true; return; }
      if (v.l == null) return;
      this._tukorNincs = false;
      this._tukorSzint = Math.max(0, Math.min(1, (Math.max(v.l, v.r) + 24) / 27));   // −24 … +3 VU → 0 … 1
    }, { type: "cantabile/signal", entity_id: cel }).catch(() => { this._tukorNincs = true; return null; });
  }

  _tukorVege() {
    if (!this._tukor) return;
    this._tukor = null; this._tukorJel(null);
    this._allapot = "idle"; this._v.classList.add("ures2");
    this._ebren(false);
  }

  _jelent(hiba, metaval) {
    if (!this._tv || this._tukor) return;           // tükörben a TV nem szól: a lejátszó állapota „idle” marad
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
      const csip = [m.source ? `▶ ${m.source}` : "", m.codec, khz, m.kbps ? `${m.kbps} kbps` : "", m.track ? `TRACK ${m.track}` : "", m.genre ? String(m.genre).split(" / ")[0] : "", radio ? "INTERNET RADIO" : ""].filter(Boolean);
      sr.querySelector(".csipek").innerHTML = csip.map((x) => `<span>${ESC(String(x).toUpperCase())}</span>`).join("");
      const bor = sr.querySelector(".bor"), kep = m.cover || (radio ? m.image : "") || "";
      bor.classList.toggle("ures", !kep);
      bor.style.backgroundImage = kep ? `url("${this._abs(kep)}")` : "";
      // háttér: a szerver által gyűjtött képek (NAS-mappa, TheAudioDB), az előadó képe, végül a borító – 30 mp-enként váltva
      this._hatterLista = [...new Set([...(m.backgrounds || []), m.artist_image, m.cover].filter(Boolean))];
      this._hatterI = 0;
      if (this._hatterLista.length) this._hatterMutat(this._hatterLista[0]);
      else { sr.querySelectorAll(".hat").forEach((h) => h.classList.remove("lat")); sr.querySelector(".alt").classList.add("lat"); }
      sr.querySelector(".hal").classList.toggle("elo2", radio);
      t.classList.remove("valt");
    } catch (e) { this._diag({ hiba: `mutat: ${e && e.stack ? e.stack.slice(0, 300) : e}` }); } }, 450);
  }

  // a háttér következő képe a rejtett rétegbe töltődik, aztán áttűnéssel cserél (a hibás képet átugorja)
  _hatterMutat(url, probak = 0) {
    const sr = this.shadowRoot; if (!sr) return;
    const tok = this._hatterTok = {};                                // egy későn betöltődő régi kép ne írja felül az újat
    const [h1, h2] = sr.querySelectorAll(".hat"), uj = h1.classList.contains("lat") ? h2 : h1, regi = uj === h1 ? h2 : h1, alt = sr.querySelector(".alt");
    const kepb = new Image();
    kepb.onload = () => {
      if (this._hatterTok !== tok) return;
      // az új réteg a régi FÖLÖTT tűnik elő, a régi csak utána tűnik el (így nem sötétedik be közben)
      uj.style.backgroundImage = `url("${this._abs(url)}")`;
      if (regi.nextElementSibling !== uj) regi.after(uj);           // az új réteg kerül felülre (a sötétítő réteg alatt marad)
      uj.classList.add("lat"); alt.classList.remove("lat");
      clearTimeout(this._hatterLe); this._hatterLe = setTimeout(() => { if (this._hatterTok === tok) regi.classList.remove("lat"); }, 2600);
    };
    kepb.onerror = () => {
      if (this._hatterTok !== tok) return;
      this._hatterLista = (this._hatterLista || []).filter((x) => x !== url);
      if (this._hatterLista.length && probak < 3) this._hatterMutat(this._hatterLista[this._hatterI % this._hatterLista.length], probak + 1);
      else if (!this._hatterLista.length) { h1.classList.remove("lat"); h2.classList.remove("lat"); alt.classList.add("lat"); }   // egyik sem jó: a lemezes alapkép
    };
    kepb.src = this._abs(url);
  }

  _hatterLep() {
    const l = this._hatterLista || [];
    if (l.length < 2 || document.visibilityState === "hidden") return;
    this._hatterI = (this._hatterI + 1) % l.length;
    this._hatterMutat(l[this._hatterI]);
  }

  _halad() {
    const a = this._a, sr = this.shadowRoot, t = this._tukor;
    if ((!a && !t) || !sr) return;
    const ido = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), p = Math.floor((s % 3600) / 60), mp = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(p).padStart(2, "0")}:${mp}` : `${p}:${mp}`; };
    const cue = t ? null : this._cueKovet();       // CUE-s albumnál a szám saját ideje
    let hossz, most;
    if (t) { hossz = t.hossz; most = t.poz + (this._allapot === "playing" ? (Date.now() - t.at) / 1000 : 0); if (hossz) most = Math.min(most, hossz); }
    else { hossz = cue ? cue.hossz : isFinite(a.duration) && a.duration > 0 ? a.duration : 0; most = a.currentTime - (cue ? cue.kezd : 0); }
    sr.querySelector(".most").textContent = ido(most);
    sr.querySelector(".vege").textContent = hossz ? ido(hossz) : "";
    const p = hossz ? Math.min(100, (most / hossz) * 100) : 0;
    sr.querySelector(".tel").style.width = `${p}%`; sr.querySelector(".gomb").style.left = `${p}%`;
  }

  // equalizer (logaritmikus sávok, eső csúcsjelzővel és tükörképpel) + hullámforma-vonal
  _rajzol() {
    const g = this._cv.getContext("2d"), N = 56, csucs = new Array(N).fill(0), simit = new Array(N).fill(0);
    let nyugszik = "";
    const gen = this._gen = (this._gen || 0) + 1;   // újraindításkor a régi ciklus magától leáll (ne fusson kettő)
    const kor = () => {
      if (this._le || gen !== this._gen) return;    // a lekerült példány rajzolása leáll (az új példány rajzol)
      requestAnimationFrame(kor);
      const W = this._cv.width, H = this._cv.height, alap = H * 0.72;
      if (this._tukor && this._allapot === "playing") {
        // tükör: nincs hang az oldalon – a követett hangszóró jelszintjéből (vagy utánzatból) rajzolt sávok
        nyugszik = "";
        g.clearRect(0, 0, W, H);
        const most = performance.now() / 1000, szint = this._tukorNincs || !this._tukorSzint ? 0.5 + 0.18 * Math.sin(most * 1.7) + 0.1 * Math.sin(most * 4.3) : this._tukorSzint;
        for (let i = 0; i < N; i++) {
          const alak = 1 - 0.5 * (i / N), mozg = 0.3 + 0.7 * Math.abs(Math.sin(most * (2.1 + (i % 7) * 0.53) + i * 1.37) * Math.sin(most * (0.9 + (i % 5) * 0.31) + i));
          const v = Math.min(1, 1.7 * szint * alak * mozg);
          simit[i] = v > simit[i] ? v : simit[i] * 0.86 + v * 0.14;
          csucs[i] = Math.max(csucs[i] - 0.012, simit[i]);
        }
      } else if (!this._an || this._allapot !== "playing") {
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
      if (vis !== "bars" && this._an && this._allapot === "playing" && !this._tukor) {
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

// amit ez a TV-oldal tud (a szerver ebből látja, ha egy frissítés után még a régi kód fut a TV-n, és újraküldi)
const TV_KEPES = ["mirror", "source", "clock24"];

// a hang, az elemző és a szóló szám az oldalhoz tartozik, nem a kártyapéldányhoz (lásd a BT kimenetnél is)
const TV_KOZOS = {};
["_a", "_ctx", "_an", "_frek", "_ido", "_src", "_meta", "_allapot", "_tv", "_cueI", "_tukor", "_tukorLeir", "_tukorSzint", "_tukorNincs"].forEach((k) =>
  Object.defineProperty(CantabileTv.prototype, k, { get() { return TV_KOZOS[k]; }, set(v) { TV_KOZOS[k] = v; }, configurable: true }));

if (!customElements.get("cantabile-tv")) {
  customElements.define("cantabile-tv", CantabileTv);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "cantabile-tv", name: "Cantabile TV", description: T("A Cantabile TV-oldala a Cast-os TV-re: equalizer, előadókép, a szám adatai és haladásjelző.") });
}
