export function fmtMoney(n) {
  return '$ ' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function toLocalDatetime(d) {
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

export function formatWAPhone(phone) {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('0')) d = d.slice(1)
  if (d.startsWith('15')) d = d.slice(2)
  if (d.length <= 10) d = '549' + d
  else if (d.startsWith('9')) d = '54' + d
  else if (!d.startsWith('54')) d = '54' + d
  return d
}

export function fmtNombre(c) {
  return [c?.apellido, c?.nombre].filter(Boolean).join(', ') || '—'
}

export function weekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

export const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
export const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
export const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
export const DIAS_FULL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
