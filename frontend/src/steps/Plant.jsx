import { useMemo, useRef, useState } from 'react'
import Btn from '../fx/Btn'
import { Appear, RevealTitle } from '../fx/Reveal'
import PlantView from '../three/PlantView'

/* Planta de hoy en 3D. La foto aérea es opcional: la sube el usuario
   (por ejemplo una imagen hecha con ChatGPT) y se guarda en el navegador. */
export default function Plant({ analysis, notes, photo, setPhoto, onNext }) {
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const view = useRef(null)
  const cur = analysis.current
  const plant = analysis.plant

  const load = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
  }

  const extras = useMemo(
    () => ({
      gates: ['A', 'B'],
      blocked: ['B'],
      receiveGate: plant.current.receive_gate,
      dispatchGate: plant.current.dispatch_gate,
      trucks: 2,
      ops: Object.fromEntries(cur.stations.map((s) => [s.id, s.ops])),
      bottleneck: cur.bottleneck,
      bottleneckUtil: cur.bottleneck_util,
      staging: 'mixed',
      legs: cur.legs,
    }),
    [plant.current, cur],
  )

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">02 / Tu planta hoy</span>
        <RevealTitle text="Así se ve tu planta, tal como la contaste." />
        <p className="lede">
          Esta es la bodega con las máquinas donde las puse según tu historia. El anillo marca el cuello de botella. Gira, acércate y haz clic en una máquina para enfocarla.
        </p>
      </header>

      <Appear>
        <PlantView ref={view} plant={plant} positions={plant.current.positions} extras={extras} buildKey="hoy" onSelect={(id) => view.current?.focus(id)} />
      </Appear>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <Appear className="block">
          <h3>Foto aérea (opcional)</h3>
          <p className="small" style={{ margin: '6px 0 14px' }}>
            Si tienes una toma desde arriba de la bodega, súbela para tenerla a mano junto al modelo. No sale del navegador.
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
            {photo ? <img src={photo} alt="Foto aérea de la bodega" /> : <p className="small">Arrastra una imagen aquí</p>}
            <button type="button" className="btn btn--ghost btn--small" onClick={() => input.current?.click()}>
              {photo ? 'Cambiar foto' : 'Elegir archivo'}
            </button>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => load(e.target.files[0])} />
          </div>
        </Appear>

        <Appear className="block" delay={0.1}>
          <h3>Lo que veo en tu planta</h3>
          <ul className="note-list" style={{ marginTop: 14 }}>
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
            <li>
              Medidas de la bodega: {plant.size.w} × {plant.size.d} m, {plant.stations.length} estaciones y {plant.params.floor_ops} operarios de planta (supuesto si no los diste).
            </li>
          </ul>
        </Appear>
      </div>

      <div className="row" style={{ marginTop: 32 }}>
        <Btn onClick={onNext}>Ver el diagnóstico</Btn>
      </div>
    </section>
  )
}
