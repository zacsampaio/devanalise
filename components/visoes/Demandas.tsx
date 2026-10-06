/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import { BarraTipos } from '@/components/BarraTipos'
import { EstadoVazio, HeroPagina } from '@/components/Estrutura'
import { ListaDemandas, type FiltrosIniciais } from '@/components/ListaDemandas'
import { Revelar } from '@/components/Revelar'
import { ORDEM_TIPOS, type Impacto, type TipoId } from '@/lib/config'
import type { Painel } from '@/lib/dados'

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Filtros vindos da URL, ex.: /demandas?impacto=alto&tipo=correcao */
export function lerFiltros(q: Record<string, string | string[] | undefined>): FiltrosIniciais {
  const tipo = primeiro(q.tipo)
  const impacto = primeiro(q.impacto)
  return {
    tipos: tipo && ORDEM_TIPOS.includes(tipo as TipoId) ? [tipo as TipoId] : undefined,
    impacto: impacto && ['alto', 'medio', 'baixo'].includes(impacto) ? (impacto as Impacto) : undefined,
    sistema: primeiro(q.sistema),
    busca: primeiro(q.q),
  }
}

export function VisaoDemandas({ painel, inicial, hospedado = false }: { painel: Painel; inicial: FiltrosIniciais; hospedado?: boolean }) {
  const { demandas, sistemas, porTipo, kpis, vazio, aviso, progresso } = painel
  if (vazio) return <div className="pt-16"><EstadoVazio aviso={aviso} progresso={progresso} hospedado={hospedado} /></div>

  const porImpacto = (['alto', 'medio', 'baixo'] as Impacto[]).map((i) => demandas.filter((d) => d.impacto === i).length)

  return (
    <>
      <HeroPagina
        trilha={[{ href: '/', rotulo: 'Início' }]}
        eyebrow="Todas as demandas"
        titulo={<>Cada entrega, <span className="brand-gradient-text-dark">com o que ela trouxe</span>.</>}
        texto="Filtre por tipo, sistema ou impacto. Cada demanda tem uma página com o chamado no Jira, o período e os commits que a compõem."
      >
        <div className="mt-12 grid gap-6 border-t border-white/10 pt-10 lg:grid-cols-12">
          <Revelar className="lg:col-span-5">
            <p className="eyebrow text-paper/55">Por tipo de entrega</p>
            <div className="mt-5">
              <BarraTipos porTipo={porTipo} escuro />
            </div>
          </Revelar>
          <Revelar delay={100} className="grid grid-cols-3 gap-6 lg:col-span-6 lg:col-start-7">
            {[
              { v: porImpacto[0], r: 'Alto impacto' },
              { v: porImpacto[1], r: 'Médio impacto' },
              { v: porImpacto[2], r: 'Baixo impacto' },
            ].map((x) => (
              <div key={x.r}>
                <p className="eyebrow text-paper/55">{x.r}</p>
                <p className="mt-4 text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-none tracking-[-0.04em] tabular-nums">{x.v}</p>
                <p className="mt-2 text-sm text-paper/50">{Math.round((x.v / kpis.demandas) * 100)}% do total</p>
              </div>
            ))}
          </Revelar>
        </div>
      </HeroPagina>

      <section className="pb-24 pt-10 lg:pb-32">
        <div className="shell">
          {/* key: ao navegar para outra combinação de filtros na URL, a lista recomeça dela */}
          <ListaDemandas key={JSON.stringify(inicial)} demandas={demandas} sistemas={[...new Set(sistemas.map((s) => s.nome))].sort()} inicial={inicial} />
        </div>
      </section>
    </>
  )
}
