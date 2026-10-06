import Link from 'next/link'
import type { ReactNode } from 'react'

/** Cartão base do painel: título, uma linha de contexto e o gráfico. */
export function Cartao({
  titulo,
  subtitulo,
  acao,
  className = '',
  children,
}: {
  titulo: string
  subtitulo?: string
  acao?: { href: string; rotulo: string }
  className?: string
  children: ReactNode
}) {
  return (
    // min-w-0: item de grid não encolhe abaixo do conteúdo (gráficos) sem isso, e a página inteira alarga no celular
    <section className={`flex min-w-0 flex-col rounded-lg border border-line bg-paper p-5 sm:p-6 ${className}`}>
      {/* o link fica na linha do título: assim o subtítulo usa a largura toda no celular */}
      <header>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-medium tracking-tight text-ink-deep">{titulo}</h2>
          {acao && (
            <Link href={acao.href} className="shrink-0 text-xs font-medium text-accent hover:underline">
              {acao.rotulo} →
            </Link>
          )}
        </div>
        {subtitulo && <p className="mt-1 text-xs leading-relaxed text-subtle">{subtitulo}</p>}
      </header>
      <div className="mt-5 flex-1">{children}</div>
    </section>
  )
}

/** Mini-gráfico de linha para os indicadores (sem eixos; o ponto final marca o valor atual). */
export function Sparkline({ serie, cor = '#5b45e0' }: { serie: number[]; cor?: string }) {
  if (serie.length < 2) return null
  const L = 120
  const A = 32
  const max = Math.max(...serie, 1)
  const pontos = serie.map((v, i) => [(i / (serie.length - 1)) * L, A - 3 - (v / max) * (A - 6)] as const)
  const caminho = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [ux, uy] = pontos.at(-1)!
  return (
    <svg viewBox={`-2 0 ${L + 6} ${A}`} className="h-8 w-28" aria-hidden>
      <path d={`${caminho} L${L},${A} L0,${A} Z`} fill={cor} opacity={0.08} />
      <path d={caminho} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ux} cy={uy} r={3} fill={cor} stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}

/** Indicador com valor, variação contra o período anterior e tendência mensal. */
export function Indicador({
  rotulo,
  valor,
  unidade,
  variacao,
  inverter = false,
  nota,
  serie,
}: {
  rotulo: string
  valor: string | number
  unidade?: string
  /** % contra a janela anterior; null quando não há base de comparação */
  variacao?: number | null
  /** true quando subir é ruim (ex.: tempo de entrega) */
  inverter?: boolean
  nota?: string
  serie?: number[]
}) {
  const bom = variacao != null && (inverter ? variacao < 0 : variacao > 0)
  return (
    <div className="flex flex-col justify-between rounded-lg border border-line bg-paper p-5">
      <p className="eyebrow text-subtle">{rotulo}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[2.1rem] font-medium leading-none tracking-[-0.04em] tabular-nums text-ink-deep">
          {valor}
          {unidade && <span className="ml-1 text-base font-normal tracking-normal text-subtle">{unidade}</span>}
        </p>
        {serie && <Sparkline serie={serie} />}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-subtle">
        {variacao != null && variacao !== 0 && (
          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium tabular-nums ${bom ? 'bg-signal/10 text-signal' : 'bg-ink/5 text-ink'}`}>
            {variacao > 0 ? '▲' : '▼'} {Math.abs(variacao)}%
          </span>
        )}
        {variacao === 0 && <span className="rounded bg-ink/5 px-1.5 py-0.5 font-medium">= 0%</span>}
        <span>{nota}</span>
      </p>
    </div>
  )
}
