import { motion } from 'motion/react'
import { fmt } from '../api'
import { useTip } from './Tip'

/* Diagrama de espagueti: la planta desde arriba con cada recorrido del material.
   El grosor de la línea es proporcional a los metros que camina al día. */
export default function FlowPlan({ plant, positions, legs, title, total, receiveGate, dispatchGate, bottleneck }) {
  const { node, bind } = useTip()
  const { w: W, d: D } = plant.size
  const pad = 2.5
  const stationOf = Object.fromEntries(plant.stations.map((s) => [s.id, s]))
  const maxM = Math.max(1, ...legs.map((l) => l.meters))
  const short = (n) => n.replace('Almacén de láminas', 'Láminas').replace('Mesa de ', '').replace('Recepción de láminas', 'Recepción')

  const box = (s) => {
    const p = positions[s.id]
    const turned = (p[2] || 0) % 180 !== 0
    const w = turned ? s.d : s.w
    const d = turned ? s.w : s.d
    return { x: p[0] - w / 2, y: p[1] - d / 2, w, d, cx: p[0], cy: p[1] }
  }

  const path = (l) => {
    if (l.path?.length) return 'M' + l.path.map(([x, y]) => `${x} ${y}`).join(' L')
    const A = positions[l.from]
    const B = positions[l.to]
    return `M${A[0]} ${A[1]} H${B[0]} V${B[1]}`
  }

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>{title}</h3>
        {total != null && <span className="num" style={{ fontSize: 'var(--t-20)', fontWeight: 700 }}>{fmt(total)} m al día</span>}
      </div>
      <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2 + 1.5}`} role="img" aria-label={title}>
        <rect x={0} y={0} width={W} height={D} fill="#f6f6f6" stroke="#000" strokeWidth={0.3} />
        {plant.gates.map((g) => {
          const on = g.id === receiveGate || g.id === dispatchGate
          return (
            <g key={g.id}>
              <rect x={g.x - 2.2} y={D - 0.25} width={4.4} height={0.9} fill={on ? '#000' : '#fff'} stroke="#000" strokeWidth={0.15} strokeDasharray={on ? undefined : '0.5 0.4'} />
              <text x={g.x} y={D + 2.2} textAnchor="middle" fontSize="1.25" fontWeight={on ? 800 : 400} fill={on ? '#000' : '#767676'}>
                {g.id}
                {g.id === receiveGate ? ' entra' : g.id === dispatchGate ? ' sale' : ''}
              </text>
            </g>
          )
        })}
        {plant.fixed.map((f) => (
          <g key={f.id}>
            <rect x={f.x - f.w / 2} y={f.z - f.d / 2} width={f.w} height={f.d} fill="#fff" stroke="#c2c2c2" strokeWidth={0.2} strokeDasharray="0.6 0.4" />
            <text x={f.x} y={f.z + 0.4} textAnchor="middle" fontSize="1.2" fill="#767676">
              {f.id === 'oficina' ? 'Oficina' : 'Baños'}
            </text>
          </g>
        ))}
        {plant.stations.map((s) => {
          const b = box(s)
          const hot = s.id === bottleneck
          return (
            <g
              key={s.id}
              {...bind(
                <>
                  <b>{s.name}</b>
                  <br />
                  {s.w} × {s.d} m
                </>,
              )}
            >
              <motion.rect
                initial={false}
                animate={{ x: b.x, y: b.y, width: b.w, height: b.d }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                fill={hot ? '#000' : '#fff'}
                stroke="#000"
                strokeWidth={0.25}
              />
              <motion.text
                initial={false}
                animate={{ x: b.cx, y: b.cy + 0.4 }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                textAnchor="middle"
                fontSize="1.15"
                fontWeight="700"
                fill={hot ? '#fff' : '#000'}
              >
                {short(s.name)}
              </motion.text>
            </g>
          )
        })}
        {legs.map((l, i) => (
          <motion.path
            key={`${l.from}-${l.to}`}
            d={path(l)}
            fill="none"
            stroke="#000"
            strokeOpacity={0.55}
            strokeLinejoin="round"
            strokeWidth={0.18 + (l.meters / maxM) * 0.9}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: 0.2 + i * 0.07 }}
            {...bind(
              <>
                <b>
                  {stationOf[l.from]?.name} a {stationOf[l.to]?.name}
                </b>
                <br />
                {fmt(l.dist, 1)} m por viaje, {fmt(l.trips, 1)} viajes al día
                <br />
                {fmt(l.meters)} m al día
              </>,
            )}
          />
        ))}
      </svg>
      {node}
    </div>
  )
}
