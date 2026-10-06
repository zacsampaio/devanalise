'use client'

import Link from 'next/link'
import { useState } from 'react'

export type SerieBarra = { id: string; rotulo: string; cor: string }
/** `id` identifica a linha quando o rótulo pode se repetir (padrão: href, depois o rótulo). */
type Linha = { id?: string; rotulo: string; valores: Record<string, number>; href?: string }

/** Barras horizontais (empilhadas quando há mais de uma série), com legenda e tooltip. */
export function BarrasHorizontais({ linhas, series, mostrarLegenda = true }: { linhas: Linha[]; series: SerieBarra[]; mostrarLegenda?: boolean }) {
  const [ativa, setAtiva] = useState<number | null>(null)
  const total = (l: Linha) => series.reduce((s, x) => s + (l.valores[x.id] ?? 0), 0)
  const max = Math.max(1, ...linhas.map(total))

  return (
    <div>
      {mostrarLegenda && series.length > 1 && (
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-xs text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} />
              {s.rotulo}
            </li>
          ))}
        </ul>
      )}
      <ul className="space-y-2.5">
        {linhas.map((l, i) => {
          const t = total(l)
          const presentes = series.filter((s) => l.valores[s.id])
          const rotulo = l.href ? (
            <Link href={l.href} className="truncate hover:text-accent">
              {l.rotulo}
            </Link>
          ) : (
            <span className="truncate">{l.rotulo}</span>
          )
          return (
            <li key={l.id ?? l.href ?? l.rotulo} className="relative grid grid-cols-[minmax(0,9.5rem)_1fr_2.25rem] items-center gap-3 text-[13px]" onMouseEnter={() => setAtiva(i)} onMouseLeave={() => setAtiva(null)}>
              <span className="flex min-w-0 text-ink">{rotulo}</span>
              <div className="flex h-3.5 gap-[2px]" style={{ width: `${Math.max((t / max) * 100, t ? 2 : 0)}%` }}>
                {presentes.map((s, k) => (
                  <span
                    key={s.id}
                    className={`h-full transition-opacity ${k === presentes.length - 1 ? 'rounded-r' : ''} ${ativa !== null && ativa !== i ? 'opacity-40' : ''}`}
                    style={{ width: `${((l.valores[s.id] ?? 0) / t) * 100}%`, background: s.cor }}
                  />
                ))}
              </div>
              <span className="text-right font-medium tabular-nums text-ink-deep">{t}</span>
              {ativa === i && series.length > 1 && (
                <div className="pointer-events-none absolute bottom-6 left-40 z-10 rounded-md bg-ink-deep px-3 py-2 text-xs text-paper shadow-xl">
                  <p className="font-medium text-signal-light">{l.rotulo}</p>
                  {presentes.map((s) => (
                    <p key={s.id} className="mt-1 flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-paper/75">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />
                        {s.rotulo}
                      </span>
                      <b className="font-medium tabular-nums">{l.valores[s.id]}</b>
                    </p>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Colunas simples de uma série (histograma), com o valor sobre cada coluna. */
export function Colunas({ itens, cor = '#5b45e0', altura = 170 }: { itens: { rotulo: string; valor: number }[]; cor?: string; altura?: number }) {
  const [ativa, setAtiva] = useState<number | null>(null)
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <div className="flex items-end gap-2" style={{ height: altura + 40 }}>
      {itens.map((it, i) => (
        <div key={it.rotulo} className="flex flex-1 flex-col items-center gap-2" onMouseEnter={() => setAtiva(i)} onMouseLeave={() => setAtiva(null)}>
          <span className="text-xs font-medium tabular-nums text-ink-deep">{it.valor}</span>
          <div
            className="w-full max-w-14 rounded-t transition-opacity"
            style={{ height: Math.max((it.valor / max) * altura, it.valor ? 3 : 1), background: it.valor ? cor : '#e4e2ec', opacity: ativa === null || ativa === i ? 1 : 0.45 }}
          />
          <span className="text-center text-[11px] leading-tight text-subtle">{it.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

const RAMPA = ['#ece9fc', '#d6d0f8', '#b7acf2', '#9584ea', '#7360df', '#5843c6', '#3f2f97']

/** Mapa de calor (sequencial de um só tom: mais escuro = mais commits). */
export function MapaCalor({ linhas, colunas, valores }: { linhas: string[]; colunas: string[]; valores: number[][] }) {
  const [ativo, setAtivo] = useState<[number, number] | null>(null)
  const max = Math.max(1, ...valores.flat())
  const cor = (v: number) => (v === 0 ? '#f2f1f7' : RAMPA[Math.min(RAMPA.length - 1, Math.ceil((v / max) * (RAMPA.length - 1)))])
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-separate border-spacing-[3px] text-[11px]">
          <thead>
            <tr>
              <th />
              {colunas.map((c) => (
                <th key={c} className="pb-1 font-normal text-subtle">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l}>
                <th className="pr-2 text-right font-normal text-subtle">{l}</th>
                {colunas.map((c, j) => {
                  const v = valores[i][j]
                  const sel = ativo?.[0] === i && ativo?.[1] === j
                  return (
                    <td
                      key={c}
                      onMouseEnter={() => setAtivo([i, j])}
                      onMouseLeave={() => setAtivo(null)}
                      title={`${l}, ${c}: ${v} commit${v !== 1 ? 's' : ''}`}
                      className={`h-8 rounded-[3px] text-center tabular-nums transition-shadow ${sel ? 'ring-2 ring-ink-deep' : ''}`}
                      style={{ background: cor(v), color: v / max > 0.5 ? '#fff' : '#625e73' }}
                    >
                      {sel || v / max > 0.5 ? v : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-subtle">
        menos
        <span className="flex gap-[2px]">
          {RAMPA.map((c) => (
            <span key={c} className="h-2.5 w-4 rounded-[2px]" style={{ background: c }} />
          ))}
        </span>
        mais
      </div>
    </div>
  )
}
