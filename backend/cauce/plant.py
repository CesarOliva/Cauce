"""Plantilla del caso de referencia: taller de vidrio (caso hipotético, datos supuestos).

Coordenadas en metros. Origen en la esquina superior izquierda de la bodega,
x hacia la derecha, z hacia la calle. La calle queda en z > depth.
"""

from copy import deepcopy

GLASS_WORKSHOP = {
    "id": "taller-vidrio",
    "name": "Taller de vidrio",
    "industry": "Vidrio para sala y comedor",
    "size": {"w": 44, "d": 22},
    "gates": [
        {"id": "A", "x": 30, "existing": True, "label": "Portón A"},
        {"id": "B", "x": 38, "existing": True, "label": "Portón B", "note": "Hoy bloqueado con retazos"},
        {"id": "C", "x": 5, "existing": False, "label": "Portón C (nuevo)"},
    ],
    # t: minutos de trabajo por pieza que pasa por la estación.
    # share: fracción de las piezas que pasan por la estación.
    "stations": [
        {"id": "recepcion", "name": "Recepción de láminas", "kind": "receiving", "w": 6, "d": 4.5, "t": 0.0, "ops": 0, "share": 1.0},
        {"id": "laminas", "name": "Almacén de láminas", "kind": "storage", "w": 6.5, "d": 4.5, "t": 1.2, "ops": 2, "share": 1.0},
        {"id": "corte", "name": "Mesa de corte", "kind": "gantry", "w": 6, "d": 4, "t": 4.2, "ops": 2, "share": 1.0},
        {"id": "recorte", "name": "Recorte", "kind": "workbench", "w": 4.5, "d": 3, "t": 1.0, "ops": 1, "share": 1.0},
        {"id": "pulido", "name": "Pulidora", "kind": "line", "w": 7, "d": 2.6, "t": 4.6, "ops": 1, "share": 1.0},
        {"id": "sandblast", "name": "Sandblasting", "kind": "cabin", "w": 5, "d": 4.5, "t": 3.6, "ops": 1, "share": 0.35},
        {"id": "lavado", "name": "Lavadora", "kind": "tunnel", "w": 5.5, "d": 2.6, "t": 1.0, "ops": 1, "share": 1.0},
        {"id": "empaque", "name": "Empaque", "kind": "packing", "w": 5, "d": 4, "t": 2.0, "ops": 1, "share": 1.0},
        {"id": "despacho", "name": "Despacho", "kind": "dispatch", "w": 6, "d": 4.5, "t": 2.6, "ops": 1, "share": 1.0},
    ],
    "fixed": [
        {"id": "oficina", "name": "Oficina (ventas y nómina)", "kind": "office", "x": 22.5, "z": 18, "w": 8, "d": 6},
        {"id": "banos", "name": "Baños", "kind": "restroom", "x": 14.5, "z": 18.5, "w": 5, "d": 5},
    ],
    # per: unidades movidas por pieza (una lámina rinde 4 piezas).
    # batch: piezas o láminas por viaje; None usa el lote general.
    # by: estación cuyo operario hace el viaje; None usa la de origen.
    "routing": [
        {"from": "recepcion", "to": "laminas", "frac": 1.0, "per": 0.25, "batch": 1, "by": "laminas"},
        {"from": "laminas", "to": "corte", "frac": 1.0, "per": 0.25, "batch": 1, "by": None},
        {"from": "corte", "to": "recorte", "frac": 1.0, "per": 1.0, "batch": None, "by": None},
        {"from": "recorte", "to": "pulido", "frac": 1.0, "per": 1.0, "batch": None, "by": None},
        {"from": "pulido", "to": "sandblast", "frac": 0.35, "per": 1.0, "batch": None, "by": None},
        {"from": "pulido", "to": "lavado", "frac": 0.65, "per": 1.0, "batch": None, "by": None},
        {"from": "sandblast", "to": "lavado", "frac": 0.35, "per": 1.0, "batch": None, "by": None},
        {"from": "lavado", "to": "empaque", "frac": 1.0, "per": 1.0, "batch": None, "by": None},
        {"from": "empaque", "to": "despacho", "frac": 1.0, "per": 1.0, "batch": None, "by": None},
    ],
    # Pares que no deben quedar juntos (polvo del sandblasting).
    "avoid": [["sandblast", "empaque"], ["sandblast", "oficina"]],
    "params": {
        "demand": 78,
        "shift_min": 480,
        "efficiency": 0.82,
        "batch": 4,
        "speed": 30,
        "load_min": 1.0,
        "search_min_mixed": 0.8,
        "search_min_sorted": 0.1,
        "trucks": 3,
        "truck_setup": 12,
        "cv2": 1.0,
        "floor_ops": 10,
        "admin_ops": 2,
    },
    "current": {
        "receive_gate": "A",
        "dispatch_gate": "A",
        "staging": "mixed",
        "notes": [
            "El portón B está bloqueado con retazos y cajas vacías: los camiones cargan por el A.",
            "Lo terminado se amontona en despacho sin separar por ruta.",
        ],
        "positions": {
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
    },
}

ASSUMPTIONS = [
    ("demand", "Demanda", "piezas al día", "Pedidos promedio de un taller pequeño de vidrio decorativo."),
    ("shift_min", "Jornada", "minutos", "Un turno de 8 horas."),
    ("efficiency", "Eficiencia", "fracción", "Descuenta pausas, ajustes y cambios de referencia."),
    ("batch", "Lote por carro", "piezas", "Piezas de vidrio que caben en un carro de caballetes."),
    ("speed", "Velocidad con carro", "m/min", "Caminar empujando vidrio, con cuidado."),
    ("load_min", "Carga al camión", "min/pieza", "Subir y asegurar una pieza en el caballete del camión."),
    ("search_min_mixed", "Búsqueda en despacho mezclado", "min/pieza", "Encontrar la pieza de cada ruta entre todo lo terminado."),
    ("search_min_sorted", "Búsqueda en despacho por ruta", "min/pieza", "Con un caballete por ruta, la pieza ya está en su sitio."),
    ("trucks", "Camiones al día", "rutas", "Tres rutas de entrega diarias."),
    ("truck_setup", "Alistamiento por camión", "minutos", "Maniobra, papeles y amarre."),
    ("floor_ops", "Operarios de planta", "personas", "Sin contar la oficina."),
    ("admin_ops", "Personal de oficina", "personas", "Ventas, pagos y nómina."),
]


def template():
    return deepcopy(GLASS_WORKSHOP)
