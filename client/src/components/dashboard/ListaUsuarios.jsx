import { User, Ban, RotateCcw, CheckCircle, CalendarDays, Receipt } from 'lucide-react'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'
import { color, s } from '../../styles'
import { formatearFecha } from '../../utils'

// Lista de usuarios: cards en móvil + tabla en desktop
function ListaUsuarios({
  lista,
  cargando,
  esClientes,
  ultimoPago = {},
  mesActual,
  procesando,
  confirmandoPago,
  onVerPerfil,
  onVerPagos,
  onCambiarCuota,
  onBajaAlta,
  onConfirmarPago,
}) {

  // Badges + botón confirmar pago para la columna/sección de último pago
  const renderPago = (u) => {
    if (!esClientes) return null
    const pago = ultimoPago[u._id]
    if (pago?.mes >= mesActual) {
      return (
        <>
          <Badge variante={pago.pendiente ? 'pendiente' : 'confirmado'}>
            {pago.pendiente ? 'Pendiente' : 'Confirmado'}
          </Badge>
          {pago.pendiente && (
            <IconButton
              icono={CheckCircle}
              titulo="Confirmar pago"
              onClick={() => onConfirmarPago(u)}
              procesando={confirmandoPago === u._id}
              colorHover="hover:text-green-400"
              size={16}
            />
          )}
        </>
      )
    }
    return <Badge variante="no-generado">No generado</Badge>
  }

  // Acciones comunes de cada fila/card
  const renderAcciones = (u) => (
    <>
      <IconButton icono={User} titulo="Ver perfil" onClick={() => onVerPerfil(u)} />
      {esClientes && <IconButton icono={Receipt} titulo="Ver pagos" onClick={() => onVerPagos(u)} />}
      {esClientes && <IconButton icono={CalendarDays} titulo="Cambiar cuota" onClick={() => onCambiarCuota(u)} />}
      <IconButton
        icono={u.activo ? Ban : RotateCcw}
        titulo={u.activo ? 'Dar de baja' : 'Dar de alta'}
        onClick={() => onBajaAlta(u)}
        procesando={procesando === u._id}
        colorHover={u.activo ? 'hover:text-red-400' : 'hover:text-green-400'}
      />
    </>
  )

  const mensajeVacio = (
    <p className={`text-center py-8 text-sm ${color.textoApagado}`}>
      {cargando ? 'Cargando...' : 'No se encontraron resultados.'}
    </p>
  )

  return (
    <>
      {/* Móvil: lista de cards */}
      <div className="sm:hidden flex flex-col gap-3">
        {cargando || lista.length === 0 ? mensajeVacio : lista.map(u => (
          <div key={u._id} className={`${s.card} rounded-xl p-4 flex flex-col gap-3`}>

            {/* Nombre + correo + acciones */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className={`${color.texto} font-medium truncate`}>{u.nombre} {u.apellidos}</span>
                <span className={`${color.textoApagado} text-xs truncate`}>{u.correo}</span>
              </div>
              <div className="flex gap-3 items-center shrink-0">
                {renderAcciones(u)}
              </div>
            </div>

            {/* Teléfono + fecha alta */}
            <div className={`flex gap-4 text-xs ${color.textoApagado}`}>
              {u.telefono && <span>{u.telefono}</span>}
              <span>Alta: {formatearFecha(u.fecha_alta)}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variante={u.activo ? 'activo' : 'baja'}>{u.activo ? 'Activo' : 'Baja'}</Badge>
              {esClientes && u.nivel && (
                <Badge variante={u.nivel}>{u.nivel.charAt(0).toUpperCase() + u.nivel.slice(1)}</Badge>
              )}
              {!esClientes && (
                <Badge variante={u.rol === 'admin' ? 'admin' : 'entrenador'}>
                  {u.rol === 'admin' ? 'Admin' : 'Entrenador'}
                </Badge>
              )}
              {esClientes && <div className="flex items-center gap-2">{renderPago(u)}</div>}
            </div>

          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className={`${s.card} rounded-xl overflow-hidden hidden sm:block`}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${color.bordeHeader} text-left`}>
              <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Nombre</th>
              <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Correo</th>
              <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Teléfono</th>
              <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Alta</th>
              <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Estado</th>
              {esClientes && <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Nivel</th>}
              {esClientes && <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Último pago</th>}
              {!esClientes && <th className={`px-4 py-3 text-sm font-medium ${color.textoApagado}`}>Tipo</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={esClientes ? 8 : 7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
                  Cargando...
                </td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={esClientes ? 8 : 7} className={`px-4 py-8 text-center text-sm ${color.textoApagado}`}>
                  No se encontraron resultados.
                </td>
              </tr>
            ) : lista.map(u => (
              <tr key={u._id} className={`border-b ${color.bordeHeader} last:border-0 ${color.bgHover} transition-colors`}>
                <td className={`px-4 py-3 text-sm font-medium ${color.texto}`}>{u.nombre} {u.apellidos}</td>
                <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{u.correo}</td>
                <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{u.telefono ?? '—'}</td>
                <td className={`px-4 py-3 text-sm ${color.textoApagado}`}>{formatearFecha(u.fecha_alta)}</td>
                <td className="px-4 py-3">
                  <Badge variante={u.activo ? 'activo' : 'baja'}>{u.activo ? 'Activo' : 'Baja'}</Badge>
                </td>
                {esClientes && (
                  <td className="px-4 py-3">
                    {u.nivel
                      ? <Badge variante={u.nivel}>{u.nivel.charAt(0).toUpperCase() + u.nivel.slice(1)}</Badge>
                      : '—'}
                  </td>
                )}
                {esClientes && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">{renderPago(u)}</div>
                  </td>
                )}
                {!esClientes && (
                  <td className="px-4 py-3">
                    <Badge variante={u.rol === 'admin' ? 'admin' : 'entrenador'}>
                      {u.rol === 'admin' ? 'Admin' : 'Entrenador'}
                    </Badge>
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex gap-3 items-center justify-end">{renderAcciones(u)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ListaUsuarios
