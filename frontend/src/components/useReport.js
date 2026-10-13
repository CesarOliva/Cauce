import { useCallback, useEffect, useRef, useState } from 'react'
import { stream } from '../api'

/* Informe del ingeniero en streaming. Vive en App para que no se pierda
   ni se regenere al cambiar de paso. */
export default function useReport(analysis) {
  const [text, setText] = useState('')
  const [state, setState] = useState('idle') // idle | running | done | error
  const ctl = useRef(null)

  const run = useCallback(() => {
    if (!analysis) return
    ctl.current?.abort()
    const c = new AbortController()
    ctl.current = c
    setText('')
    setState('running')
    stream('/api/report', { analysis }, (t) => setText((p) => p + t), c.signal)
      .then(() => setState('done'))
      .catch((e) => {
        if (e.name !== 'AbortError') setState('error')
      })
  }, [analysis])

  useEffect(() => () => ctl.current?.abort(), [])
  // Un análisis nuevo invalida el informe anterior.
  useEffect(() => {
    ctl.current?.abort()
    setText('')
    setState('idle')
  }, [analysis])

  return { text, state, run }
}
