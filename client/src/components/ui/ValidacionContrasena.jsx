import { Check, X } from 'lucide-react'

const requisitos = [
  { texto: 'Mínimo 8 caracteres',   cumple: v => v.length >= 8 },
  { texto: 'Al menos una letra',    cumple: v => /[a-zA-Z]/.test(v) },
  { texto: 'Al menos un número',    cumple: v => /[0-9]/.test(v) },
]

// Indicadores de requisitos de contraseña en tiempo real; solo se muestra si hay valor
function ValidacionContrasena({ valor }) {
  if (!valor) return null

  return (
    <div className="flex flex-col gap-1 mt-1">
      {requisitos.map(({ texto, cumple }) => {
        const ok = cumple(valor)
        return (
          <div key={texto} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-neutral-500'}`}>
            {ok ? <Check size={12} /> : <X size={12} />}
            <span>{texto}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ValidacionContrasena
