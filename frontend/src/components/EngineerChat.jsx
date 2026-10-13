import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { stream } from '../api'

const suggestions = (a) => [
  a ? `¿Por qué ${a.plant.stations.find((s) => s.id === a.current.bottleneck)?.name.toLowerCase()} es el cuello de botella?` : '¿Qué es un cuello de botella?',
  '¿Qué hago esta semana sin gastar nada?',
  '¿Qué datos reales debería medir?',
]

/* Panel lateral para preguntarle al ingeniero de procesos. */
export default function EngineerChat({ open, onClose, analysis }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef(null)
  const ctl = useRef(null)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [msgs])
  useEffect(() => () => ctl.current?.abort(), [])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  const send = async (text) => {
    const q = text.trim()
    if (!q || busy) return
    const history = [...msgs, { role: 'user', content: q }]
    setMsgs([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    ctl.current = new AbortController()
    try {
      await stream('/api/chat', { messages: history, analysis }, (t) => setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x))), ctl.current.signal)
    } catch (e) {
      if (e.name !== 'AbortError') setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: 'No pude conectarme con el servidor.' } : x)))
    }
    setBusy(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="chat" role="dialog" aria-label="Pregúntale al ingeniero" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="chat-head">
              <div>
                <h3>El ingeniero</h3>
                <span className="small">Responde con los datos de tu planta</span>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="2.4" />
                </svg>
              </button>
            </div>
            <div className="chat-log" ref={log}>
              {msgs.length === 0 && (
                <div className="stack">
                  <p className="small">{analysis ? 'Pregúntame lo que quieras sobre tu planta.' : 'Primero cuéntame tu historia y construye la planta; luego te respondo con sus datos.'}</p>
                  <div className="chat-suggest">
                    {suggestions(analysis).map((s) => (
                      <button key={s} type="button" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`msg msg--${m.role === 'user' ? 'user' : 'ai'}`}>
                  {m.content || <span className="caret" />}
                </div>
              ))}
            </div>
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta" aria-label="Pregunta" autoFocus />
              <button type="submit" className="btn" disabled={busy || !input.trim()}>
                Enviar
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
