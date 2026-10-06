'use client'

import { useState } from 'react'
import { ORDEM_TIPOS, TIPOS, type TipoId } from '@/lib/config'

/** Composição por tipo de entrega: barra única empilhada, com legenda e valores. */
export function BarraTipos({ porTipo, escuro = false, legenda = true }: { porTipo: Record<TipoId, number>; escuro?: boolean; legenda?: boolean }) {
  const [ativo, setAtivo] = useState<TipoId | null>(null)
  const total = ORDEM_TIPOS.reduce((s, t) => s + porTipo[t], 0)
  const presentes = ORDEM_TIPOS.filter((t) => porTipo[t] > 0)

  return (
    <div>
      <div className="relative flex h-3 w-full gap-[2px]" role="img" aria-label={presentes.map((t) => `${TIPOS[t].rotulo}: ${porTipo[t]}`).join(', ')}>
        {presentes.map((t, i) => (
          <div
            key={t}
            onMouseEnter={() => setAtivo(t)}
            onMouseLeave={() => setAtivo(null)}
            className={`relative h-full transition-opacity duration-200 ${i === 0 ? 'rounded-l' : ''} ${i === presentes.length - 1 ? 'rounded-r' : ''}`}
            style={{ width: `${(porTipo[t] / total) * 100}%`, background: TIPOS[t].cor, opacity: ativo && ativo !== t ? 0.35 : 1 }}
          >
            {ativo === t && (
              <span className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-ink-deep px-2.5 py-1.5 text-xs text-paper shadow-lg">
                {TIPOS[t].rotulo}: <b className="tabular-nums">{porTipo[t]}</b> ({Math.round((porTipo[t] / total) * 100)}%)
              </span>
            )}
          </div>
        ))}
      </div>
      {legenda && (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {presentes.map((t) => (
            <li
              key={t}
              onMouseEnter={() => setAtivo(t)}
              onMouseLeave={() => setAtivo(null)}
              className={`flex items-center gap-2 text-[13px] ${escuro ? 'text-paper/80' : 'text-ink'}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIPOS[t].cor }} />
              <span className="truncate">{TIPOS[t].rotulo}</span>
              <span className={`ml-auto tabular-nums ${escuro ? 'text-paper' : 'text-ink-deep'} font-medium`}>{porTipo[t]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
