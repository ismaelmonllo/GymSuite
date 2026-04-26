import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { color, s } from '../../styles'

// Buscador + filtros de la lista de usuarios. Los botones de toggle de vista y añadir
// van fuera de este componente (son propios de cada dashboard).
function FiltrosUsuarios({
  busqueda,           onBusquedaChange,
  campoBusqueda,      onCampoBusquedaChange,
  filtroActivo,       onFiltroActivoChange,
  filtroPago,         onFiltroPagoChange,
  mostrarFiltroPago = false,
  ordenar,            onOrdenarChange,
  children,
}) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  return (
    <div className="flex flex-col gap-3">

      {/* Fila 1: slot children + buscador + filtros desktop */}
      <div className="flex flex-wrap gap-3 items-center">

        {children}

        {/* Buscador: input + selector de campo */}
        <div className={`flex items-center rounded-lg border ${color.borde} ${color.bgInput} flex-1 min-w-40 focus-within:border-orange-600 transition-colors`}>
          <input
            className={`flex-1 min-w-0 bg-transparent px-4 py-3 ${color.texto} placeholder-neutral-500 focus:outline-none`}
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => onBusquedaChange(e.target.value)}
          />
          <div className={`w-px h-5 border-l ${color.borde}`} />
          <select
            className={`bg-neutral-900 px-3 py-3 ${color.texto} focus:outline-none shrink-0 cursor-pointer rounded-r-lg`}
            value={campoBusqueda}
            onChange={e => onCampoBusquedaChange(e.target.value)}
          >
            <option value="nombre">Nombre</option>
            <option value="apellidos">Apellidos</option>
            <option value="correo">Correo</option>
            <option value="DNI">DNI</option>
          </select>
        </div>

        {/* Filtros: visibles en desktop, colapsados en móvil */}
        <div className="hidden sm:contents">
          <select className={`${s.input} min-w-25`} value={filtroActivo} onChange={e => onFiltroActivoChange(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="baja">Baja</option>
          </select>

          {mostrarFiltroPago && (
            <select className={`${s.input} min-w-30`} value={filtroPago} onChange={e => onFiltroPagoChange(e.target.value)}>
              <option value="todos">Pago: todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendiente">Pendiente</option>
              <option value="no-generado">No generado</option>
            </select>
          )}

          <select className={`${s.input} min-w-30`} value={ordenar} onChange={e => onOrdenarChange(e.target.value)}>
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="fecha_asc">Alta ↑</option>
            <option value="fecha_desc">Alta ↓</option>
          </select>
        </div>

        {/* Botón toggle filtros: solo en móvil */}
        <button
          className={`sm:hidden px-3 py-3 rounded-lg border ${filtrosAbiertos ? `${color.bordeAcento} ${color.textoAcento2}` : `${color.borde} ${color.textoApagado}`} transition-colors`}
          onClick={() => setFiltrosAbiertos(v => !v)}
        >
          <SlidersHorizontal size={18} />
        </button>

      </div>

      {/* Fila 2: filtros colapsables en móvil */}
      {filtrosAbiertos && (
        <div className="sm:hidden flex flex-col gap-3">
          <select className={`${s.input} w-full`} value={filtroActivo} onChange={e => onFiltroActivoChange(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="baja">Baja</option>
          </select>

          {mostrarFiltroPago && (
            <select className={`${s.input} w-full`} value={filtroPago} onChange={e => onFiltroPagoChange(e.target.value)}>
              <option value="todos">Pago: todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendiente">Pendiente</option>
              <option value="no-generado">No generado</option>
            </select>
          )}

          <select className={`${s.input} w-full`} value={ordenar} onChange={e => onOrdenarChange(e.target.value)}>
            <option value="nombre_asc">Nombre A-Z</option>
            <option value="nombre_desc">Nombre Z-A</option>
            <option value="fecha_asc">Alta ↑</option>
            <option value="fecha_desc">Alta ↓</option>
          </select>
        </div>
      )}

    </div>
  )
}

export default FiltrosUsuarios
