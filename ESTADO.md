# Cauce: estado del proyecto

Nombre: **Cauce**, el canal por donde corre el flujo. La marca es la planta vista desde arriba, con dos portones: el recorrido del material empieza enredado y se ordena en una U de portón a portón. La "u" de la palabra "cauce" es ese mismo trazo.

## Hecho

**Backend** (`backend/`, FastAPI + Ollama `llama3.2:3b`, probado y funcionando)
- `cauce/plant.py`: plantilla del taller de vidrio (bodega de 44×22 m, 9 estaciones, oficina y baños, portones A, B y C nuevo, rutas, supuestos editables).
- `cauce/engine.py`: motor determinista que calcula recorridos (distancia rectilínea × viajes), carga y capacidad por estación, cuello de botella, tiempo de fabricación (colas con Sakasegawa, espera de lote, transporte), carga de camiones y tabla de relaciones A/E/I/O/U/X. El rediseño usa ramificación y poda sobre 3 alternativas (U, línea recta, reordenar sin obra) y reparte los operarios.
- `cauce/story.py`: de la historia a la planta (reglas + extracción JSON con IA, con los supuestos por escrito).
- `cauce/providers/`: interfaz de proveedor de IA intercambiable (Ollama implementado).
- `main.py`: `/api/health`, `/api/plant`, `/api/story`, `/api/analyze`, `/api/evaluate`, `/api/report` (en streaming), `/api/chat` (en streaming), `/api/missions`. Si Ollama no responde, usa textos de respaldo.
- Resultado actual: recorrido de 2.915 a 1.288 m (−56 %), capacidad de 76 a 151 piezas (+98 %), tiempo de 7,0 a 1,4 h (−81 %), camiones de 252 a 156 min (−38 %).

**Frontend** (`frontend/`, React + Vite + Three.js + motion + Archivo)
- Configuración: proxy `/api` a :8000, `index.html` y favicon.
- `src/index.css`: sistema visual completo. Solo blanco, negro y grises; una sola familia (Archivo, eje de anchura: ancha en títulos y botones, normal en texto, condensada en cifras). Botones en bloque negro con esquina cortada, muy distintos del texto. Estilos de riel, pasos, escena, KPI, gráficos, juego, chat y versión móvil.
- `src/brand/FlowMark.jsx` (logo animado: de enredado a U, con una pieza que recorre el trazo) y `src/brand/Wordmark.jsx`.
- `src/fx/`: `Cursor` (cursor propio con etiquetas), `ClickSplash` (ondas al hacer clic), `Btn` (botón magnético), `Reveal` (titulares que suben, conteo de cifras, inclinación), `Intro` (pantalla de entrada con portones que se abren).
- `src/api.js`: cliente, streaming y cálculo del recorrido en JS para el juego.
- `src/three/models.js`: maquetas de cada máquina, el pulpo, operarios, camiones y árboles.
- `src/three/PlantScene.js`: escena completa (bodega, calle, portones, recorridos animados, piezas de vidrio en tránsito, anillo del cuello de botella, máquinas que se elevan y se mueven a su lugar nuevo, vista 3D o desde arriba, hover y enfoque).
- `src/three/PlantView.jsx`: envoltura de React.

## Falta

1. Gráficos en `src/charts/` (se escribieron pero no se guardaron): `Tip.jsx` (tooltip), `LoadChart.jsx` (carga frente a capacidad), `FlowPlan.jsx` (diagrama de espagueti), `LeadChart.jsx` (en qué se van las horas) y `RelChart.jsx` (tabla de relaciones).
2. Pasos en `src/steps/`:
   - `Story.jsx`: historia con dictado por voz (Web Speech), lectura con IA, chips de estación (mencionada o supuesta) y supuestos editables.
   - `Plant.jsx`: planta actual en 3D y foto aérea opcional que sube el usuario.
   - `Diagnosis.jsx`: KPI, gráficos e informe del ingeniero en streaming.
   - `Redesign.jsx`: 3 alternativas, botón "Mover máquinas", antes y después y cambios de operarios.
   - `Workshop.jsx`: gamificación con nivel, puntos, misiones de la IA, insignias, tablero por turno y un juego para arrastrar máquinas.
3. `src/components/EngineerChat.jsx`: panel para preguntarle al ingeniero.
4. `src/App.jsx` (riel lateral, transición entre pasos y estado) y `src/main.jsx`.
5. Compilar (`npm run build`), revisar en el navegador y corregir.
6. Un README con los pasos para ejecutarlo.

## Cómo ejecutar

```bash
# Backend
cd backend
.venv/Scripts/python -m uvicorn main:app --port 8000

# Frontend
cd frontend
npm run dev
```

Requiere Ollama corriendo con `llama3.2:3b`.
