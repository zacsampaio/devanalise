'use client'

import { useEffect, useRef, useState } from 'react'

export type Serie = { id: string; rotulo: string; cor: string }
type Ponto = { chave: string; rotulo: string; valores: Record<string, number> }

function escala(v: number) {
  const passo = [1, 2, 5, 10, 20, 25, 50, 100].find((p) => Math.ceil(v / p) <= 4) ?? 200
  const teto = Math.max(passo, Math.ceil(v / passo) * passo)
  return { teto, marcas: Array.from({ length: teto / passo + 1 }, (_, i) => i * passo) }
}

/** Linhas com mira e tooltip. Sem eixo duplo: todas as séries na mesma escala. */
export function GraficoLinhas({ pontos, series, altura = 220, area = false }: { pontos: Ponto[]; series: Serie[]; altura?: number; area?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(600)
  const [ativo, setAtivo] = useState<number | null>(null)

  useEffect(() => {
    const no = ref.current
    if (!no) return
    const obs = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    obs.observe(no)
    return () => obs.disconnect()
  }, [])

  const ESQ = 30
  const BAIXO = 22
  const util = Math.max(largura - ESQ - 8, 50)
  const h = altura - BAIXO
  const max = Math.max(1, ...pontos.flatMap((p) => series.map((s) => p.valores[s.id] ?? 0)))
  const { teto, marcas } = escala(max)
  const x = (i: number) => ESQ + (pontos.length > 1 ? (i / (pontos.length - 1)) * util : util / 2)
  const y = (v: number) => 6 + (1 - v / teto) * (h - 6)
  // rótulos do eixo x sem sobreposição: no máximo ~1 a cada 70px
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(1, Math.floor(util / 70))))

  const aoMover = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = Math.round(((px - ESQ) / util) * (pontos.length - 1))
    setAtivo(Math.min(pontos.length - 1, Math.max(0, i)))
  }

  return (
    <div ref={ref} className="relative">
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-ink">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.cor }} />
              {s.rotulo}
            </li>
          ))}
        </ul>
      )}
      <svg width={largura} height={altura} onMouseMove={aoMover} onMouseLeave={() => setAtivo(null)} className="block overflow-visible" role="img" aria-label={series.map((s) => s.rotulo).join(', ')}>
        {marcas.map((v) => (
          <g key={v}>
            <line x1={ESQ} x2={ESQ + util} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#cfcbdb' : '#efedf5'} />
            <text x={ESQ - 6} y={y(v) + 3.5} textAnchor="end" className="fill-subtle text-[10px] tabular-nums">
              {v}
            </text>
          </g>
        ))}
        {pontos.map((p, i) =>
          i % passoRotulo === 0 ? (
            <text key={p.chave} x={x(i)} y={altura - 4} textAnchor="middle" className="fill-subtle text-[10px]">
              {p.rotulo}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valores[s.id] ?? 0).toFixed(1)}`).join(' ')
          return (
            <g key={s.id}>
              {area && <path d={`${d} L${x(pontos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.cor} opacity={0.08} />}
              <path d={d} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}
        {ativo !== null && (
          <g>
            <line x1={x(ativo)} x2={x(ativo)} y1={6} y2={h} stroke="#0e0c16" strokeOpacity={0.25} strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.id} cx={x(ativo)} cy={y(pontos[ativo].valores[s.id] ?? 0)} r={4.5} fill={s.cor} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {ativo !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-36 rounded-md bg-ink-deep px-3 py-2.5 text-xs text-paper shadow-xl"
          style={x(ativo) > largura / 2 ? { right: largura - x(ativo) + 12 } : { left: x(ativo) + 12 }}
        >
          <p className="font-medium text-signal-light">{pontos[ativo].rotulo}</p>
          {series.map((s) => (
            <p key={s.id} className="mt-1.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-paper/75">
                <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />
                {s.rotulo}
              </span>
              <b className="font-medium tabular-nums">{pontos[ativo].valores[s.id] ?? 0}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
