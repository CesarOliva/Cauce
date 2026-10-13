# Cauce

Cuenta la historia de tu planta y mira su recorrido en orden: planta en 3D, diagnóstico de ingeniería de procesos, rediseño con antes y después, y un taller gamificado. El caso de ejemplo es un taller de vidrio con datos supuestos.

## Requisitos
- Python 3.12 o superior, Node.js 20 o superior.
- [Ollama](https://ollama.com) con el modelo: `ollama pull llama3.2:3b`. Sin Ollama la app funciona con textos de respaldo.

## Ejecutar
```bash
# Backend (puerto 8000)
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install fastapi uvicorn httpx pydantic
.venv/Scripts/python -m uvicorn main:app --port 8000

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```
Abre http://localhost:5173.

## Pasos de la app
1. Historia (con dictado por voz) y supuestos editables.
2. Planta de hoy en 3D, con foto aérea opcional.
3. Diagnóstico: KPI, gráficos e informe del ingeniero en streaming.
4. Rediseño: tres alternativas y botón «Mover máquinas».
5. Taller de mejora: nivel, misiones, insignias, tablero por turno y juego de arrastrar máquinas.

Los números salen del motor determinista (`backend/cauce/engine.py`); la IA solo narra y conversa.
