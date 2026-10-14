import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import PlantScene from './PlantScene'
import { setCursor } from '../fx/Cursor'

export default function PlantView({ ref, plant, positions, extras, buildKey, onSelect, tools, legend = true, hint = 'Arrastra para girar. Rueda para acercar. Clic en una máquina para enfocarla.' }) {
  const host = useRef(null)
  const labels = useRef(null)
  const scene = useRef(null)
  const [view, setView] = useState('3d')
  const placed = useRef(false)
  const posRef = useRef(positions)
  posRef.current = positions

  useEffect(() => {
    const s = new PlantScene(host.current, labels.current, {
      onHover: (id, name) => setCursor({ label: name || null }),
      onSelect: (id) => onSelect?.(id),
    })
    scene.current = s
    placed.current = false
    return () => {
      setCursor({ label: null })
      s.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => {
    if (!scene.current || !plant) return
    scene.current.build(plant, posRef.current, extras)
    // La cámara se coloca solo la primera vez: al reconstruir (por ejemplo al editar) se queda donde estaba.
    if (!placed.current) scene.current.setView(view)
    placed.current = true
  }, [plant, buildKey])

  useEffect(() => {
    if (scene.current?.plant) scene.current.applyExtras(extras)
  }, [extras])

  useImperativeHandle(ref, () => ({
    setLayout: (pos, opts) => scene.current?.setLayout(pos, opts),
    applyExtras: (opts) => scene.current?.applyExtras(opts),
    focus: (id) => scene.current?.focus(id),
    setView: (v) => {
      setView(v)
      scene.current?.setView(v)
    },
  }))

  const changeView = (v) => {
    setView(v)
    scene.current?.setView(v)
  }

  return (
    <div className="scene" onMouseLeave={() => setCursor({ label: null })}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <div ref={labels} className="scene-labels" />
      <div className="scene-tools">
        <div className="seg" role="group" aria-label="Vista">
          <button aria-pressed={view === '3d'} onClick={() => changeView('3d')}>Vista 3D</button>
          <button aria-pressed={view === 'top'} onClick={() => changeView('top')}>Desde arriba</button>
        </div>
        {tools}
      </div>
      {legend && (
        <div className="scene-legend" aria-hidden="true">
          <div className="legend-row"><span className="legend-swatch" />Recorrido del material</div>
          <div className="legend-row"><span className="legend-swatch legend-swatch--dash" />Solo una parte de las piezas</div>
          <div className="legend-row"><span className="legend-arrow" />Dirección del material</div>
          <div className="legend-row"><span className="legend-swatch--ring" />Cuello de botella</div>
        </div>
      )}
      <span className="scene-hint">{hint}</span>
    </div>
  )
}