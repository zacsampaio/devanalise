import { IMPACTOS, TIPOS, type Impacto, type TipoId } from '@/lib/config'
import type { Demanda } from '@/lib/dados'

const PESO: Record<Impacto, number> = { alto: 3, medio: 2, baixo: 1 }

export function SeloTipo({ tipo, escuro = false }: { tipo: TipoId; escuro?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        escuro ? 'border-white/15 bg-white/5 text-paper/85' : 'border-line bg-paper text-ink'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: TIPOS[tipo].cor }} />
      {TIPOS[tipo].rotulo}
    </span>
  )
}

export function SeloImpacto({ impacto, escuro = false }: { impacto: Impacto; escuro?: boolean }) {
  const n = PESO[impacto]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${escuro ? 'text-paper/70' : 'text-subtle'}`} title={IMPACTOS[impacto]}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-1 rounded-full ${i <= n ? (escuro ? 'bg-paper' : 'bg-ink-deep') : escuro ? 'bg-white/20' : 'bg-line'}`} />
        ))}
      </span>
      {IMPACTOS[impacto]}
    </span>
  )
}

const COR_STATUS = { done: '#2bb37f', indeterminate: '#7b66f5', new: '#8a8699' } as const

/** Status atual da issue no Jira, com a cor da categoria (a fazer, em andamento, concluído). */
export function SeloStatusJira({ jira, escuro = false }: { jira: NonNullable<Demanda['jira']>; escuro?: boolean }) {
  return (
    <span
      title={`Status no Jira: ${jira.status}${jira.prioridade ? ` · prioridade ${jira.prioridade}` : ''}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        escuro ? 'border-white/15 bg-white/5 text-paper/85' : 'border-line bg-paper text-ink'
      }`}
    >
      <span className="h-2 w-2 rounded-sm" style={{ background: COR_STATUS[jira.categoria] }} />
      {jira.status}
    </span>
  )
}

export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
export const dataLonga = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
export const mesAno = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' ')

export function periodo(inicio: string, fim: string) {
  const a = dataCurta(inicio)
  const b = dataCurta(fim)
  return a === b ? a : `${a} → ${b}`
}

/** Tipo ou impacto vieram das regras automáticas, não do Jira. */
export function SeloAutomatica({ escuro = false }: { escuro?: boolean }) {
  return (
    <span
      title="Sem tipo ou prioridade no Jira: a classificação veio das mensagens dos commits."
      className={`inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-[11px] ${escuro ? 'border-white/25 text-paper/60' : 'border-subtle/40 text-subtle'}`}
    >
      Classificação automática
    </span>
  )
}
