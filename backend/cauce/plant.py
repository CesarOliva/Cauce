"""Planta de ejemplo: el taller de vidrio del caso de referencia (hipotético).

Coordenadas en metros. Origen en la esquina del fondo a la izquierda,
x hacia la derecha, z hacia la calle (los portones están en z = d).
"""

from copy import deepcopy

from .catalog import DEFAULT_PARAMS

GLASS_WORKSHOP = {
    "name": "Taller de vidrio",
    "industry": "Vidrio para sala y comedor",
    "size": {"w": 44, "d": 22},
    "gates": [{"id": "A", "x": 30, "label": "Portón A"}, {"id": "B", "x": 38, "label": "Portón B"}],
    "receive_gate": "A",
    "dispatch_gate": "A",
    "stations": [
        {"id": "recepcion", "name": "Recepción de láminas", "kind": "recepcion", "w": 6, "d": 4.5, "t": 0.0, "ops": 0},
        {"id": "laminas", "name": "Almacén de láminas", "kind": "almacen", "w": 6.5, "d": 4.5, "t": 1.2, "ops": 2},
        {"id": "corte", "name": "Mesa de corte", "kind": "corte", "w": 6, "d": 4, "t": 4.2, "ops": 2},
        {"id": "recorte", "name": "Recorte", "kind": "mesa", "w": 4.5, "d": 3, "t": 1.0, "ops": 1},
        {"id": "pulido", "name": "Pulidora", "kind": "pulido", "w": 7, "d": 2.6, "t": 4.6, "ops": 1},
        {"id": "sandblast", "name": "Sandblasting", "kind": "pintura", "w": 5, "d": 4.5, "t": 3.6, "ops": 1},
        {"id": "lavado", "name": "Lavadora", "kind": "lavado", "w": 5.5, "d": 2.6, "t": 1.0, "ops": 1},
        {"id": "empaque", "name": "Empaque", "kind": "empaque", "w": 5, "d": 4, "t": 2.0, "ops": 1},
        {"id": "despacho", "name": "Despacho", "kind": "despacho", "w": 6, "d": 4.5, "t": 2.6, "ops": 1},
    ],
    "zones": [
        {"id": "oficina", "name": "Oficina (ventas y nómina)", "kind": "oficina", "x": 22.5, "z": 18, "w": 8, "d": 6},
        {"id": "banos", "name": "Baños", "kind": "banos", "x": 14.5, "z": 18.5, "w": 5, "d": 5},
    ],
    "walls": [],
    "routes": [
        {"id": "r1", "from": "recepcion", "to": "laminas", "frac": 1.0},
        {"id": "r2", "from": "laminas", "to": "corte", "frac": 1.0},
        {"id": "r3", "from": "corte", "to": "recorte", "frac": 1.0},
        {"id": "r4", "from": "recorte", "to": "pulido", "frac": 1.0},
        {"id": "r5", "from": "pulido", "to": "sandblast", "frac": 0.35},
        {"id": "r6", "from": "pulido", "to": "lavado", "frac": 0.65},
        {"id": "r7", "from": "sandblast", "to": "lavado", "frac": 0.35},
        {"id": "r8", "from": "lavado", "to": "empaque", "frac": 1.0},
        {"id": "r9", "from": "empaque", "to": "despacho", "frac": 1.0},
    ],
    "use_assumptions": True,
    "params": {**DEFAULT_PARAMS, "demand": 78, "trucks": 3},
    "layout": {
        "laminas": [5, 4, 0],
        "sandblast": [13.5, 4.5, 0],
        "lavado": [30.5, 3.5, 0],
        "corte": [21.5, 11, 0],
        "recorte": [5.5, 11, 0],
        "pulido": [5.5, 18.5, 0],
        "empaque": [38, 11, 0],
        "recepcion": [30.5, 18.5, 0],
        "despacho": [38, 18.5, 0],
    },
}


def example():
    return deepcopy(GLASS_WORKSHOP)
