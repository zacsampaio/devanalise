import Link from 'next/link'
import { COR_COMMITS, TIPOS } from '@/lib/config'
import type { Demanda, Painel } from '@/lib/dados'
import { periodo, SeloAutomatica, SeloImpacto, SeloStatusJira, SeloTipo } from './Selos'

/** Linha de demanda — usada na lista completa e nos resumos. */
export function LinhaDemanda({ d }: { d: Demanda }) {
  const total = d.nCommits
  return (
    <Link href={`/demandas/${d.slug}`} className="group grid grid-cols-1 gap-4 py-6 transition-colors hover:bg-muted/70 md:grid-cols-12 md:gap-6 md:px-3">
      <div className="md:col-span-2">
        <p className={`text-sm font-medium tabular-nums ${d.rotulo === 'Sem chamado' ? 'text-subtle' : 'text-accent'}`}>{d.rotulo}</p>
        <p className="mt-1 text-xs text-subtle">{periodo(d.inicio, d.fim)}</p>
      </div>
      <div className="md:col-span-8">
        <div className="flex flex-wrap items-center gap-2">
          <SeloTipo tipo={d.tipo} />
          <SeloImpacto impacto={d.impacto} />
          {d.jira && <SeloStatusJira jira={d.jira} />}
          {d.automatica && <SeloAutomatica />}
        </div>
        <h3 className="mt-3 text-lg font-medium leading-snug tracking-tight text-ink-deep transition-colors group-hover:text-accent">{d.titulo}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-subtle">{d.resumo}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.12em] text-subtle/80">{d.sistemas.join(' · ')}</p>
      </div>
      <div className="flex items-start justify-between gap-4 md:col-span-2 md:flex-col md:items-end">
        <p className="text-sm tabular-nums text-subtle md:text-right">
          <span className="text-2xl font-medium text-ink-deep">{total}</span> commit{total > 1 ? 's' : ''}
        </p>
        <span className="no-print hidden text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 md:block">Abrir demanda →</span>
      </div>
    </Link>
  )
}

/** Cartão escuro de entrega de destaque. */
export function CartaoDestaque({ d }: { d: Demanda }) {
  return (
    <Link
      href={`/demandas/${d.slug}`}
      className="group flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow truncate text-paper/55">{d.rotulo} · {d.sistemas[0]}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-paper/70">
          <span className="h-2 w-2 rounded-full" style={{ background: TIPOS[d.tipo].cor }} />
          {TIPOS[d.tipo].rotulo}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-medium leading-snug tracking-tight">{d.titulo}</h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-paper/65">{d.resumo}</p>
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-paper/60">{d.jira ? d.jira.status : periodo(d.inicio, d.fim)}</span>
        <span className="text-xs text-paper/50 transition-colors group-hover:text-signal-light">{d.nCommits} commits →</span>
      </div>
    </Link>
  )
}

/** Tabela de sistemas por volume de commits. */
export function TabelaSistemas({ sistemas }: { sistemas: Painel['sistemas'] }) {
  const max = Math.max(1, ...sistemas.map((s) => s.commits))
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-paper">
      <table className="w-full min-w-[46rem] text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="eyebrow px-6 py-4 font-medium text-subtle">Sistema</th>
            <th className="eyebrow px-4 py-4 text-right font-medium text-subtle">Demandas</th>
            <th className="eyebrow w-[38%] px-4 py-4 font-medium text-subtle">Commits</th>
            <th className="eyebrow px-6 py-4 text-right font-medium text-subtle">Última atividade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sistemas.map((s) => (
            <tr key={s.repo} className="group relative transition-colors hover:bg-muted/60">
              <td className="px-6 py-4">
                <Link href={`/sistemas/${s.slug}`} className="font-medium text-ink-deep after:absolute after:inset-0 group-hover:text-accent">
                  {s.nome}
                </Link>
                <p className="text-xs text-subtle">{s.repo}</p>
              </td>
              <td className="px-4 py-4 text-right text-lg font-medium tabular-nums text-ink-deep">{s.demandas}</td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 rounded" style={{ width: `${Math.max((s.commits / max) * 100, 3)}%`, background: COR_COMMITS }} />
                  <span className="shrink-0 text-sm tabular-nums text-subtle">{s.commits}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right text-sm text-subtle">{new Date(s.ultimo).toLocaleDateString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
