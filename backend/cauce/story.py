"""De la historia contada a una planta con supuestos escritos."""

from __future__ import annotations

import re
import unicodedata

from .plant import ASSUMPTIONS, template

KEYWORDS = {
    "recepcion": ["recib", "lamina de vidrio", "llegaba"],
    "laminas": ["lamina", "almacen"],
    "corte": ["corte", "cortaban", "mesa de vidrio", "mesa"],
    "recorte": ["recorte"],
    "pulido": ["pulid", "pulidora", "bisel", "canto"],
    "sandblast": ["sandblast", "arenad", "chorro de arena"],
    "lavado": ["lavad", "lavar"],
    "empaque": ["empaq", "embal"],
    "despacho": ["camion", "transporte", "ruta", "despach", "entreg"],
    "oficina": ["oficina", "ventas", "nomina", "pagos", "administr"],
    "pulpo": ["pulpo", "ventosa", "grua"],
}

STORY_SCHEMA = {
    "type": "object",
    "properties": {
        "negocio": {"type": "string"},
        "producto": {"type": "string"},
        "operarios": {"type": "integer"},
        "piezas_al_dia": {"type": "integer"},
        "camiones_al_dia": {"type": "integer"},
        "procesos": {"type": "array", "items": {"type": "string"}},
        "administrativo": {"type": "array", "items": {"type": "string"}},
        "problemas": {"type": "array", "items": {"type": "string"}},
        "supuestos": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["negocio", "procesos", "supuestos"],
}

STORY_SYSTEM = (
    "Eres un ingeniero de procesos que escucha al dueño de un taller. "
    "Extrae en JSON lo que la historia dice. Si un número no aparece en la historia usa 0. "
    "En 'problemas' anota desperdicios o desorden que se intuyen. "
    "En 'supuestos' escribe en español, en frases cortas, lo que tendrías que suponer para modelar la planta. "
    "Responde solo JSON."
)


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def by_rules(text: str) -> dict:
    t = normalize(text)
    found = [sid for sid, words in KEYWORDS.items() if any(w in t for w in words)]
    ops = re.search(r"(\d+)\s*(operari|trabajador|persona|empleado)", t)
    pieces = re.search(r"(\d+)\s*(pieza|vidrio|unidad)", t)
    trucks = re.search(r"(\d+)\s*(camion|ruta)", t)
    return {
        "mentioned": found,
        "operarios": int(ops.group(1)) if ops else 0,
        "piezas_al_dia": int(pieces.group(1)) if pieces else 0,
        "camiones_al_dia": int(trucks.group(1)) if trucks else 0,
    }


def build_plant(text: str, ai: dict | None) -> dict:
    plant = template()
    rules = by_rules(text)
    p = plant["params"]
    facts = []

    def pick(key, lo, hi):
        for source, val in (("historia", rules.get(key)), ("ia", (ai or {}).get(key))):
            if isinstance(val, (int, float)) and lo <= val <= hi:
                return int(val), source
        return None, None

    n_ops, src = pick("operarios", 4, 60)
    if n_ops:
        p["floor_ops"] = max(8, n_ops - p["admin_ops"])
        facts.append({"key": "floor_ops", "value": p["floor_ops"], "source": src})
        extra = p["floor_ops"] - 8
        order = ["laminas", "corte", "corte", "laminas", "empaque", "pulido"]
        for s in plant["stations"]:
            if s["t"] > 0:
                s["ops"] = 1
        i = 0
        while extra > 0:
            sid = order[i % len(order)]
            next(s for s in plant["stations"] if s["id"] == sid)["ops"] += 1
            extra -= 1
            i += 1

    demand, src = pick("piezas_al_dia", 10, 1000)
    if demand:
        p["demand"] = demand
        facts.append({"key": "demand", "value": demand, "source": src})

    trucks, src = pick("camiones_al_dia", 1, 20)
    if trucks:
        p["trucks"] = trucks
        facts.append({"key": "trucks", "value": trucks, "source": src})

    mentioned = set(rules["mentioned"])
    for proc in (ai or {}).get("procesos", []) or []:
        for sid, words in KEYWORDS.items():
            if any(w in normalize(str(proc)) for w in words):
                mentioned.add(sid)

    known = {k for k, *_ in ASSUMPTIONS}
    fact_keys = {f["key"] for f in facts}
    assumptions = [
        {"key": k, "label": label, "unit": unit, "why": why, "value": p[k], "source": "supuesto"}
        for k, label, unit, why in ASSUMPTIONS
        if k in known and k not in fact_keys
    ]
    for f in facts:
        meta = next(a for a in ASSUMPTIONS if a[0] == f["key"])
        assumptions.insert(0, {"key": f["key"], "label": meta[1], "unit": meta[2], "why": "Tomado de tu historia.", "value": f["value"], "source": f["source"]})

    stations = [
        {"id": s["id"], "name": s["name"], "mentioned": s["id"] in mentioned}
        for s in plant["stations"]
    ] + [{"id": f["id"], "name": f["name"], "mentioned": f["id"] in mentioned} for f in plant["fixed"]]

    return {
        "plant": plant,
        "stations": stations,
        "assumptions": assumptions,
        "ai": ai,
        "pulpo": "pulpo" in mentioned,
        "notes": (ai or {}).get("problemas", []) + plant["current"]["notes"],
        "ai_assumptions": (ai or {}).get("supuestos", []),
    }
