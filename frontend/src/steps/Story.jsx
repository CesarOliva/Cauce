import { useEffect, useRef, useState } from 'react'
import Btn from '../fx/Btn'
import { Appear, RevealTitle } from '../fx/Reveal'

export const EXAMPLE_STORY = `Mi padre tenía un taller de vidrios para sala y comedor. Era una transformadora de vidrio: recibía una lámina y tenía una mesa donde cortaban, una pulidora, sandblasting, una lavadora, la oficina y un pulpo para mover las láminas. Trabajaban unas 12 personas y salían unas 80 piezas al día en 3 camiones. Todo estaba en una bodega con portones sobre la calle. Ahí mismo se hacían las ventas, los pagos y la nómina.

No tengo los detalles porque fue hace mucho tiempo. Lo que sí recuerdo es que lo terminado se amontonaba en despacho y que uno de los portones siempre estaba tapado con retazos.`

/* Dictado por voz con la API del navegador (si existe). */
function useDictation(onText) {
  const rec = useRef(null)
  const [on, setOn] = useState(false)
  const Api = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

  const toggle = () => {
    if (on) {
      rec.current?.stop()
      return
    }
    const r = new Api()
    r.lang = 'es-CO'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim())
    }
    r.onend = () => setOn(false)
    r.onerror = () => setOn(false)
    rec.current = r
    r.start()
    setOn(true)
  }
  useEffect(() => () => rec.current?.abort(), [])
  return { on, toggle, supported: !!Api }
}

export default function Story({ text, setText, result, reading, error, onRead, onAssumption, onBuild, building }) {
  const dict = useDictation((t) => setText((prev) => (prev ? prev + ' ' : '') + t))
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">01 / Historia</span>
        <RevealTitle text="Cuéntame cómo era tu planta." />
        <p className="lede">
          No necesitas planos ni cifras. Cuenta la historia: qué máquinas había, cuánta gente trabajaba, cómo salía el producto. Lo que no sepas lo supongo yo, y lo dejo escrito para que lo corrijas.
        </p>
      </header>

      <div className="split">
        <Appear className="stack">
          <div className="panel">
            <div className="story-sheet" style={{ border: 0 }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Mi papá tenía un taller de…" aria-label="Historia de tu planta" />
            </div>
            <div className="story-bar">
              <div className="row">
                {dict.supported && (
                  <button type="button" className="mic" data-on={dict.on} onClick={dict.toggle} aria-pressed={dict.on}>
                    <span className="mic-bars" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    {dict.on ? 'Escuchando' : 'Dictar'}
                  </button>
                )}
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setText(EXAMPLE_STORY)}>
                  Usar el taller de vidrio
                </button>
              </div>
              <span className="small num">{words} palabras</span>
            </div>
          </div>
          <div className="row">
            <Btn onClick={onRead} disabled={reading || words < 8}>
              {reading ? 'Leyendo…' : 'Leer mi historia'}
            </Btn>
            {error && <span className="small">{error}</span>}
          </div>
        </Appear>

        <div className="stack">
          {!result && !reading && (
            <div className="block">
              <h3>Qué pasa después</h3>
              <ul className="note-list" style={{ marginTop: 14 }}>
                <li>Leo la historia y marco qué máquinas mencionaste y cuáles supongo.</li>
                <li>Armo tu planta en 3D con medidas y recorridos de ejemplo.</li>
                <li>Hago el diagnóstico de un ingeniero de procesos y propongo un rediseño.</li>
              </ul>
            </div>
          )}
          {reading && (
            <div className="block reading">
              <div className="dots" aria-hidden="true">
                <i />
                <i data-off="true" />
                <i data-off="true" />
              </div>
              <p>Leyendo tu historia…</p>
            </div>
          )}
          {result && !reading && (
            <Appear className="stack">
              <div className="block">
                <div className="chart-head" style={{ marginBottom: 14 }}>
                  <h3>Lo que entendí</h3>
                  <span className="small">{result.source === 'ia' ? 'Lectura con IA' : 'Lectura por reglas (la IA no respondió)'}</span>
                </div>
                <div className="chips">
                  {result.stations.map((s) => (
                    <span key={s.id} className="chip" data-kind={s.mentioned ? 'historia' : 'supuesto'} title={s.mentioned ? 'Lo mencionaste' : 'Lo supuse'}>
                      <i />
                      {s.name}
                    </span>
                  ))}
                </div>
                <p className="small" style={{ marginTop: 12 }}>
                  Sólido: lo mencionaste. Punteado: lo supuse porque un taller así lo suele tener.
                </p>
                {result.notes.length > 0 && (
                  <ul className="note-list" style={{ marginTop: 16 }}>
                    {result.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="block">
                <h3>Supuestos que puedes cambiar</h3>
                <p className="small" style={{ margin: '6px 0 14px' }}>
                  Datos de tu historia y supuestos míos. Cámbialos con lo que recuerdes.
                </p>
                <div className="assume">
                  {result.assumptions.map((a) => (
                    <div key={a.key} className="assume-row" data-src={a.source}>
                      <div>
                        <label htmlFor={`a-${a.key}`}>{a.label}</label>
                        <span className="small">
                          {a.why} ({a.unit})
                        </span>
                      </div>
                      <input id={`a-${a.key}`} type="number" step="any" min="0" value={a.value} onChange={(e) => onAssumption(a.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="row">
                <Btn onClick={onBuild} disabled={building}>
                  {building ? 'Construyendo…' : 'Construir mi planta'}
                </Btn>
              </div>
            </Appear>
          )}
        </div>
      </div>
    </section>
  )
}
