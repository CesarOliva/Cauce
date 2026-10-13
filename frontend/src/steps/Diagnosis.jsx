import { useEffect } from 'react'
import { fmt } from '../api'
import FlowPlan from '../charts/FlowPlan'
import LeadChart from '../charts/LeadChart'
import LoadChart from '../charts/LoadChart'
import RelChart from '../charts/RelChart'
import Btn from '../fx/Btn'
import { Appear, CountUp, RevealTitle, Tilt } from '../fx/Reveal'

function Kpi({ value, decimals = 0, unit, label, sub }) {
  return (
    <Tilt className="kpi" max={4}>
      <div className="kpi-value num">
        <CountUp value={value} decimals={decimals} />
        <small>{unit}</small>
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </Tilt>
  )
}

export default function Diagnosis({ analysis, report, onNext }) {
  const cur = analysis.current
  const plant = analysis.plant
  const names = Object.fromEntries(plant.stations.map((s) => [s.id, s.name]))

  // El informe se pide una sola vez, al llegar a este paso.
  useEffect(() => {
    if (report.state === 'idle') report.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.state])

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">03 / Diagnóstico</span>
        <RevealTitle text={`El cuello de botella es ${names[cur.bottleneck].toLowerCase()}.`} />
        <p className="lede">
          Trabaja al {fmt(cur.bottleneck_util * 100)} % de lo que puede hacer, y todo lo que viene después espera por ella. Estos son los números del taller de hoy.
        </p>
      </header>

      <Appear className="kpis">
        <Kpi value={cur.glass_m} unit="m" label="Camina el material al día" sub={`${fmt(cur.flow_index)} de 100 en orden de flujo`} />
        <Kpi value={cur.capacity} decimals={1} unit="piezas" label="Capacidad al día" sub={`Demanda: ${cur.demand} piezas`} />
        <Kpi value={cur.lead_h} decimals={1} unit="h" label="Tiempo por pieza" sub={`${fmt(cur.lead_parts.proceso)} min son trabajo real`} />
        <Kpi value={cur.loading_min} unit="min" label="Carga de camiones al día" sub={`${plant.params.trucks} rutas`} />
      </Appear>

      <div className="grid-2" style={{ marginTop: 32 }}>
        <Appear className="block">
          <LoadChart stations={cur.stations} bottleneck={cur.bottleneck} />
        </Appear>
        <Appear className="block" delay={0.1}>
          <FlowPlan plant={plant} positions={plant.current.positions} legs={cur.legs} title="Recorrido del material" total={cur.glass_m} receiveGate={plant.current.receive_gate} dispatchGate={plant.current.dispatch_gate} bottleneck={cur.bottleneck} />
        </Appear>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Appear className="block">
          <LeadChart before={cur} />
        </Appear>
        <Appear className="block" delay={0.1}>
          <RelChart relations={analysis.relations} />
        </Appear>
      </div>

      <Appear className="report" style={{ marginTop: 24 }}>
        <div className="chart-head" style={{ marginBottom: 16 }}>
          <h3>El informe del ingeniero</h3>
          <Btn size="small" onClick={report.run} disabled={report.state === 'running'}>
            {report.state === 'running' ? 'Escribiendo…' : 'Escribirlo de nuevo'}
          </Btn>
        </div>
        <p className="report-text" aria-live="polite">
          {report.text}
          {report.state === 'running' && <span className="caret" />}
        </p>
        {report.state === 'error' && <p>No pude escribir el informe. Revisa que el servidor esté corriendo.</p>}
      </Appear>

      <Appear className="block" style={{ marginTop: 24 }}>
        <details className="how">
          <summary>Cómo se calculó</summary>
          <ul>
            <li>Recorrido: distancia en ángulo recto entre estaciones, por los viajes al día de cada lote.</li>
            <li>Carga: minutos de trabajo y de traslado, frente a los minutos útiles del turno ({fmt(plant.params.shift_min * plant.params.efficiency)} por persona).</li>
            <li>Espera en cola: aproximación de Sakasegawa para varios servidores.</li>
            <li>Todos los tiempos, la demanda y las velocidades son supuestos editables del paso 1. Con datos medidos el método es el mismo.</li>
          </ul>
        </details>
      </Appear>

      <div className="row" style={{ marginTop: 32 }}>
        <Btn onClick={onNext}>Ver el rediseño</Btn>
      </div>
    </section>
  )
}
