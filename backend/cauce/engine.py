"""Motor de ingeniería de procesos.

Todo es determinista y trazable: la IA narra y conversa, pero los números
salen de estas fórmulas.

- Recorridos: distancia rectilínea entre estaciones (pasillos en ángulo recto).
- Capacidad: minutos disponibles por operario frente a la carga de cada estación.
- Espera en cola: aproximación de Sakasegawa (G/G/c).
- Rediseño: asignación exacta de estaciones a posiciones por ramificación y poda.
"""

from __future__ import annotations

import heapq
import math
from functools import lru_cache

ALTERNATIVES = [
    {
        "id": "u",
        "name": "Flujo en U",
        "summary": "Entra por un portón nuevo a la izquierda, rodea la bodega por el fondo y sale por el portón B.",
        "receive_gate": "C",
        "dispatch_gate": "B",
        "works": "Abrir el portón C (obra menor).",
        "works_cost": 1,
        "recepcion": [5, 18.5, 0],
        "despacho": [38, 18.5, 0],
        "slots": [[5, 11, 0], [5, 4, 0], [13.5, 4, 0], [21.5, 4, 0], [30, 4, 0], [38, 4, 0], [38, 11, 0], [30, 11, 0]],
    },
    {
        "id": "i",
        "name": "Línea recta",
        "summary": "Todas las máquinas en fila por el centro, de pared a pared.",
        "receive_gate": "C",
        "dispatch_gate": "B",
        "works": "Abrir el portón C y partir la bodega con la línea.",
        "works_cost": 2,
        "recepcion": [5, 18.5, 0],
        "despacho": [38, 18.5, 0],
        "slots": [[3.5, 11, 90], [10, 11, 90], [16.5, 11, 90], [23, 11, 90], [29.5, 11, 90], [36, 11, 90], [42, 11, 90]],
    },
    {
        "id": "keep",
        "name": "Reordenar sin obra",
        "summary": "Se despeja el portón B y se reordenan las máquinas sin abrir portones nuevos.",
        "receive_gate": "A",
        "dispatch_gate": "B",
        "works": "Despejar el portón B.",
        "works_cost": 0,
        "recepcion": [30.5, 18.5, 0],
        "despacho": [38, 18.5, 0],
        "slots": [[30, 11, 0], [21.5, 11, 0], [13.5, 11, 0], [5, 11, 0], [5, 4, 0], [13.5, 4, 0], [21.5, 4, 0], [30, 4, 0], [38, 4, 0], [38, 11, 0]],
    },
]

ROUTE_ORDER = ["laminas", "corte", "recorte", "pulido", "sandblast", "lavado", "empaque"]


def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


# Enrutamiento por pasillos: el vidrio no atraviesa máquinas, oficina ni baños.
STEP = 0.5      # resolución de la malla (m)
MARGIN = 0.25   # holgura alrededor de cada obstáculo (m)
TURN = 1.0      # castigo por giro (m): prefiere pasillos rectos


def obstacles(plant, positions, skip):
    rects = []
    for s in plant["stations"]:
        if s["id"] in skip or s["id"] not in positions:
            continue
        x, y, *r = positions[s["id"]]
        rot = r[0] if r else 0
        w, d = (s["d"], s["w"]) if rot % 180 else (s["w"], s["d"])
        rects.append((x - w / 2, y - d / 2, x + w / 2, y + d / 2))
    for f in plant["fixed"]:
        rects.append((f["x"] - f["w"] / 2, f["z"] - f["d"] / 2, f["x"] + f["w"] / 2, f["z"] + f["d"] / 2))
    return tuple(rects)


@lru_cache(maxsize=8192)
def _route(W, D, rects, a, b):
    nx, ny = int(W / STEP), int(D / STEP)
    blocked = set()
    for x0, y0, x1, y1 in rects:
        for i in range(max(0, math.ceil((x0 - MARGIN) / STEP + 1e-9)), min(nx, math.floor((x1 + MARGIN) / STEP - 1e-9)) + 1):
            for j in range(max(0, math.ceil((y0 - MARGIN) / STEP + 1e-9)), min(ny, math.floor((y1 + MARGIN) / STEP - 1e-9)) + 1):
                blocked.add((i, j))
    clip = lambda v, n: max(0, min(n, round(v / STEP)))
    start = (clip(a[0], nx), clip(a[1], ny))
    goal = (clip(b[0], nx), clip(b[1], ny))
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    best = {(start, -1): 0.0}
    parent = {}
    heap = [(0.0, start, -1)]
    end = None
    while heap:
        c, node, d = heapq.heappop(heap)
        if best.get((node, d), 1e18) < c:
            continue
        if node == goal:
            end = (node, d)
            break
        for k, (dx, dy) in enumerate(dirs):
            n = (node[0] + dx, node[1] + dy)
            if not (0 <= n[0] <= nx and 0 <= n[1] <= ny) or (n in blocked and n != goal):
                continue
            nc = c + STEP + (TURN if d not in (-1, k) else 0.0)
            if nc < best.get((n, k), 1e18):
                best[(n, k)] = nc
                parent[(n, k)] = (node, d)
                heapq.heappush(heap, (nc, n, k))
    if end is None:
        return None
    nodes = [end[0]]
    cur = end
    while cur in parent:
        cur = parent[cur]
        nodes.append(cur[0])
    nodes.reverse()
    pts = [(a[0], a[1])]
    for i in range(1, len(nodes) - 1):
        p0, p1, p2 = nodes[i - 1], nodes[i], nodes[i + 1]
        if (p1[0] - p0[0], p1[1] - p0[1]) != (p2[0] - p1[0], p2[1] - p1[1]):
            pts.append((p1[0] * STEP, p1[1] * STEP))
    pts.append((b[0], b[1]))
    # El primer y el último tramo salen del centro: se alinean con la malla.
    fixed = [pts[0]]
    for q in pts[1:]:
        p = fixed[-1]
        if p[0] != q[0] and p[1] != q[1]:
            fixed.append((q[0], p[1]))
        fixed.append(q)
    return fixed


def route_leg(plant, positions, a_id, b_id):
    """Distancia y trazo (esquinas) del vidrio entre dos estaciones, esquivando obstáculos."""
    a, b = positions[a_id], positions[b_id]
    rects = obstacles(plant, positions, {a_id, b_id})
    pts = _route(plant["size"]["w"], plant["size"]["d"], rects, (a[0], a[1]), (b[0], b[1]))
    if pts is None:
        pts = [(a[0], a[1]), (b[0], a[1]), (b[0], b[1])]
    dist = sum(abs(q[0] - p[0]) + abs(q[1] - p[1]) for p, q in zip(pts, pts[1:]))
    return dist, [[round(x, 2), round(y, 2)] for x, y in pts]


def gate_x(plant, gate_id):
    for g in plant["gates"]:
        if g["id"] == gate_id:
            return g["x"]
    return plant["size"]["w"] / 2


def edges_with_trips(plant):
    p = plant["params"]
    out = []
    for e in plant["routing"]:
        batch = e["batch"] or p["batch"]
        units = p["demand"] * e["frac"] * e["per"]
        out.append({**e, "units": units, "trips": units / batch, "by": e["by"] or e["from"]})
    return out


def station_map(plant):
    return {s["id"]: s for s in plant["stations"]}


def sakasegawa_wq(rho, c, te, cv2):
    """Espera promedio en cola (min) para c servidores con utilización rho."""
    r = min(rho, 0.985)
    if r <= 0 or c <= 0:
        return 0.0
    return (cv2 + cv2) / 2 * (r ** (math.sqrt(2 * (c + 1)) - 1)) / (c * (1 - r)) * te


def evaluate(plant, positions, ops=None, receive_gate=None, dispatch_gate=None, staging="mixed"):
    """Calcula todas las métricas de un layout."""
    p = plant["params"]
    st = station_map(plant)
    ops = ops or {s["id"]: s["ops"] for s in plant["stations"]}
    avail = p["shift_min"] * p["efficiency"]
    edges = edges_with_trips(plant)
    depth = plant["size"]["d"]

    legs = []
    handling = {sid: 0.0 for sid in st}
    glass_m = 0.0
    walk_m = 0.0
    for e in edges:
        d, path = route_leg(plant, positions, e["from"], e["to"])
        glass_m += e["trips"] * d
        walk_m += e["trips"] * 2 * d
        handling[e["by"]] += e["trips"] * 2 * d / p["speed"]
        legs.append({"from": e["from"], "to": e["to"], "dist": round(d, 1), "trips": round(e["trips"], 1), "meters": round(e["trips"] * d, 1), "path": path})

    stations = []
    for s in plant["stations"]:
        sid = s["id"]
        load = p["demand"] * s["share"] * s["t"] + handling[sid]
        n = ops.get(sid, 0)
        if s["t"] == 0 and n == 0:
            continue
        util = load / (n * avail) if n else float("inf")
        per_piece = load / p["demand"]
        cap = n * avail / per_piece if per_piece > 0 else float("inf")
        stations.append({
            "id": sid, "name": s["name"], "ops": n,
            "load_min": round(load, 1), "handling_min": round(handling[sid], 1),
            "util": round(util, 4), "required": round(load / avail, 2), "capacity": round(cap, 1),
        })
    stations.sort(key=lambda x: -x["util"])
    bottleneck = stations[0]
    capacity = min(x["capacity"] for x in stations)

    # Tiempo de fabricación por pieza: proceso + cola + espera de lote + transporte.
    takt = avail / p["demand"]
    proc = sum(s["t"] * s["share"] for s in plant["stations"])
    queue = 0.0
    breakdown_queue = {}
    for x in stations:
        s = st[x["id"]]
        te = x["load_min"] / max(p["demand"] * s["share"], 1e-9)
        wq = sakasegawa_wq(x["util"], x["ops"], te, p["cv2"]) * s["share"]
        breakdown_queue[x["id"]] = round(wq, 1)
        queue += wq
    batch_wait = 0.0
    transport = 0.0
    for e, leg in zip(edges, legs):
        batch = e["batch"] or p["batch"]
        per_unit_gap = takt / (e["frac"] * e["per"])
        batch_wait += e["frac"] * (batch - 1) / 2 * per_unit_gap * (1 if e["per"] >= 1 else e["per"])
        transport += e["frac"] * leg["dist"] / p["speed"]
    lead_min = proc + queue + batch_wait + transport

    # Despacho: del área de despacho al camión estacionado frente al portón.
    gx = gate_x(plant, dispatch_gate or plant["current"]["dispatch_gate"])
    desp = positions["despacho"]
    d_truck = manhattan(desp, (gx, depth)) + 3
    search = p["search_min_sorted"] if staging == "sorted" else p["search_min_mixed"]
    per_piece_load = p["load_min"] + 2 * d_truck / p["speed"] + search
    loading = p["trucks"] * p["truck_setup"] + p["demand"] * per_piece_load

    gx_r = gate_x(plant, receive_gate or plant["current"]["receive_gate"])
    d_receive = manhattan(positions["recepcion"], (gx_r, depth)) + 3

    avoid_hits = []
    allpos = dict(positions)
    for f in plant["fixed"]:
        allpos[f["id"]] = [f["x"], f["z"], 0]
    for a, b in plant["avoid"]:
        if a in allpos and b in allpos and manhattan(allpos[a], allpos[b]) < 9:
            avoid_hits.append([a, b])

    lower = sum(e["trips"] * 7 for e in edges)
    flow_index = max(0, min(100, round(100 * lower / glass_m))) if glass_m else 100

    return {
        "glass_m": round(glass_m, 0),
        "walk_m": round(walk_m, 0),
        "capacity": round(capacity, 1),
        "demand": p["demand"],
        "lead_h": round(lead_min / 60, 2),
        "lead_parts": {
            "proceso": round(proc, 1),
            "cola": round(queue, 1),
            "lote": round(batch_wait, 1),
            "transporte": round(transport, 1),
        },
        "queue_by_station": breakdown_queue,
        "loading_min": round(loading, 0),
        "loading_parts": {
            "alistamiento": p["trucks"] * p["truck_setup"],
            "carga": round(p["demand"] * p["load_min"], 1),
            "caminar": round(p["demand"] * 2 * d_truck / p["speed"], 1),
            "buscar": round(p["demand"] * search, 1),
        },
        "d_truck": round(d_truck, 1),
        "d_receive": round(d_receive, 1),
        "stations": stations,
        "bottleneck": bottleneck["id"],
        "bottleneck_util": bottleneck["util"],
        "legs": legs,
        "avoid_hits": avoid_hits,
        "flow_index": flow_index,
        "ops": ops,
    }


def layout_cost(plant, positions, edges):
    cost = sum(e["trips"] * manhattan(positions[e["from"]], positions[e["to"]]) for e in edges)
    allpos = dict(positions)
    for f in plant["fixed"]:
        allpos[f["id"]] = [f["x"], f["z"], 0]
    for a, b in plant["avoid"]:
        if a in allpos and b in allpos and manhattan(allpos[a], allpos[b]) < 9:
            cost += 500
    return cost


def optimize_positions(plant, alt):
    """Asignación óptima de estaciones a posiciones (ramificación y poda)."""
    edges = edges_with_trips(plant)
    fixed = {"recepcion": alt["recepcion"], "despacho": alt["despacho"]}
    slots = alt["slots"]
    order = [s for s in ROUTE_ORDER if s in station_map(plant)]
    best = {"cost": float("inf"), "assign": None}
    adj = {}
    for e in edges:
        adj.setdefault(e["from"], []).append(e)
        adj.setdefault(e["to"], []).append(e)

    def partial(assign, sid):
        c = 0.0
        for e in adj.get(sid, []):
            other = e["to"] if e["from"] == sid else e["from"]
            if other in assign:
                c += e["trips"] * manhattan(assign[sid], assign[other])
        return c

    def dfs(i, assign, used, cost):
        if cost >= best["cost"]:
            return
        if i == len(order):
            total = layout_cost(plant, assign, edges)
            if total < best["cost"]:
                best["cost"] = total
                best["assign"] = dict(assign)
            return
        sid = order[i]
        for k, slot in enumerate(slots):
            if k in used:
                continue
            assign[sid] = slot
            dfs(i + 1, assign, used | {k}, cost + partial(assign, sid))
            del assign[sid]

    dfs(0, dict(fixed), frozenset(), 0.0)
    return {k: list(v) for k, v in best["assign"].items()}


def rebalance_ops(plant, positions, receive_gate, dispatch_gate):
    """Reparte los operarios de planta para maximizar la capacidad."""
    p = plant["params"]
    total = int(p["floor_ops"])
    working = [s["id"] for s in plant["stations"] if s["t"] > 0]
    ops = {s["id"]: 0 for s in plant["stations"]}
    for sid in working:
        ops[sid] = 1
    remaining = total - len(working)
    while remaining > 0:
        m = evaluate(plant, positions, ops, receive_gate, dispatch_gate, "sorted")
        ops[m["bottleneck"]] += 1
        remaining -= 1
    return ops


def analyze(plant):
    cur = plant["current"]
    current = evaluate(plant, cur["positions"], None, cur["receive_gate"], cur["dispatch_gate"], cur.get("staging", "mixed"))
    alts = []
    for alt in ALTERNATIVES:
        pos = optimize_positions(plant, alt)
        # Las máquinas giran según la posición asignada.
        ops = rebalance_ops(plant, pos, alt["receive_gate"], alt["dispatch_gate"])
        m = evaluate(plant, pos, ops, alt["receive_gate"], alt["dispatch_gate"], "sorted")
        alts.append({
            "id": alt["id"], "name": alt["name"], "summary": alt["summary"], "works": alt["works"],
            "receive_gate": alt["receive_gate"], "dispatch_gate": alt["dispatch_gate"],
            "positions": pos, "metrics": m, "slots": alt["slots"],
        })

    # Puntaje: recorrido, capacidad, tiempo y obra necesaria, normalizados contra hoy.
    def score(a):
        m = a["metrics"]
        base = current
        works = next(x["works_cost"] for x in ALTERNATIVES if x["id"] == a["id"])
        return (
            0.35 * m["glass_m"] / base["glass_m"]
            + 0.25 * base["capacity"] / m["capacity"]
            + 0.2 * m["lead_h"] / base["lead_h"]
            + 0.1 * m["loading_min"] / base["loading_min"]
            + 0.05 * works
        )

    for a in alts:
        a["score"] = round(score(a), 3)
    best = min(alts, key=lambda a: a["score"])
    ops_moves = []
    for sid, n in best["metrics"]["ops"].items():
        before = next((s["ops"] for s in plant["stations"] if s["id"] == sid), 0)
        if n != before:
            ops_moves.append({"id": sid, "before": before, "after": n})

    return {
        "plant": plant,
        "current": current,
        "alternatives": alts,
        "recommended": best["id"],
        "ops_moves": ops_moves,
        "relations": relations(plant),
        "comparison": compare(current, best["metrics"]),
    }


def compare(a, b):
    def pct(x, y):
        return round((y - x) / x * 100) if x else 0

    return {
        "glass_m": {"before": a["glass_m"], "after": b["glass_m"], "pct": pct(a["glass_m"], b["glass_m"])},
        "capacity": {"before": a["capacity"], "after": b["capacity"], "pct": pct(a["capacity"], b["capacity"])},
        "lead_h": {"before": a["lead_h"], "after": b["lead_h"], "pct": pct(a["lead_h"], b["lead_h"])},
        "loading_min": {"before": a["loading_min"], "after": b["loading_min"], "pct": pct(a["loading_min"], b["loading_min"])},
    }


def relations(plant):
    """Tabla de relaciones entre áreas (A, E, I, O, U, X) según intensidad de flujo."""
    edges = edges_with_trips(plant)
    ids = [s["id"] for s in plant["stations"]] + [f["id"] for f in plant["fixed"]]
    names = {s["id"]: s["name"] for s in plant["stations"]}
    names.update({f["id"]: f["name"] for f in plant["fixed"]})
    flow = {}
    for e in edges:
        k = tuple(sorted([e["from"], e["to"]]))
        flow[k] = flow.get(k, 0) + e["trips"]
    top = max(flow.values()) if flow else 1
    qualitative = {
        ("despacho", "oficina"): ("I", "Remisiones y facturas por ruta"),
        ("oficina", "recepcion"): ("O", "Verificar láminas recibidas"),
        ("empaque", "sandblast"): ("X", "El polvo ensucia el vidrio empacado"),
        ("oficina", "sandblast"): ("X", "Ruido y polvo junto a la oficina"),
    }
    cells = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            k = tuple(sorted([a, b]))
            if k in qualitative:
                r, why = qualitative[k]
            elif k in flow:
                ratio = flow[k] / top
                r = "A" if ratio >= 0.6 else "E" if ratio >= 0.3 else "I"
                why = f"{flow[k]:.0f} viajes al día"
            else:
                r, why = "U", "Sin relación directa"
            cells.append({"a": a, "b": b, "r": r, "why": why})
    return {"ids": ids, "names": names, "cells": cells}
