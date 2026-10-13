"""Pasa las historias de pruebas/historias.json por /api/story y /api/analyze y resume qué entendió Cauce.
Uso (con el backend corriendo): backend/.venv/Scripts/python pruebas/probar_historias.py"""
import json, pathlib, httpx

API = "http://localhost:8000/api"
casos = json.loads((pathlib.Path(__file__).parent / "historias.json").read_text(encoding="utf-8"))
for c in casos:
    r = httpx.post(f"{API}/story", json={"text": c["texto"]}, timeout=120).json()
    p = r["plant"]["params"]
    men = [s["name"] for s in r["stations"] if s["mentioned"]]
    sup = [s["name"] for s in r["stations"] if not s["mentioned"]]
    a = httpx.post(f"{API}/analyze", json={"plant": r["plant"]}, timeout=120).json()
    cur = a["current"]
    print(f"\n== {c['id']}: {c['nota']}\n  lectura: {r['source']}" + (f" ({r['error'][:60]})" if r.get("error") else ""))
    print(f"  operarios planta={p['floor_ops']} demanda={p['demand']} camiones={p['trucks']}")
    print(f"  mencionadas ({len(men)}): {', '.join(men)}")
    print(f"  supuestas   ({len(sup)}): {', '.join(sup)}")
    print(f"  IA procesos: {(r.get('ai') or {}).get('procesos')}")
    print(f"  resultado: cuello={cur['bottleneck']} {cur['bottleneck_util']:.0%}, recorrido {cur['glass_m']:.0f} m, recomendada={a['recommended']}")
