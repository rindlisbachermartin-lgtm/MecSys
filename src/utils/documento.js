export function generarHTMLDocumento(p, items = [], tipo = 'presupuesto') {
  const tallerNombre    = localStorage.getItem('taller_nombre')    || 'Mi Taller'
  const tallerDireccion = localStorage.getItem('taller_direccion') || ''
  const tallerTel       = localStorage.getItem('taller_tel')       || ''
  const tallerEmail     = localStorage.getItem('taller_email')     || ''
  const tallerLogo      = localStorage.getItem('taller_logo') || window.location.origin + '/img/default-taller-dark.svg'

  const totalRep = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio_unitario || 0), 0)
  const mdo      = p.mano_de_obra || 0
  const subtotal = totalRep + mdo
  const ivaAmt   = p.incluye_iva ? subtotal * 0.21 : 0
  const totalGen = subtotal + ivaAmt

  const fecha    = p.created_at ? new Date(p.created_at) : new Date()
  const fechaStr = fecha.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })

  const clienteNombre = [p.clientes?.apellido, p.clientes?.nombre].filter(Boolean).join(' ').toUpperCase() || '—'

  const esFact  = tipo === 'factura'
  const titulo  = esFact ? `FACTURA — TIPO ${p.tipo || 'B'}` : 'PRESUPUESTO - ESTIMACION REPARACION'
  const numLabel = esFact ? 'N° Factura' : 'N° Presupuesto'
  const numVal   = p.numero_factura || ''

  function fmtARS(n) {
    return '$ ' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
  }

  const allItems = [...items]
  if (mdo > 0) {
    allItems.push({
      descripcion: 'MANO DE OBRA' + (p.notas ? ' (' + p.notas.substring(0, 80) + ')' : ''),
      cantidad: 1,
      precio_unitario: mdo,
    })
  }

  const MIN_ROWS = 15
  const itemRows = allItems.map(it => `
    <tr>
      <td style="border:1px solid #000;padding:5px 8px;text-align:center">${(it.descripcion || '').toUpperCase()}</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:center">${it.cantidad}</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:right">${fmtARS(it.precio_unitario)}</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:right;font-weight:bold">${fmtARS((it.cantidad||0)*(it.precio_unitario||0))}</td>
    </tr>`).join('')

  const emptyCount = Math.max(0, MIN_ROWS - allItems.length)
  const emptyRows  = Array(emptyCount).fill(`
    <tr>
      <td style="border:1px solid #000;padding:5px 8px">&nbsp;</td>
      <td style="border:1px solid #000;padding:5px 8px"></td>
      <td style="border:1px solid #000;padding:5px 8px"></td>
      <td style="border:1px solid #000;padding:5px 8px"></td>
    </tr>`).join('')

  const validez = p.validez_dias || 15

  return `
<div style="width:760px;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;padding:32px 40px;box-sizing:border-box;position:relative;">
  <div style="position:relative;z-index:1">
    <div style="text-align:center;font-size:15px;font-weight:bold;margin-bottom:14px;text-decoration:underline;letter-spacing:.5px">${titulo}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <td style="width:50%;border:1px solid #000;padding:4px 8px">${numLabel}: ${numVal}</td>
        <td style="width:50%;border:1px solid #000;padding:4px 8px">Fecha Creación:&nbsp;&nbsp;<strong>${fechaStr}</strong></td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <td style="width:46%;border:1px solid #000;padding:10px 12px;vertical-align:top">
          <div style="font-size:16px;font-weight:900;letter-spacing:.3px;line-height:1.1;margin-bottom:6px">${tallerNombre.toUpperCase()}</div>
          ${tallerDireccion ? `<div style="margin-bottom:2px">${tallerDireccion}</div>` : ''}
          ${tallerTel ? `<div style="margin-bottom:2px">Tel: ${tallerTel}</div>` : ''}
          ${tallerEmail ? `<div>Mail: ${tallerEmail}</div>` : ''}
        </td>
        <td style="width:54%;border:1px solid #000;padding:0;vertical-align:top">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:4px 6px;width:90px;font-weight:bold">Cliente:</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px;font-weight:bold">${clienteNombre}</td>
            </tr>
            <tr>
              <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:4px 6px;font-weight:bold">Teléfono:</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px">${p.clientes?.telefono || ''}</td>
            </tr>
            <tr>
              <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:4px 6px;font-weight:bold">Email:</td>
              <td style="border-bottom:1px solid #000;padding:4px 6px">${p.clientes?.email || ''}</td>
            </tr>
            <tr>
              <td style="border-right:1px solid #000;padding:4px 6px;font-weight:bold">Observación:</td>
              <td style="padding:4px 6px">${esFact ? (p.notas || '') : ''}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;width:110px;font-weight:bold">MARCA:</td>
        <td style="border:1px solid #000;padding:4px 8px">${p.vehiculos?.marca || ''}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;font-weight:bold">MODELO:</td>
        <td style="border:1px solid #000;padding:4px 8px">${(p.vehiculos?.modelo || '') + (p.vehiculos?.anio ? ' — ' + p.vehiculos.anio : '')}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;font-weight:bold">MATRICULA:</td>
        <td style="border:1px solid #000;padding:4px 8px">${p.vehiculos?.patente || ''}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;font-weight:bold">OBSERVACION:</td>
        <td style="border:1px solid #000;padding:4px 8px">${!esFact ? (p.notas || '') : ''}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead>
        <tr>
          <th style="border:1px solid #000;padding:6px 8px;text-align:center">REFERENCIA / DETALLE PIEZAS</th>
          <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:70px">CANTIDAD</th>
          <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:120px">VALOR UNITARIO</th>
          <th style="border:1px solid #000;padding:6px 8px;text-align:center;width:120px">TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemRows}${emptyRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="border:1px solid #000;padding:8px 10px;font-size:10px;line-height:1.8">
          ${esFact ? 'Factura emitida conforme a la legislación vigente.' : 'Presupuesto o estimación, bajo reserva del desmontaje.'}<br>
          Los valores son expresados en pesos argentinos<br>
          Validez ${esFact ? 'factura' : 'presupuesto'} ${validez} días.
        </td>
        <td style="border:1px solid #000;padding:8px;text-align:center;font-weight:bold;width:80px;vertical-align:middle">TOTAL</td>
        <td style="border:1px solid #000;padding:8px 10px;text-align:right;font-weight:bold;width:130px;vertical-align:middle;font-size:13px">${fmtARS(totalGen)}</td>
      </tr>
    </table>
  </div>
</div>`
}

export function imprimirDocumento(p, items, tipo = 'presupuesto') {
  const htmlDoc = generarHTMLDocumento(p, items, tipo)
  const titulo  = tipo === 'factura' ? 'Factura' : 'Presupuesto'
  const win = window.open('', '_blank', 'width=920,height=780')
  if (!win) {
    alert('El navegador bloqueó la ventana emergente.\nPermití las ventanas emergentes para este sitio.')
    return
  }
  win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#e8e8e8;font-family:Arial,sans-serif;}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#1a1a1a;color:#fff;padding:10px 24px;display:flex;gap:12px;align-items:center;z-index:999;}
  .toolbar button{padding:8px 20px;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:700;}
  .btn-print{background:#22c55e;color:#fff;}
  .btn-close{background:#555;color:#fff;}
  .doc-wrap{margin:70px auto 40px;width:760px;background:#fff;box-shadow:0 4px 28px rgba(0,0,0,.25);}
  @media print{.toolbar{display:none!important;}body{background:#fff;}.doc-wrap{margin:0;box-shadow:none;width:auto;}@page{size:A4;margin:12mm 15mm;}}
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
</div>
<div class="doc-wrap">${htmlDoc}</div>
</body></html>`)
  win.document.close()
}
