import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { api, fmt, glassMeters } from '../api'
import Btn from '../fx/Btn'
import { Appear, CountUp, RevealTitle } from '../fx/Reveal'

export const LEVELS = [
  { at: 0, name: 'Taller desordenado' },
  { at: 150, name: 'Taller en marcha' },
  { at: 350, name: 'Flujo ordenado' },
  { at: 600, name: 'Maestro del flujo' },
]

export function pointsOf(game) {
  const missions = game.missions.filter((m) => game.done[m.titulo]).reduce((a, m) => a + (m.puntos || 0), 0)
  return missions + (game.moved ? 150 : 0) + Math.round(game.bestSaved * 5)
}

export const levelOf = (pts) => LEVELS.reduce((n, l, i) => (pts >= l.at ? i : n), 0)

const BADGE_ICONS = {
  plano: <path d="M10 54 V10 H54 V54 M10 54 H24 M40 54 H54" />,
  flujo: <path d="M18 54 V26 C18 14 24 10 32 10 C40 10 46 14 46 26 V54" />,
  cero: <path d="M12 32 A20 20 0 1 0 52 32 A20 20 0 1 0 12 32 M20 44 L44 20" />,
  despacho: <path d="M8 44 H44 V22 H28 M44 32 H56 V44 M16 44 a5 5 0 1 0 0.1 0 M44 44 a5 5 0 1 0 0.1 0" />,
  equipo: <path d="M32 12 L52 24 V42 L32 54 L12 42 V24 Z M32 12 V54 M12 24 L52 42" />,
  ruta: <path d="M10 50 L26 30 L36 40 L54 14 M44 14 H54 V24" />,
}

function badgesFor(game, points, recommendedSaved) {
  const missionsDone = game.missions.filter((m) => game.done[m.titulo]).length
  return [
    { id: 'plano', name: 'Primer plano', on: true },
    { id: 'ruta', name: 'Recorrido corto', on: game.bestSaved >= 25 },
    { id: 'flujo', name: 'Maestro del flujo', on: game.moved || game.bestSaved >= recommendedSaved * 0.9 },
    { id: 'despacho', name: 'Récord de despacho', on: missionsDone >= 2 },
    { id: 'cero', name: 'Cero desperdicios', on: game.missions.length > 0 && missionsDone === game.missions.length },
    { id: 'equipo', name: 'Equipo completo', on: points >= 600 },
  ]
}

function Check({ on }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      {on && <path d="M3 9.5 L7.5 14 L15 4" fill="none" stroke="currentColor" strokeWidth="2.6" />}
    </svg>
  )
}

/* Juego: arrastra las máquinas y mira cómo cambia el recorrido. */
function LayoutGame({ analysis, game, setGame, notify }) {
  const { plant, current: cur } = analysis
  const best = analysis.alternatives.find((a) => a.id === analysis.recommended).metrics.glass_m
  const start = useMemo(() => Object.fromEntries(Object.entries(plant.current.positions).map(([k, v]) => [k, [v[0], v[1], 0]])), [plant.current.positions])
  const [pos, setPos] = useState(start)
  const [drag, setDrag] = useState(null)
  const [exact, setExact] = useState(null)
  const ticket = useRef(0)
  const svg = useRef(null)
  const { w: W, d: D } = plant.size
  const meters = exact ? exact.glass_m : glassMeters(plant, pos)
  const saved = Math.max(0, ((cur.glass_m - meters) / cur.glass_m) * 100)

  const toSvg = (e) => {
    const pt = svg.current.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse())
    return [p.x, p.y]
  }
  const onMove = (e) => {
    if (!drag) return
    const s = plant.stations.find((q) => q.id === drag.id)
    const [x, y] = toSvg(e)
    setExact(null)
    const nx = Math.min(W - s.w / 2, Math.max(s.w / 2, Math.round((x - drag.dx) * 2) / 2))
    const ny = Math.min(D - s.d / 2, Math.max(s.d / 2, Math.round((y - drag.dy) * 2) / 2))
    setPos((p) => ({ ...p, [drag.id]: [nx, ny, 0] }))
  }
  const onUp = () => {
    if (!drag) return
    setDrag(null)
    // Al soltar, el motor calcula el recorrido real por los pasillos.
    const id = ++ticket.current
    api
      .evaluate(plant, pos, plant.current.receive_gate, plant.current.dispatch_gate)
      .then((m) => {
        if (id !== ticket.current) return
        setExact(m)
        const sv = Math.max(0, ((cur.glass_m - m.glass_m) / cur.glass_m) * 100)
        if (sv > game.bestSaved + 0.5) {
          setGame((g) => ({ ...g, bestSaved: sv }))
          notify(`Nuevo récord: ${fmt(sv)} % menos recorrido`)
        }
      })
      .catch(() => {})
  }

  return (
    <div className="stack">
      <div className="game" data-cursor="drag">
        <svg ref={svg} viewBox={`-1 -1 ${W + 2} ${D + 2}`} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} role="img" aria-label="Plano para mover las máquinas">
          <rect x={0} y={0} width={W} height={D} fill="#fff" stroke="#000" strokeWidth={0.3} />
          {plant.fixed.map((f) => (
            <rect key={f.id} x={f.x - f.w / 2} y={f.z - f.d / 2} width={f.w} height={f.d} fill="#eeeeee" stroke="#c2c2c2" strokeWidth={0.2} strokeDasharray="0.6 0.4" />
          ))}
          {exact &&
            exact.legs.map((l) => (
              <path key={`${l.from}-${l.to}`} d={'M' + l.path.map(([x, y]) => `${x} ${y}`).join(' L')} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={0.15 + l.meters / 700} strokeLinejoin="round" />
            ))}
          {!exact && plant.routing.map((e) => {
            const a = pos[e.from]
            const b = pos[e.to]
            const trips = (plant.params.demand * e.frac * e.per) / (e.batch || plant.params.batch)
            const m = trips * (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]))
            return <path key={`${e.from}-${e.to}`} d={`M${a[0]} ${a[1]} H${b[0]} V${b[1]}`} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={0.15 + m / 700} strokeLinejoin="round" />
          })}
          {plant.stations.map((s) => {
            const p = pos[s.id]
            const hot = s.id === cur.bottleneck
            return (
              <g
                key={s.id}
                className="game-piece"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                  const [x, y] = toSvg(e)
                  setDrag({ id: s.id, dx: x - p[0], dy: y - p[1] })
                }}
              >
                <rect className="body" x={p[0] - s.w / 2} y={p[1] - s.d / 2} width={s.w} height={s.d} fill={hot ? '#c2c2c2' : '#fff'} stroke="#000" strokeWidth={0.25} />
                <text x={p[0]} y={p[1] + 0.4} textAnchor="middle" fontSize="1.1" fontWeight="700" fill="#000" pointerEvents="none">
                  {s.name.replace('Almacén de láminas', 'Láminas').replace('Mesa de ', '').replace('Recepción de láminas', 'Recepción')}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="game-score">
          <div>
            <div className="small">Recorrido</div>
            <b className="num" style={{ fontSize: 'var(--t-28)' }}>{fmt(meters)} m</b>
          </div>
          <div>
            <div className="small">Frente a hoy</div>
            <b className="num" style={{ fontSize: 'var(--t-28)' }}>{saved >= 0.5 ? `−${fmt(saved)}` : '0'} %</b>
          </div>
          <div>
            <div className="small">Lo que logra el motor</div>
            <b className="num" style={{ fontSize: 'var(--t-28)' }}>{fmt(best)} m</b>
          </div>
        </div>
      </div>
      <div className="row">
        <Btn size="small" variant="ghost" onClick={() => { ticket.current++; setExact(null); setPos(start) }}>
          Volver a hoy
        </Btn>
        <span className="small">Arrastra cada máquina. Al soltar, el recorrido se calcula por los pasillos, sin atravesar máquinas.</span>
      </div>
    </div>
  )
}

export default function Workshop({ analysis, game, setGame, notify }) {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)
  const points = pointsOf(game)
  const lvl = levelOf(points)
  const next = LEVELS[lvl + 1]
  const recommendedSaved = Math.abs(analysis.comparison.glass_m.pct)
  const prevLevel = useRef(lvl)

  useEffect(() => {
    if (lvl > prevLevel.current) notify(`Subiste a «${LEVELS[lvl].name}»`)
    prevLevel.current = lvl
  }, [lvl, notify])

  useEffect(() => {
    if (game.missions.length) return
    let live = true
    setLoading(true)
    api
      .missions(analysis)
      .then((r) => {
        if (!live) return
        setSource(r.source)
        setGame((g) => ({ ...g, missions: r.missions }))
      })
      .catch(() => {})
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (m) => {
    const was = !!game.done[m.titulo]
    setGame((g) => ({ ...g, done: { ...g.done, [m.titulo]: !was } }))
    if (!was) notify(`+${m.puntos} puntos: ${m.titulo}`)
  }

  const shifts = useMemo(() => {
    const by = {}
    for (const m of game.missions) {
      const k = m.turno || 'Todo el día'
      by[k] ||= { total: 0, done: 0 }
      by[k].total += m.puntos || 0
      if (game.done[m.titulo]) by[k].done += m.puntos || 0
    }
    return Object.entries(by)
  }, [game])

  const badges = badgesFor(game, points, recommendedSaved)

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">05 / Taller de mejora</span>
        <RevealTitle text="Que el equipo también juegue." />
        <p className="lede">
          La mejora continua funciona cuando llega al piso de planta. Cada metro que ahorras y cada misión que cumplen los equipos suma puntos y sube el nivel del taller.
        </p>
      </header>

      <Appear className="level">
        <div className="points num">
          <CountUp value={points} />
        </div>
        <div>
          <span className="small">Nivel {lvl + 1} de {LEVELS.length}</span>
          <h2>{LEVELS[lvl].name}</h2>
          <p className="small">{next ? `Te faltan ${next.at - points} puntos para «${next.name}».` : 'Llegaste al nivel más alto.'}</p>
          <div className="ladder">
            {LEVELS.map((l, i) => (
              <div key={l.name} className="ladder-step" data-on={i <= lvl}>
                <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.2 + i * 0.12 }} />
                {l.name}
              </div>
            ))}
          </div>
        </div>
      </Appear>

      <div className="grid-2" style={{ marginTop: 32, alignItems: 'start' }}>
        <Appear className="stack">
          <h3>Misiones de hoy</h3>
          {loading && <p className="small">El ingeniero está pensando las misiones…</p>}
          <div className="missions">
            {game.missions.map((m) => (
              <div key={m.titulo} className="mission" data-done={!!game.done[m.titulo]}>
                <button type="button" className="check" onClick={() => toggle(m)} aria-pressed={!!game.done[m.titulo]} aria-label={`Marcar «${m.titulo}»`}>
                  <Check on={!!game.done[m.titulo]} />
                </button>
                <div>
                  <h3>{m.titulo}</h3>
                  <p className="small">{m.detalle}</p>
                  {m.turno && <span className="small">Turno: {m.turno}</span>}
                </div>
                <b className="num">+{m.puntos}</b>
              </div>
            ))}
          </div>
          {source && <span className="small">{source === 'ia' ? 'Misiones escritas con IA.' : 'Misiones por reglas (la IA no respondió).'}</span>}
        </Appear>

        <Appear className="stack" delay={0.1}>
          <h3>Tablero por turno</h3>
          <p className="small">Compiten los equipos, no las personas.</p>
          <div className="board">
            {shifts.map(([name, v]) => (
              <div key={name} className="board-row">
                <span style={{ fontWeight: 650 }}>{name}</span>
                <div className="board-bar">
                  <motion.span initial={false} animate={{ width: `${v.total ? (v.done / v.total) * 100 : 0}%` }} transition={{ duration: 0.7 }} />
                </div>
                <span className="num">{v.done} / {v.total}</span>
              </div>
            ))}
            {shifts.length === 0 && <span className="small">Aún no hay misiones.</span>}
          </div>
        </Appear>
      </div>

      <Appear style={{ marginTop: 40 }}>
        <h3 style={{ marginBottom: 14 }}>Insignias</h3>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className="badge" data-on={b.on}>
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="square">
                {BADGE_ICONS[b.id]}
              </svg>
              {b.name}
            </div>
          ))}
        </div>
      </Appear>

      <Appear style={{ marginTop: 40 }}>
        <h3>Reordena tú la bodega</h3>
        <p className="small" style={{ margin: '6px 0 16px' }}>
          Mueve las máquinas con el mouse. Cada mejora de tu recorrido suma puntos; intenta acercarte a lo que encontró el motor.
        </p>
        <LayoutGame analysis={analysis} game={game} setGame={setGame} notify={notify} />
      </Appear>
    </section>
  )
}
