"""A TV-oldal hibájából csak formátum-hibánál tanul „nem_flac”-ot (2.7.0b22)."""
from custom_components.cantabile.media_player import _formatum_hiba


def test_formatum_hiba():
    assert _formatum_hiba("audio 4")
    assert _formatum_hiba("audio 3")
    assert _formatum_hiba("DEMUXER_ERROR_COULD_NOT_OPEN: FFmpegDemuxer: open context failed")
    assert not _formatum_hiba("audio 2")          # hálózat (NAS-kiesés, lejárt cím)
    assert not _formatum_hiba("audio 1")          # megszakítva
    assert not _formatum_hiba("audio ")
