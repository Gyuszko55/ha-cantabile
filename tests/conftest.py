"""A tesztek futó Home Assistant nélkül, kitalált adatokkal futnak; a tároló gyökere a path-on (custom_components.cantabile).

Futtatás (homeassistant + pytest kell hozzá):  python -m pytest tests
"""

import sys
from pathlib import Path

GYOKER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GYOKER))
