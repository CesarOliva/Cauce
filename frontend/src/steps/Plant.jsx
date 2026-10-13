import { useMemo, useRef, useState } from 'react'
import { fmt } from '../api'
import Btn from '../fx/Btn'
import { Appear, RevealTitle } from '../fx/Reveal'
import PlantView from '../three/PlantView'

/* Paso 2: la planta guardada en el paso 1, en 3D y solo para ver. */
export default function Plant({ plant, analysis, notes, photo, setPhoto, onNext, onEdit }) {
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const view = useRef(null)
  const cur = analysis.current

  const load = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
  }

  const extras = useMemo(
    () => ({
      trucks: 2,
      ops: plant.use_assumptions ? Object.fromEntries(plant.stations.map((s) => [s.id, s.ops || 0])) : {},
      bottleneck: cur.bottleneck,
      bottleneckUtil: cur.bottleneck_util,
      legs: cur.legs,
    }),
    [plant, cur],
  )

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">02 / Tu planta hoy</span>
        <RevealTitle text="Así quedó tu planta." />
        <p className="lede">Es el plano que guardaste, en 3D. Las flechas marcan hacia dónde va el material. Para cambiar algo, vuelve al paso 1.</p>
      </header>

      <Appear>
        <PlantView
          ref={view}
          plant={plant}
          positions={plant.layout}
          extras={extras}
          buildKey="hoy"
          onSelect={(id) => view.current?.focus(id)}
          tools={
            <Btn size="small" variant="ghost" onClick={onEdit}>
              Editar plano
            </Btn>
          }
        />
      </Appear>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <Appear className="block">
          <h3>Lo que veo</h3>
          <ul className="note-list" style={{ marginTop: 14 }}>
            <li>
              Bodega de {plant.size.w} × {plant.size.d} m con {plant.stations.length} estaciones, {plant.routes.length} rutas y {plant.zones.length} zonas sin paso.
            </li>
            <li>Una pieza recorre {fmt(cur.piece_m, 1)} m de principio a fin.</li>
            {cur.blocked_legs > 0 && <li>{cur.blocked_legs} rutas no tienen paso libre; se cuentan en línea recta.</li>}
            {cur.avoid_hits.map((h, i) => (
              <li key={i}>{h.text}: el polvo, ruido o calor le llega.</li>
            ))}
            {notes.map((n, i) => (
              <li key={`n${i}`}>{n}</li>
            ))}
            <li>{plant.use_assumptions ? 'Con supuestos: el diagnóstico incluye capacidad, tiempos y camiones.' : 'Sin supuestos: el diagnóstico muestra solo recorridos y cercanías.'}</li>
          </ul>
        </Appear>

        <Appear className="block" delay={0.1}>
          <h3>Foto aérea (opcional)</h3>
          <p className="small" style={{ margin: '6px 0 14px' }}>
            Si tienes una toma desde arriba, súbela para compararla con el modelo. No sale del navegador.
          </p>
          <div
            className="photo-drop"
            data-over={over}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              load(e.dataTransfer.files[0])
            }}
          >
            {photo ? <img src={photo} alt="Foto aérea de la planta" /> : <p className="small">Arrastra una imagen aquí</p>}
            <button type="button" className="btn btn--ghost btn--small" onClick={() => input.current?.click()}>
              {photo ? 'Cambiar foto' : 'Elegir archivo'}
            </button>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => load(e.target.files[0])} />
          </div>
        </Appear>
      </div>

      <div className="row" style={{ marginTop: 32 }}>
        <Btn onClick={onNext}>Ver el diagnóstico</Btn>
      </div>
    </section>
  )
}
