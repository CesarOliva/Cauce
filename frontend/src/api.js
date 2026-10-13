async function post(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} respondió ${r.status}`)
  return r.json()
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json()),
  story: (text) => post('/api/story', { text }),
  analyze: (plant) => post('/api/analyze', { plant }),
  evaluate: (plant, positions, receive_gate, dispatch_gate) => post('/api/evaluate', { plant, positions, receive_gate, dispatch_gate }),
  missions: (analysis) => post('/api/missions', { analysis }),
}

/* Lee una respuesta en streaming y entrega cada fragmento de texto. */
export async function stream(path, body, onToken, signal) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!r.ok || !r.body) throw new Error(`${path} respondió ${r.status}`)
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    onToken(dec.decode(value, { stream: true }))
  }
}

/* Recorrido diario del material para un layout, igual que el motor en Python. */
export function glassMeters(plant, positions) {
  const p = plant.params
  let total = 0
  for (const e of plant.routing) {
    const a = positions[e.from]
    const b = positions[e.to]
    if (!a || !b) continue
    const trips = (p.demand * e.frac * e.per) / (e.batch || p.batch)
    total += trips * (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]))
  }
  return total
}

export const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
