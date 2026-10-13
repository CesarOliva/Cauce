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

## Hecho también (sesión 2)

- `src/charts/`: `Tip`, `LoadChart`, `FlowPlan`, `LeadChart`, `RelChart`.
- `src/steps/`: `Story`, `Plant`, `Diagnosis`, `Redesign`, `Workshop` (los 5 pasos).
- `src/components/`: `EngineerChat` y `useReport` (informe en streaming que vive en App).
- `src/App.jsx` (riel, transición, estado, toast) y `README.md` en la raíz.
- `npm run build` compila sin errores.

## Sesión 3

- Enrutamiento por pasillos en `engine.py` (`route_leg`): el vidrio rodea máquinas, oficina y baños (Dijkstra en malla de 0,5 m con castigo por giro). Cada tramo trae su `path`; `FlowPlan` y el juego lo dibujan. El juego calcula el recorrido exacto con `/api/evaluate` al soltar. La búsqueda del rediseño sigue usando distancia rectilínea como heurística.
- Pruebas de lectura de historias: `pruebas/historias.json` y `pruebas/probar_historias.py` (con el backend corriendo).
- Hallazgos de esas pruebas: ver sección siguiente.

## Representaciones genéricas (sesión 4)

- `models.js` ya no dibuja vidrio: tipos de estación genéricos `storage`, `gantry`, `workbench`, `line`, `cabin`, `tunnel`, `packing`, `receiving`, `dispatch`, `office`, `restroom`. Los nombres viejos (`rack`, `table`, `polisher`...) siguen funcionando como alias; un tipo desconocido se dibuja como banco de trabajo.
- Unidad de material: carro con caja (`makeCart`). Camión de plataforma con tarimas. Grúa con gancho (`makeHoist`) sobre el primer `storage`.
- El 3D usa los trazos del motor (`legs[].path`), igual que los diagramas: ya no cruza oficina ni baños.
- Textos de la interfaz y del informe de respaldo hablan de "material", no de "vidrio". El campo de la API sigue llamándose `glass_m`.
- Para otra industria basta cambiar `kind` en la plantilla de `plant.py`.

## Límites de la lectura de historias (hallazgos)

1. Otros rubros (aluminio, carpintería) se fuerzan a la plantilla de vidrio: aparecen pulidora, sandblasting y lavadora como "supuestas". Falta plantilla por industria (fase 3) o avisar al usuario.
2. Las reglas no leen cifras escritas con letra ("cinco personas", "dos entregas") ni unidades distintas a pieza, vidrio o unidad ("25 ventanas", "8 muebles por semana"); la IA tampoco las rescató.
3. Con menos de 8 operarios la planta sube a 8 (mínimo fijo).
4. Bien: números con dígitos, bisel como pulido, problemas del texto como notas.

## Falta

1. Revisar en el navegador real (no se pudo con el navegador integrado) y corregir detalles visuales: tamaños de los gráficos, rotulado de `RelChart`, cursor sobre el juego.
2. Foto aérea: hoy solo se sube a mano; falta generarla con un proveedor de imágenes (ver contexto-proyecto.md, sección 7).
3. Si el usuario edita «operarios de planta», los operarios por estación de hoy no se redistribuyen (solo afecta al rediseño).
4. Reducir el bundle (1 MB): dividir three.js con import dinámico.
5. Decisiones abiertas de contexto-proyecto.md (stack final, modelo de negocio, MCP).

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
