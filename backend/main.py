"""API de Cauce. Ejecutar: .venv/Scripts/python -m uvicorn main:app --reload --port 8000"""

from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from cauce.engine import analyze, evaluate, rebalance_ops
from cauce.plant import template
from cauce.providers import get_provider
from cauce.story import STORY_SCHEMA, STORY_SYSTEM, build_plant

app = FastAPI(title="Cauce")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
ai = get_provider()


class StoryIn(BaseModel):
    text: str


class PlantIn(BaseModel):
    plant: dict | None = None


class EvaluateIn(BaseModel):
    plant: dict
    positions: dict
    receive_gate: str = "A"
    dispatch_gate: str = "B"


class ReportIn(BaseModel):
    analysis: dict


class ChatIn(BaseModel):
    messages: list[dict]
    analysis: dict | None = None


@app.get("/api/health")
async def health():
    s = await ai.status()
    return {"provider": ai.name, "model": ai.model, **s}


@app.get("/api/plant")
async def plant():
    return template()


@app.post("/api/story")
async def story(body: StoryIn):
    extracted, source, error = None, "reglas", None
    try:
        extracted = await ai.json(STORY_SYSTEM, body.text, STORY_SCHEMA)
        source = "ia"
    except Exception as e:  # noqa: BLE001
        error = str(e)
    result = build_plant(body.text, extracted)
    return {**result, "source": source, "error": error}


@app.post("/api/analyze")
async def analyze_route(body: PlantIn):
    return analyze(body.plant or template())


@app.post("/api/evaluate")
async def evaluate_route(body: EvaluateIn):
    ops = rebalance_ops(body.plant, body.positions, body.receive_gate, body.dispatch_gate)
    return evaluate(body.plant, body.positions, ops, body.receive_gate, body.dispatch_gate, "sorted")


def facts(a: dict) -> str:
    cur = a["current"]
    rec = next(x for x in a["alternatives"] if x["id"] == a["recommended"])
    m = rec["metrics"]
    names = {s["id"]: s["name"] for s in a["plant"]["stations"]}
    loads = ", ".join(f"{s['name']} {round(s['util'] * 100)} %" for s in cur["stations"])
    moves = ", ".join(f"{names.get(x['id'], x['id'])} de {x['before']} a {x['after']}" for x in a["ops_moves"]) or "ninguno"
    alts = "; ".join(f"{x['name']}: {x['metrics']['glass_m']:.0f} m al día" for x in a["alternatives"])
    return (
        f"Planta: {a['plant']['name']}. Demanda: {cur['demand']} piezas al día.\n"
        f"Hoy: el vidrio recorre {cur['glass_m']:.0f} m al día; capacidad {cur['capacity']} piezas al día; "
        f"tiempo de fabricación {cur['lead_h']} h por pieza, de ellas {cur['lead_parts']['cola']:.0f} min esperando en cola; "
        f"carga de camiones {cur['loading_min']:.0f} min al día.\n"
        f"Carga de cada estación hoy: {loads}.\n"
        f"Cuello de botella: {names[cur['bottleneck']]} al {round(cur['bottleneck_util'] * 100)} %.\n"
        f"Alternativas evaluadas: {alts}.\n"
        f"Recomendada: {rec['name']}. {rec['summary']} Obra: {rec['works']}\n"
        f"Con la recomendada: {m['glass_m']:.0f} m al día, capacidad {m['capacity']} piezas, "
        f"{m['lead_h']} h por pieza, carga de camiones {m['loading_min']:.0f} min.\n"
        f"Cambios de operarios: {moves}.\n"
        f"Nuevo cuello de botella: {names[m['bottleneck']]} al {round(m['bottleneck_util'] * 100)} %."
    )


REPORT_SYSTEM = (
    "Eres un ingeniero de procesos que le habla al dueño de un taller pequeño. "
    "Escribe en español, claro y directo, sin jerga innecesaria y sin inventar cifras: usa solo los datos dados. "
    "Estructura: un párrafo de diagnóstico, uno sobre el cuello de botella, uno sobre el rediseño y una lista de 3 acciones para la semana. "
    "No uses emojis. Máximo 230 palabras."
)


def fallback_report(a: dict) -> str:
    cur = a["current"]
    rec = next(x for x in a["alternatives"] if x["id"] == a["recommended"])
    m = rec["metrics"]
    names = {s["id"]: s["name"] for s in a["plant"]["stations"]}
    c = a["comparison"]
    return (
        f"Hoy el vidrio recorre {cur['glass_m']:.0f} m al día dentro de la bodega y cada pieza tarda {cur['lead_h']} h "
        f"en salir, aunque solo {cur['lead_parts']['proceso']:.0f} min son trabajo real. El resto es espera y transporte.\n\n"
        f"El cuello de botella es {names[cur['bottleneck']].lower()}: trabaja al {round(cur['bottleneck_util'] * 100)} % "
        f"y todo lo que viene después espera por ella.\n\n"
        f"Recomiendo {rec['name'].lower()}. {rec['summary']} El recorrido baja a {m['glass_m']:.0f} m "
        f"({c['glass_m']['pct']} %), la capacidad sube a {m['capacity']} piezas ({c['capacity']['pct']:+d} %) "
        f"y la carga de camiones baja a {m['loading_min']:.0f} min.\n\n"
        f"Acciones para esta semana:\n"
        f"1. Pasar un operario de láminas a la pulidora.\n"
        f"2. Despejar el portón B y poner un caballete por ruta en despacho.\n"
        f"3. Medir durante cinco días los tiempos reales de pulido para confirmar estos supuestos.\n\n"
        f"(Informe generado sin IA: Ollama no respondió.)"
    )


async def stream_or_fallback(messages: list[dict], fallback: str):
    try:
        async for tok in ai.stream(messages):
            yield tok
    except Exception:  # noqa: BLE001
        for word in fallback.split(" "):
            yield word + " "
            await asyncio.sleep(0.012)


@app.post("/api/report")
async def report(body: ReportIn):
    msgs = [{"role": "system", "content": REPORT_SYSTEM}, {"role": "user", "content": facts(body.analysis)}]
    return StreamingResponse(stream_or_fallback(msgs, fallback_report(body.analysis)), media_type="text/plain; charset=utf-8")


@app.post("/api/chat")
async def chat(body: ChatIn):
    system = (
        "Eres el ingeniero de procesos de Cauce. Respondes en español, breve y concreto, sin emojis. "
        "Si te preguntan algo que los datos no cubren, dilo y sugiere qué medir. Datos de la planta:\n"
        + (facts(body.analysis) if body.analysis else "Aún no hay análisis.")
    )
    msgs = [{"role": "system", "content": system}] + body.messages[-12:]
    fallback = "Ollama no está respondiendo. Inícialo con 'ollama serve' y vuelve a preguntar."
    return StreamingResponse(stream_or_fallback(msgs, fallback), media_type="text/plain; charset=utf-8")


MISSION_SCHEMA = {
    "type": "object",
    "properties": {
        "misiones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "titulo": {"type": "string"},
                    "detalle": {"type": "string"},
                    "puntos": {"type": "integer"},
                    "turno": {"type": "string"},
                },
                "required": ["titulo", "detalle", "puntos"],
            },
        }
    },
    "required": ["misiones"],
}


def fallback_missions(a: dict) -> list[dict]:
    names = {s["id"]: s["name"] for s in a["plant"]["stations"]}
    bn = names[a["current"]["bottleneck"]].lower()
    return [
        {"titulo": f"Liberar {bn} antes de las 14:00", "detalle": f"Que no queden más de 4 piezas esperando en {bn} a mitad de turno.", "puntos": 120, "turno": "Mañana"},
        {"titulo": "Despacho por ruta", "detalle": "Cada pieza terminada va al caballete de su ruta, no al montón.", "puntos": 80, "turno": "Todo el día"},
        {"titulo": "Carro lleno, viaje corto", "detalle": "Mover vidrio solo con el carro completo de 4 piezas.", "puntos": 60, "turno": "Tarde"},
    ]


@app.post("/api/missions")
async def missions(body: ReportIn):
    prompt = (
        "Propón 3 misiones cortas para el equipo de planta, enfocadas en equipos y no en personas, "
        "con puntos entre 50 y 150. Usa estos datos:\n" + facts(body.analysis)
    )
    try:
        out = await ai.json("Eres un ingeniero de procesos que diseña retos de mejora continua. Responde en español y solo JSON.", prompt, MISSION_SCHEMA)
        items = [m for m in out.get("misiones", []) if m.get("titulo")][:3]
        if len(items) == 3:
            return {"source": "ia", "missions": items}
    except Exception:  # noqa: BLE001
        pass
    return {"source": "reglas", "missions": fallback_missions(body.analysis)}
