import { useCallback, useEffect, useRef, useState } from 'react'
import { stream } from '../api'

/* Informe del ingeniero en streaming. Vive en App para que no se pierda al
   cambiar de paso; `version` cambia cuando cambia lo que describe. */
export default function useReport(context, version) {
  const [text, setText] = useState('')
  const [state, setState] = useState('idle') // idle | running | done | error
  const ctl = useRef(null)
  const ctx = useRef(context)
  useEffect(() => {
    ctx.current = context
  }, [context])

  const run = useCallback(() => {
    if (!ctx.current?.plant) return
    ctl.current?.abort()
    const c = new AbortController()
    ctl.current = c
    setText('')
    setState('running')
    stream('/api/report', ctx.current, (t) => setText((p) => p + t), c.signal)
      .then(() => setState('done'))
      .catch((e) => {
        if (e.name !== 'AbortError') setState('error')
      })
  }, [])

  useEffect(() => () => ctl.current?.abort(), [])
  // Si cambia lo que describe, el informe anterior ya no vale.
  useEffect(() => {
    ctl.current?.abort()
    setText('')
    setState('idle')
  }, [version])

  return { text, state, run }
}
