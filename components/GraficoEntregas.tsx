'use client'

import { useState } from 'react'
import { ORDEM_TIPOS, TIPOS, type TipoId } from '@/lib/config'

type Mes = { chave: string; rotulo: string; valores: Record<TipoId, number>; altoImpacto: number; commits: number }

const ALTURA = 280

/** Passo "redondo" que dá no máximo 6 marcas no eixo. */
function escala(v: number) {
  const passo = [2, 5, 10, 20, 25, 50].find((p) => Math.ceil(v / p) <= 5) ?? 100
  const teto = Math.max(passo, Math.ceil(v / passo) * passo)
  return { teto, marcas: Array.from({ length: teto / passo + 1 }, (_, i) => i * passo) }
}

/** Demandas concluídas em cada mês, empilhadas por tipo de entrega (base = Novo sistema). */
export function GraficoEntregas({ meses }: { meses: Mes[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [destaque, setDestaque] = useState<TipoId | null>(null)
  const totais = meses.map((m) => ORDEM_TIPOS.reduce((s, t) => s + m.valores[t], 0))
  const { teto, marcas } = escala(Math.max(...totais, 1))
  const pico = totais.indexOf(Math.max(...totais))
  const presentes = ORDEM_TIPOS.filter((t) => meses.some((m) => m.valores[t]))

  return (
    <figure className="relative">
      <ul className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2">
        {presentes.map((t) => (
          <li
            key={t}
            onMouseEnter={() => setDestaque(t)}
            onMouseLeave={() => setDestaque(null)}
            className={`flex cursor-default items-center gap-2 text-sm transition-opacity ${destaque && destaque !== t ? 'opacity-40' : ''}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIPOS[t].cor }} />
            {TIPOS[t].rotulo}
          </li>
        ))}
      </ul>

      <div className="relative flex gap-2 pl-8 sm:gap-3">
        <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: ALTURA }}>
          {marcas.map((v) => (
            <div key={v} className="absolute left-0 right-0 flex items-center" style={{ bottom: (v / teto) * ALTURA - 0.5 }}>
              <span className="w-6 text-right text-[11px] tabular-nums text-subtle">{v}</span>
              <span className={`ml-2 h-px flex-1 ${v === 0 ? 'bg-ink/25' : 'bg-line'}`} />
            </div>
          ))}
        </div>

        {meses.map((m, i) => {
          const total = totais[i]
          const empilhados = presentes.filter((t) => m.valores[t])
          return (
            <div
              key={m.chave}
              className="relative flex flex-1 flex-col items-center outline-none"
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              tabIndex={0}
              aria-label={`${m.rotulo}: ${total} demandas concluídas, ${empilhados.map((t) => `${m.valores[t]} ${TIPOS[t].rotulo}`).join(', ')}`}
            >
              <div className="relative flex w-full justify-center" style={{ height: ALTURA }}>
                <div className={`absolute inset-0 rounded transition-colors ${ativo === i ? 'bg-ink/[0.04]' : ''}`} />
                <div className="relative mt-auto flex w-[64%] max-w-16 origin-bottom flex-col-reverse" style={{ animation: `crescer 1s var(--ease-flow) ${i * 60}ms both` }}>
                  {empilhados.map((t, idx) => (
                    <div
                      key={t}
                      className={idx === empilhados.length - 1 ? 'rounded-t' : ''}
                      style={{
                        height: (m.valores[t] / teto) * ALTURA,
                        background: TIPOS[t].cor,
                        // espaçador de 2px entre segmentos
                        marginBottom: idx > 0 ? 2 : 0,
                        opacity: (ativo === null || ativo === i) && (!destaque || destaque === t) ? 1 : 0.3,
                        transition: 'opacity .25s',
                      }}
                    />
                  ))}
                </div>
                {i === pico && (
                  <span className="absolute text-xs font-medium tabular-nums text-ink-deep" style={{ bottom: (total / teto) * ALTURA + 6 }}>
                    {total}
                  </span>
                )}
              </div>
              <span className="mt-3 text-xs uppercase tracking-[0.12em] text-subtle">{m.rotulo}</span>

              {ativo === i && (
                <div
                  className="pointer-events-none absolute z-20 w-56 rounded-md bg-ink-deep p-4 text-paper shadow-xl"
                  style={{
                    bottom: Math.min((total / teto) * ALTURA + 40, ALTURA),
                    // nas pontas, o tooltip abre para dentro do gráfico
                    ...(i < 2 ? { left: 0 } : i > meses.length - 3 ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
                  }}
                >
                  <p className="eyebrow text-signal-light">{m.rotulo} · {m.chave.slice(0, 4)}</p>
                  <p className="mt-2 text-2xl font-medium tabular-nums">
                    {total} <span className="text-sm font-normal text-paper/60">demanda{total !== 1 ? 's' : ''} concluída{total !== 1 ? 's' : ''}</span>
                  </p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {empilhados.map((t) => (
                      <div key={t} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-paper/75">
                          <span className="h-2 w-2 rounded-full" style={{ background: TIPOS[t].cor }} />
                          {TIPOS[t].rotulo}
                        </dt>
                        <dd className="tabular-nums">{m.valores[t]}</dd>
                      </div>
                    ))}
                    <div className="hair-dark my-2" />
                    <div className="flex justify-between"><dt className="text-paper/75">Alto impacto</dt><dd className="tabular-nums">{m.altoImpacto}</dd></div>
                    <div className="flex justify-between"><dt className="text-paper/75">Commits</dt><dd className="tabular-nums">{m.commits}</dd></div>
                  </dl>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <figcaption className="sr-only">Demandas concluídas por mês e por tipo de entrega</figcaption>
    </figure>
  )
}
