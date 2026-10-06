/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import Link from 'next/link'
import { TabelaSistemas } from '@/components/Cartoes'
import { CabecalhoSecao, EstadoVazio, FaixaNumeros, HeroPagina } from '@/components/Estrutura'
import { Revelar } from '@/components/Revelar'
import { dataCurta } from '@/components/Selos'
import type { Painel } from '@/lib/dados'

export function VisaoSistemas({ painel, hospedado = false }: { painel: Painel; hospedado?: boolean }) {
  const { sistemas, demandas, geradoEm, vazio, aviso, progresso } = painel
  if (vazio) return <div className="pt-16"><EstadoVazio aviso={aviso} progresso={progresso} hospedado={hospedado} /></div>
  const areas = [...new Set(sistemas.map((s) => s.area))]
  const porArea = areas
    .map((a) => ({ area: a, lista: sistemas.filter((s) => s.area === a) }))
    .sort((x, y) => y.lista.reduce((s, z) => s + z.commits, 0) - x.lista.reduce((s, z) => s + z.commits, 0))
  const altoPorRepo = (repo: string) => demandas.filter((d) => d.repos[0] === repo && d.impacto === 'alto').length

  return (
    <>
      <HeroPagina
        trilha={[{ href: '/', rotulo: 'Início' }]}
        eyebrow="Sistemas"
        titulo={<>Onde o esforço <span className="brand-gradient-text-dark">foi investido</span>.</>}
        texto="Cada repositório com commits seus no período, agrupado pela conta ou organização dona."
      >
        <FaixaNumeros
          itens={[
            { valor: sistemas.length, rotulo: 'Repositórios' },
            { valor: areas.length, rotulo: 'Contas e organizações' },
            { valor: demandas.filter((d) => d.repos.length > 1).length, rotulo: 'Demandas em vários repositórios' },
            { valor: sistemas.filter((s) => new Date(s.ultimo) > new Date(+new Date(geradoEm) - 30 * 86_400_000)).length, rotulo: 'Ativos nos últimos 30 dias' },
          ]}
        />
      </HeroPagina>

      <section className="bg-muted py-20 lg:py-24">
        <div className="shell space-y-16">
          {porArea.map(({ area, lista }) => (
            <div key={area}>
              <Revelar>
                <p className="eyebrow flex items-center gap-3 text-accent">
                  <span aria-hidden className="h-px w-8 bg-accent/50" />
                  {area} · {lista.length} repositório{lista.length > 1 ? 's' : ''}
                </p>
              </Revelar>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lista.map((s, i) => {
                  const total = s.commits
                  const alto = altoPorRepo(s.repo)
                  return (
                    <Revelar key={s.repo} delay={(i % 3) * 80}>
                      <Link href={`/sistemas/${s.slug}`} className="group flex h-full flex-col rounded-lg border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_18px_40px_-24px_rgba(14,12,22,0.35)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-medium tracking-tight text-ink-deep group-hover:text-accent">{s.nome}</h3>
                            <p className="mt-1 font-mono text-xs text-subtle">{s.repo}</p>
                          </div>
                          <span className="text-subtle transition-transform group-hover:translate-x-1">→</span>
                        </div>
                        <dl className="mt-6 grid grid-cols-3 gap-3">
                          <div>
                            <dd className="text-2xl font-medium tabular-nums text-ink-deep">{s.demandas}</dd>
                            <dt className="eyebrow mt-1.5 text-subtle">Demandas</dt>
                          </div>
                          <div>
                            <dd className="text-2xl font-medium tabular-nums text-ink-deep">{alto}</dd>
                            <dt className="eyebrow mt-1.5 text-subtle">Alto impacto</dt>
                          </div>
                          <div>
                            <dd className="text-2xl font-medium tabular-nums text-ink-deep">{total}</dd>
                            <dt className="eyebrow mt-1.5 text-subtle">Commits</dt>
                          </div>
                        </dl>
                        <div className="mt-auto pt-6">
                          <p className="flex justify-end text-xs text-subtle">
                            <span>
                              {dataCurta(s.primeiro)} → {dataCurta(s.ultimo)}
                            </span>
                          </p>
                        </div>
                      </Link>
                    </Revelar>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 lg:py-28">
        <div className="shell">
          <CabecalhoSecao eyebrow="Visão em tabela" titulo={<>Todos os repositórios, <span className="italic text-accent">por volume</span>.</>} />
          <Revelar className="mt-12">
            <TabelaSistemas sistemas={sistemas} />
          </Revelar>
        </div>
      </section>
    </>
  )
}
