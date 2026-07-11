"""
TEAMER JSON File Database
Each collection is stored as a list of dicts in data/<name>.json.
Thread-safe via Lock. Atomic writes via tmp+rename.
"""
import json, os
from threading import Lock

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)


class Collection:
    def __init__(self, name: str):
        self.name = name
        self.path = os.path.join(DATA_DIR, f'{name}.json')
        self.lock = Lock()
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path, 'r', encoding='utf-8') as f:
                self.data: list[dict] = json.load(f)
        else:
            self.data = []

    def _save(self):
        tmp = self.path + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, default=str)
        os.replace(tmp, self.path)

    # ── Reads ────────────────────────────────────────────────────────────────

    def find_all(self) -> list[dict]:
        return list(self.data)

    def find(self, fn=None, **filters) -> list[dict]:
        """Return records matching all key=value filters (and optional predicate fn)."""
        out = self.data
        if fn:
            out = [r for r in out if fn(r)]
        for k, v in filters.items():
            out = [r for r in out if r.get(k) == v]
        return out

    def find_one(self, fn=None, **filters) -> dict | None:
        results = self.find(fn=fn, **filters)
        return results[0] if results else None

    # ── Writes ───────────────────────────────────────────────────────────────

    def insert(self, record: dict) -> dict:
        with self.lock:
            self.data.append(record)
            self._save()
        return record

    def update(self, match: dict, updates: dict) -> dict | None:
        """Update first record matching all match key=value pairs."""
        with self.lock:
            for rec in self.data:
                if all(rec.get(k) == v for k, v in match.items()):
                    rec.update(updates)
                    self._save()
                    return rec
        return None

    def delete_one(self, **filters) -> dict | None:
        with self.lock:
            for i, rec in enumerate(self.data):
                if all(rec.get(k) == v for k, v in filters.items()):
                    removed = self.data.pop(i)
                    self._save()
                    return removed
        return None

    def delete_many(self, **filters) -> int:
        with self.lock:
            before = len(self.data)
            self.data = [r for r in self.data
                         if not all(r.get(k) == v for k, v in filters.items())]
            if len(self.data) != before:
                self._save()
            return before - len(self.data)


# ── Singleton registry ───────────────────────────────────────────────────────

_collections: dict[str, Collection] = {}

def get_collection(name: str) -> Collection:
    if name not in _collections:
        _collections[name] = Collection(name)
    return _collections[name]
