import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api } from './api'
import FlowMark from './brand/FlowMark'
import EngineerChat from './components/EngineerChat'
import useReport from './components/useReport'
import ClickSplash from './fx/ClickSplash'
import Cursor from './fx/Cursor'
import Intro from './fx/Intro'
import Diagnosis from './steps/Diagnosis'
import Plant from './steps/Plant'
import Redesign from './steps/Redesign'
import Story from './steps/Story'
import Workshop from './steps/Workshop'

const STEPS = ['Historia', 'Tu planta', 'Diagnóstico', 'Rediseño', 'Taller de mejora']
const EMPTY_GAME = { missions: [], done: {}, moved: false, bestSaved: 0 }

export default function App() {
  const [intro, setIntro] = useState(true)
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [text, setText] = useState('')
  const [reading, setReading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [game, setGame] = useState(EMPTY_GAME)
  const [chat, setChat] = useState(false)
  const [toast, setToast] = useState(null)
  const [ai, setAi] = useState(null)
  const stage = useRef(null)
  const report = useReport(analysis)

  useEffect(() => {
    api.health().then(setAi).catch(() => setAi({ online: false }))
  }, [])

  const notify = useCallback((msg) => {
    setToast({ msg, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const go = (i) => {
    setStep(i)
    setMaxStep((m) => Math.max(m, i))
    stage.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  const read = async () => {
    setReading(true)
    setError(null)
    try {
      setResult(await api.story(text))
    } catch {
      setError('No pude leer la historia. Revisa que el servidor esté corriendo en el puerto 8000.')
    }
    setReading(false)
  }

  const editAssumption = (key, value) =>
    setResult((r) => ({ ...r, assumptions: r.assumptions.map((a) => (a.key === key ? { ...a, value, source: a.source === 'supuesto' ? 'supuesto' : 'historia' } : a)) }))

  const build = async () => {
    setBuilding(true)
    setError(null)
    try {
      const plant = structuredClone(result.plant)
      for (const a of result.assumptions) {
        const v = Number(a.value)
        if (Number.isFinite(v) && v > 0) plant.params[a.key] = v
      }
      const out = await api.analyze(plant)
      setAnalysis(out)
      setGame(EMPTY_GAME)
      go(1)
    } catch {
      setError('No pude construir la planta. Revisa el servidor.')
    }
    setBuilding(false)
  }

  const onMoved = useCallback(() => setGame((g) => (g.moved ? g : { ...g, moved: true })), [])

  const view = (() => {
    if (step === 0) return <Story text={text} setText={setText} result={result} reading={reading} error={error} onRead={read} onAssumption={editAssumption} onBuild={build} building={building} />
    if (!analysis) return null
    if (step === 1) return <Plant analysis={analysis} notes={result?.notes ?? analysis.plant.current.notes} photo={photo} setPhoto={setPhoto} onNext={() => go(2)} />
    if (step === 2) return <Diagnosis analysis={analysis} report={report} onNext={() => go(3)} />
    if (step === 3) return <Redesign analysis={analysis} onNext={() => go(4)} onMoved={onMoved} />
    return <Workshop analysis={analysis} game={game} setGame={setGame} notify={notify} />
  })()

  return (
    <>
      <Cursor />
      <ClickSplash />
      {intro && <Intro onDone={() => setIntro(false)} />}
      <div className="app">
        <nav className="rail" aria-label="Pasos">
          <button type="button" className="rail-logo" onClick={() => go(0)} aria-label="Volver al inicio">
            <FlowMark size={44} state={step === 0 ? 'tangled' : 'u'} color="#fff" hoverMorph />
          </button>
          <div className="rail-steps">
            <div className="rail-line" aria-hidden="true">
              <motion.div className="rail-line-fill" animate={{ scaleY: maxStep / (STEPS.length - 1) }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            {STEPS.map((name, i) => (
              <button key={name} type="button" className="rail-step" data-state={i === step ? 'active' : i < maxStep || (i <= maxStep && i !== step) ? 'done' : 'todo'} disabled={i > 0 && !analysis} onClick={() => go(i)} aria-label={name} aria-current={i === step ? 'step' : undefined}>
                {i + 1}
                <span className="rail-tip">{name}</span>
              </button>
            ))}
          </div>
          <div className="rail-ai" title={ai?.online ? `${ai.provider}: ${ai.model}` : 'Sin IA: uso textos de respaldo'}>
            <span className="rail-ai-dot" data-on={!!(ai?.online && ai?.ready)} />
            <span>{ai?.online && ai?.ready ? 'IA lista' : 'Sin IA'}</span>
          </div>
          <button type="button" className="rail-chat" onClick={() => setChat(true)} aria-label="Preguntarle al ingeniero">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 4 H19 V15 H10 L5 19 V15 H3 Z" />
            </svg>
          </button>
        </nav>

        <main className="stage" ref={stage}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {view}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <EngineerChat open={chat} onClose={() => setChat(false)} analysis={analysis} />
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
