import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Btn from '../fx/Btn'
import { Appear, RevealTitle } from '../fx/Reveal'
import ReportDoc from '../report/ReportDoc'

/* Paso 5: el reporte. Se guarda como PDF con el diálogo de imprimir del navegador. */
export default function Report({ plant, analysis, chosen, notes, report, catalog, onPrinted }) {
  useEffect(() => {
    if (report.state === 'idle') report.run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.state])

  useEffect(() => {
    const after = () => onPrinted()
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [onPrinted])

  const doc = <ReportDoc plant={plant} analysis={analysis} chosen={chosen} notes={notes} reportText={report.state === 'running' ? '' : report.text} catalog={catalog} />

  return (
    <section className="step">
      <header className="step-head">
        <span className="step-index">05 / Reporte</span>
        <RevealTitle text="Tu reporte, listo para compartir." />
        <p className="lede">Antes y después, qué se mueve y por qué. Pulsa «Descargar PDF» y en el diálogo elige «Guardar como PDF».</p>
      </header>

      <div className="row" style={{ marginBottom: 24 }}>
        <Btn onClick={() => window.print()} disabled={report.state === 'running'}>
          {report.state === 'running' ? 'El ingeniero está escribiendo…' : 'Descargar PDF'}
        </Btn>
        {report.state === 'running' ? (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
            Descargar sin esperar las conclusiones
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--small" onClick={report.run}>
            Reescribir conclusiones
          </button>
        )}
        {!chosen && <span className="small">Aún no elegiste un rediseño: el reporte muestra solo la planta de hoy.</span>}
      </div>

      <Appear className="doc-preview">{doc}</Appear>
      {createPortal(<div className="print-root">{doc}</div>, document.body)}
    </section>
  )
}
