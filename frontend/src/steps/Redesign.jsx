import { useMemo, useRef, useState } from 'react'
import { fmt } from '../api'
import FlowPlan from '../charts/FlowPlan'
import LeadChart from '../charts/LeadChart'
import Btn from '../fx/Btn'
import { Appear, RevealTitle } from '../fx/Reveal'
import PlantView from '../three/PlantView'

const pct = (a, b) => (a ? Math.round(((b - a) / a) * 100) : 0)

function Delta({ label, unit, before, after, decimals = 0, goodWhenUp }) {
  const p = pct(before, after)
  const good = goodWhenUp ? p > 0 : p < 0
  const max = Math.max(before, after) || 1
  return (
    <div className="kpi">
      <div className="kpi-value num">
        {p > 0 ? '+' : p < 0 ? '−' : ''}
        {Math.abs(p)}
        <small>%</small>
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">
        {fmt(before, decimals)} → {fmt(after, decimals)} {unit}
      </div>
      <div className="kpi-bars" aria-hidden="true">
        <span style={{ width: `${(before / max) * 100}%`, background: '#c2c2c2' }} />
        <span style={{ width: `${(after / max) * 100}%`, background: good ? '#000' : '#767676' }} />
      </div>
    </div>
  )
}

export default function Redesign({ analysis, onNext, onMoved }) {
  const { plant, current: cur, alternatives } = analysis
  const view = useRef(null)
  const [altId, setAltId] = useState(analysis.recommended)
  const [moved, setMoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const alt = alternatives.find((a) => a.id === altId)
  const m = alt.metrics

  const before = useMemo(
    () => ({
      gates: ['A', 'B'],
      blocked: ['B'],
      receiveGate: plant.current.receive_gate,
      dispatchGate: plant.current.dispatch_gate,
      trucks: 2,
      ops: Object.fromEntries(cur.stations.map((s) => [s.id, s.ops])),
      bottleneck: cur.bottleneck,
      bottleneckUtil: cur.bottleneck_util,
      legs: cur.legs,
    }),
    [plant.current, cur],
  )
  const after = useMemo(
    () => ({
      gates: [...new Set([alt.receive_gate, alt.dispatch_gate])],
      blocked: [],
      receiveGate: alt.receive_gate,
      dispatchGate: alt.dispatch_gate,
      trucks: 2,
      ops: m.ops,
      bottleneck: m.bottleneck,
      bottleneckUtil: m.bottleneck_util,
      legs: m.legs,
    }),
    [alt, m],
  )

  const moves = useMemo(
    () =>
      plant.stations
        .map((s) => ({ id: s.id, name: s.name, before: s.ops, after: m.ops[s.id] ?? 0 }))
        .filter((x) => x.before !== x.after),
    [plant, m],
  )

  const apply = (target, layout, legs) => {
    setBusy(true)
    view.current?.setLayout(layout, {
      legs,
      onDone: () => {
        setMoved(target)
        setBusy(false)
        if (target) onMoved?.(alt)
      },
    })
  }
  const go = () => apply(true, alt.positions, m.legs)
  const back = () => apply(false, plant.current.positions, cur.legs)
  const pick = (id) => {
    setAltId(id)
    if (moved) {
      const next = alternatives.find((a) => a.id === id)
      setBusy(true)
      view.current?.setLayout(next.positions, { legs: next.metrics.legs, onDone: () => setBusy(false) })
    }
  }

  const tools = moved ? (
    <Btn size="small" variant="ghost" onClick={back} disabled={busy}>
      Volver a hoy
    </Btn>
  ) : (
    <Btn size="small" onClick={go} disabled={busy}>
      {busy ? 'Moviendo…' : 'Mover máquinas'}
    </Btn>
  )

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">04 / Rediseño</span>
        <RevealTitle text="Tres formas de ordenar la bodega." />
        <p className="lede">
          Probé todas las combinaciones de lugares para cada alternativa y me quedé con la de menor recorrido. Elige una y pulsa «Mover máquinas» para verla en acción.
        </p>
      </header>

      <Appear className="alts">
        {alternatives.map((a) => (
          <button key={a.id} type="button" className="alt" aria-pressed={a.id === altId} onClick={() => pick(a.id)}>
            {a.id === analysis.recommended && <span className="alt-best">RECOMENDADA</span>}
            <h3>{a.name}</h3>
            <div className="alt-figure num">
              {fmt(a.metrics.glass_m)}
              <small style={{ fontSize: '0.35em', marginLeft: 6 }}>m al día</small>
            </div>
            <p className="small">{a.summary}</p>
            <p className="small">Obra: {a.works}</p>
          </button>
        ))}
      </Appear>

      <Appear style={{ marginTop: 32 }}>
        <PlantView ref={view} plant={plant} positions={plant.current.positions} extras={moved ? after : before} buildKey="rediseno" onSelect={(id) => view.current?.focus(id)} tools={tools} />
      </Appear>

      <Appear className="kpis" style={{ marginTop: 32 }}>
        <Delta label="Camina el material" unit="m al día" before={cur.glass_m} after={m.glass_m} />
        <Delta label="Capacidad del taller" unit="piezas" before={cur.capacity} after={m.capacity} decimals={1} goodWhenUp />
        <Delta label="Tiempo de fabricación" unit="h por pieza" before={cur.lead_h} after={m.lead_h} decimals={1} />
        <Delta label="Carga de camiones" unit="min al día" before={cur.loading_min} after={m.loading_min} />
      </Appear>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <Appear className="block">
          <FlowPlan plant={plant} positions={plant.current.positions} legs={cur.legs} title="Hoy" total={cur.glass_m} receiveGate={plant.current.receive_gate} dispatchGate={plant.current.dispatch_gate} bottleneck={cur.bottleneck} />
        </Appear>
        <Appear className="block" delay={0.1}>
          <FlowPlan plant={plant} positions={alt.positions} legs={m.legs} title={alt.name} total={m.glass_m} receiveGate={alt.receive_gate} dispatchGate={alt.dispatch_gate} bottleneck={m.bottleneck} />
        </Appear>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Appear className="block">
          <LeadChart before={cur} after={m} />
        </Appear>
        <Appear className="block" delay={0.1}>
          <h3>Cambios de operarios</h3>
          <p className="small" style={{ margin: '6px 0 14px' }}>
            Mismo equipo, mejor repartido: {plant.params.floor_ops} personas en planta. Nuevo cuello de botella: {plant.stations.find((s) => s.id === m.bottleneck)?.name.toLowerCase()} al {fmt(m.bottleneck_util * 100)} %.
          </p>
          <div className="moves">
            {moves.length === 0 && <p className="small" style={{ padding: '12px 0' }}>Esta alternativa no cambia a nadie de puesto.</p>}
            {moves.map((x) => (
              <div key={x.id} className="move">
                <span style={{ fontWeight: 650 }}>{x.name}</span>
                <span className="move-arrow">
                  <Dots n={x.before} />→<Dots n={x.after} />
                </span>
              </div>
            ))}
          </div>
          {m.avoid_hits.length > 0 && <p className="small" style={{ marginTop: 12 }}>Aviso: quedan juntas áreas que no deben estar cerca (por ejemplo por polvo, ruido o calor).</p>}
        </Appear>
      </div>

      <div className="row" style={{ marginTop: 32 }}>
        <Btn onClick={onNext}>Ir al taller de mejora</Btn>
      </div>
    </section>
  )
}

function Dots({ n }) {
  return (
    <span className="dots" aria-label={`${n} operarios`}>
      {n === 0 ? <i data-off="true" /> : Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  )
}
