'use client'

import { useState } from 'react'
import { COR_COMMITS } from '@/lib/config'

type Mes = { chave: string; rotulo: string; commits: number; demandas: number }

const ALTURA = 260

/** Passo "redondo" que dá no máximo 6 marcas no eixo. */
function escala(v: number) {
  const passo = [5, 10, 20, 25, 50, 100, 200, 500].find((p) => Math.ceil(v / p) <= 5) ?? 1000
  const teto = Math.ceil(v / passo) * passo
  return { teto, marcas: Array.from({ length: teto / passo + 1 }, (_, i) => i * passo) }
}

/** Barras de commits por mês, com as demandas concluídas no tooltip. */
export function GraficoMensal({ meses, rotuloDemandas = 'Demandas concluídas' }: { meses: Mes[]; rotuloDemandas?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const totais = meses.map((m) => m.commits)
  const { teto, marcas } = escala(Math.max(...totais, 1))
  const pico = totais.indexOf(Math.max(...totais))

  return (
    <figure className="relative">
      <div className="relative flex gap-3 pl-9">
        {/* grade e eixo y recessivos */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0" style={{ height: ALTURA }}>
          {marcas.map((v) => (
            <div key={v} className="absolute left-0 right-0 flex items-center" style={{ bottom: (v / teto) * ALTURA - 0.5 }}>
              <span className="w-7 text-right text-[11px] tabular-nums text-subtle">{v}</span>
              <span className={`ml-2 h-px flex-1 ${v === 0 ? 'bg-ink/25' : 'bg-line'}`} />
            </div>
          ))}
        </div>

        {meses.map((m, i) => (
          <div
            key={m.chave}
            className="relative flex flex-1 flex-col items-center"
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(i)}
            onBlur={() => setAtivo(null)}
            tabIndex={0}
            aria-label={`${m.rotulo}: ${m.commits} commits, ${m.demandas} demandas`}
          >
            {/* alvo de hover ocupa a coluna inteira, maior que a barra */}
            <div className="relative flex w-full justify-center" style={{ height: ALTURA }}>
              <div className={`absolute inset-x-0 bottom-0 top-0 rounded transition-colors ${ativo === i ? 'bg-ink/[0.04]' : ''}`} />
              {m.commits > 0 && (
                <div
                  className="relative mt-auto w-[62%] max-w-14 origin-bottom rounded-t"
                  style={{
                    height: (m.commits / teto) * ALTURA,
                    background: COR_COMMITS,
                    animation: `crescer 1s var(--ease-flow) ${i * 60}ms both`,
                    opacity: ativo === null || ativo === i ? 1 : 0.45,
                    transition: 'opacity .25s',
                  }}
                />
              )}
              {i === pico && m.commits > 0 && (
                <span className="absolute text-xs font-medium tabular-nums text-ink-deep" style={{ bottom: (m.commits / teto) * ALTURA + 6 }}>
                  {m.commits}
                </span>
              )}
            </div>
            <span className="mt-3 text-xs uppercase tracking-[0.12em] text-subtle">{m.rotulo}</span>

            {ativo === i && (
              <div
                className="pointer-events-none absolute z-20 w-48 -translate-x-1/2 rounded-md bg-ink-deep p-3.5 text-paper shadow-xl"
                style={{ bottom: Math.min((m.commits / teto) * ALTURA + 40, ALTURA), left: '50%' }}
              >
                <p className="eyebrow text-signal-light">{m.rotulo} · {m.chave.slice(0, 4)}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-paper/75">Commits</dt><dd className="tabular-nums font-medium">{m.commits}</dd></div>
                  <div className="flex justify-between"><dt className="text-paper/75">{rotuloDemandas}</dt><dd className="tabular-nums font-medium">{m.demandas}</dd></div>
                </dl>
              </div>
            )}
          </div>
        ))}
      </div>
      <figcaption className="sr-only">Commits por mês</figcaption>
    </figure>
  )
}
