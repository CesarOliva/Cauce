import { useState } from 'react'

/* Tooltip compartido por los gráficos. `bind(content)` devuelve los
   manejadores para ponerle a cualquier elemento SVG o HTML. */
export function useTip() {
  const [t, setT] = useState(null)
  const bind = (content) => ({
    onMouseMove: (e) => setT({ x: e.clientX, y: e.clientY, content }),
    onMouseLeave: () => setT(null),
  })
  const node = t ? (
    <div className="tip" style={{ left: Math.min(t.x + 14, window.innerWidth - 280), top: t.y + 16 }}>
      {t.content}
    </div>
  ) : null
  return { node, bind }
}
