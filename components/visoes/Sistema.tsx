/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import { BarraTipos } from '@/components/BarraTipos'
import { CartaoDestaque } from '@/components/Cartoes'
import { CabecalhoSecao, FaixaNumeros, HeroPagina } from '@/components/Estrutura'
import { GraficoMensal } from '@/components/GraficoMensal'
import { ListaDemandas } from '@/components/ListaDemandas'
import { Revelar } from '@/components/Revelar'
import { dataLonga } from '@/components/Selos'
import type { sistemaDe } from '@/lib/dados'

export type DadosSistema = NonNullable<ReturnType<typeof sistemaDe>>

export function VisaoSistema({ dados }: { dados: DadosSistema }) {
  const { sistema: s, demandas, porTipo, meses } = dados
  const total = s.commits
  const alto = demandas.filter((d) => d.impacto === 'alto').sort((a, b) => b.nCommits - a.nCommits)

  return (
    <>
      <HeroPagina
        trilha={[
          { href: '/', rotulo: 'Início' },
          { href: '/sistemas', rotulo: 'Sistemas' },
        ]}
        eyebrow={
          <>
            {s.area}
            <span className="font-mono normal-case tracking-normal text-paper/50">{s.repo}</span>
          </>
        }
        titulo={s.nome}
        texto={
          <>
            Entregas de {dataLonga(s.primeiro)} a {dataLonga(s.ultimo)}.{' '}
            <a href={`https://github.com/${s.repo}`} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-4 hover:text-paper">
              Abrir no GitHub ↗
            </a>
          </>
        }
      >
        <FaixaNumeros
          itens={[
            { valor: demandas.length, rotulo: 'Demandas' },
            { valor: alto.length, rotulo: 'Alto impacto' },
            { valor: total, rotulo: 'Commits' },
            { valor: demandas.filter((d) => d.jira).length, rotulo: 'Com chamado no Jira' },
            { valor: new Set(demandas.map((d) => d.fim.slice(0, 7))).size, rotulo: 'Meses com entregas' },
          ]}
        />
      </HeroPagina>

      <section className="py-24 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <CabecalhoSecao eyebrow="Ritmo" titulo={<>Trabalho <span className="italic text-accent">mês a mês</span>.</>} />
            <Revelar className="mt-10">
              <GraficoMensal meses={meses} />
            </Revelar>
          </div>
          <Revelar delay={120} className="space-y-6 lg:col-span-4 lg:pt-4">
            <div className="rounded-lg border border-line p-6">
              <p className="eyebrow text-ink">Tipos de entrega</p>
              <div className="mt-5">
                <BarraTipos porTipo={porTipo} />
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {alto.length > 0 && (
        <section className="grain relative overflow-hidden bg-ink-deep py-24 text-paper lg:py-28" style={{ backgroundColor: '#0e0c16' }}>
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[44rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[160px]" />
          <div className="shell relative">
            <CabecalhoSecao escuro eyebrow="Alto impacto" titulo={<>O que mais <span className="brand-gradient-text-dark">mudou neste sistema</span>.</>} />
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {alto.slice(0, 6).map((d, i) => (
                <Revelar key={d.id} delay={(i % 3) * 90}>
                  <CartaoDestaque d={d} />
                </Revelar>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 lg:py-28">
        <div className="shell">
          <CabecalhoSecao eyebrow="Demandas" titulo={<>{demandas.length} demandas em {s.nome}.</>} />
          <div className="mt-10">
            <ListaDemandas demandas={demandas} sistemas={[]} semFiltroSistema />
          </div>
        </div>
      </section>
    </>
  )
}
