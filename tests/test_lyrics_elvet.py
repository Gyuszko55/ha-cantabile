"""Rossz dalszöveg (2.7.1): az elutasított szöveget a keresés többé nem adja."""
import os, tempfile
from custom_components.cantabile import lyrics as L

LRC = "[00:01.00]Első sor\n[00:05.50]Második sor\n"


def test_ujjlenyomat_egyezik_fajlbol_es_lrclibbol():
    with tempfile.TemporaryDirectory() as d:
        ut = os.path.join(d, "a.lrc")
        open(ut, "w", encoding="utf-8").write("[ar:X]\n[ti:Y]\n[re:Cantabile (LRCLIB)]\n" + LRC)
        assert L.ujjlenyomat(L.lrc_olvas(ut)) == L.ujjlenyomat({"syncedLyrics": LRC})


def test_elutasitott_azonosito_es_tartalom_szerint():
    elut = {L._elut_kulcs("Előadó", "Cím (Remastered 2011)"): {"ids": [42], "ujj": [L.ujjlenyomat({"syncedLyrics": LRC})]}}
    assert L.elutasitott(elut, "előadó", "Cím", {"id": 42})                       # LRCLIB-azonosító
    assert L.elutasitott(elut, "Előadó", "Cím", {"syncedLyrics": LRC, "id": 7})    # ugyanaz a szöveg, más azonosító
    assert not L.elutasitott(elut, "Előadó", "Cím", {"syncedLyrics": "[00:01.00]Más\n", "id": 8})


def test_sajat_lrc_atnevezve_letoltott_torolve():
    with tempfile.TemporaryDirectory() as d:
        sajat, letolt = os.path.join(d, "s.lrc"), os.path.join(d, "l.lrc")
        open(sajat, "w", encoding="utf-8").write(LRC)
        open(letolt, "w", encoding="utf-8").write("[re:Cantabile (LRCLIB)]\n" + LRC)
        u = L.ujjlenyomat({"syncedLyrics": LRC})
        assert sorted(L._elvet_fajlok([sajat, letolt], u)) == sorted([sajat, letolt])
        assert not os.path.exists(letolt) and os.path.exists(sajat + ".elutasitott") and not os.path.exists(sajat)
