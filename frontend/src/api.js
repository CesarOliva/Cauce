async function post(path, body, signal) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!r.ok) throw new Error(`${path} respondió ${r.status}`)
  return r.json()
}

const get = (path) =>
  fetch(path).then((r) => {
    if (!r.ok) throw new Error(`${path} respondió ${r.status}`)
    return r.json()
  })

export const api = {
  health: () => get('/api/health'),
  catalog: () => get('/api/catalog'),
  example: () => get('/api/example'),
  story: (text) => post('/api/story', { text }),
  routes: (plant, positions, signal) => post('/api/routes', { plant, positions }, signal),
  evaluate: (plant, positions, rebalance = true, signal) => post('/api/evaluate', { plant, positions, rebalance }, signal),
  analyze: (plant) => post('/api/analyze', { plant }),
  missions: (context) => post('/api/missions', context),
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

export const fmt = (n, d = 0) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }))

export const pct = (a, b) => (a ? Math.round(((b - a) / a) * 100) : 0)
