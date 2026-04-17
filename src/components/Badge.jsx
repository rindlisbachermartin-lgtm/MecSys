const STYLES = {
  pendiente:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  en_proceso: 'bg-primary/15 text-primary border-primary/25',
  finalizado: 'bg-green-500/15 text-green-400 border-green-500/25',
  cancelado:  'bg-error/15 text-error border-error/25',
  borrador:   'bg-outline/15 text-outline border-outline/25',
  aprobado:   'bg-green-500/15 text-green-400 border-green-500/25',
  rechazado:  'bg-error/15 text-error border-error/25',
  pagada:     'bg-green-500/15 text-green-400 border-green-500/25',
  anulada:    'bg-error/15 text-error border-error/25',
  servicio:   'bg-primary/15 text-primary border-primary/25',
  reparacion: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  revision:   'bg-outline/15 text-outline border-outline/25',
  diagnostico:'bg-tertiary/15 text-tertiary border-tertiary/25',
  otro:       'bg-secondary/15 text-secondary border-secondary/25',
}

export function Badge({ estado }) {
  const style = STYLES[estado] || 'bg-outline/15 text-outline border-outline/25'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider font-headline ${style}`}>
      {(estado || '').replace('_', ' ')}
    </span>
  )
}
