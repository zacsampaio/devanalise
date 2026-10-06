/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import Link from 'next/link'
import { BarraTipos } from '@/components/BarraTipos'
import { CartaoDestaque } from '@/components/Cartoes'
import { ListaDemandas } from '@/components/ListaDemandas'
import { ContadorAnimado } from '@/components/ContadorAnimado'
import { CabecalhoSecao, EstadoVazio, LinkSeta } from '@/components/Estrutura'
import { GraficoEntregas } from '@/components/GraficoEntregas'
import { GraficoMensal } from '@/components/GraficoMensal'
import { GradeCommits } from '@/components/GradeCommits'
import { BarrasHorizontais } from '@/components/painel/Barras'
import { Revelar } from '@/components/Revelar'
import { COR_COMMITS, ORDEM_TIPOS, TIPOS } from '@/lib/config'
import type { Painel } from '@/lib/dados'

/** Marco entre as duas partes do início: as entregas e o ritmo. */
function Parte({ numero, titulo, escuro = false }: { numero: string; titulo: string; escuro?: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${escuro ? 'text-paper/45' : 'text-subtle'}`}>
      <span className="eyebrow tabular-nums">Parte {numero}</span>
      <span className={`h-px flex-1 ${escuro ? 'bg-white/10' : 'bg-line'}`} />
      <span className="eyebrow">{titulo}</span>
    </div>
  )
}

export function VisaoInicio({ painel, hospedado = false }: { painel: Painel; hospedado?: boolean }) {
  const { kpis, meses, demandas, porTipo, periodo, entregasMes, frentes, areas, sistemas, usuario, aviso, progresso, grade } = painel
  if (!periodo) return <div className="pt-16"><EstadoVazio aviso={aviso} progresso={progresso} hospedado={hospedado} /></div>

  const destaques = demandas
    .filter((d) => d.impacto === 'alto')
    .sort((a, b) => b.nCommits - a.nCommits)
    .slice(0, 6)
  const criaram = Math.round(((porTipo['novo-sistema'] + porTipo.funcionalidade + porTipo.integracao) / Math.max(kpis.demandas, 1)) * 100)
  const entregasTotais = entregasMes.map((m) => Object.values(m.valores).reduce((s, v) => s + v, 0))
  const melhorMes = entregasMes[entregasTotais.indexOf(Math.max(...entregasTotais))]
  // últimos 3 meses contra os 3 anteriores: mostra se o ritmo está crescendo
  const recentes = entregasTotais.slice(-3).reduce((s, v) => s + v, 0)
  const anteriores = entregasTotais.slice(-6, -3).reduce((s, v) => s + v, 0)
  const variacao = anteriores ? Math.round(((recentes - anteriores) / anteriores) * 100) : 0
  const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios)

  const numeros = [
    { valor: kpis.demandas, rotulo: 'Demandas entregues', nota: `${kpis.chamados} chamados no Jira e ${kpis.demandas - kpis.chamados} frentes sem chamado` },
    { valor: kpis.novosSistemas, rotulo: 'Sistemas e rotinas novos', nota: 'Criados do zero no período' },
    { valor: kpis.altoImpacto, rotulo: 'Entregas de alto impacto', nota: 'Prioridade alta no Jira' },
    { valor: kpis.sistemas, rotulo: 'Repositórios', nota: `Em ${areas.length} ${plural(areas.length, 'conta ou organização', 'contas ou organizações')}` },
    { valor: kpis.commits, rotulo: 'Commits', nota: 'Registros de código no GitHub' },
  ]

  return (
    <>
      {/* ───────────── HERO: o período em números ───────────── */}
      <section className="grain relative overflow-hidden bg-ink-deep pb-16 pt-32 text-paper lg:pb-20 lg:pt-40" style={{ backgroundColor: '#0e0c16' }}>
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/25 blur-[140px]" />
        <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-signal/15 blur-[120px]" />

        <div className="shell relative">
          <div className="grid items-end gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Revelar>
                {/* o comando que "gera" a página: o histórico do autor no período */}
                <p className="break-all font-mono text-sm text-paper/60">
                  <span className="text-signal-light">$</span> git log{usuario ? ` --author=${usuario.login}` : ''} --since={periodo.inicio.slice(0, 7)}
                  <span aria-hidden className="cursor-piscando" />
                </p>
              </Revelar>
              <Revelar delay={80}>
                <h1 className="mt-7 text-[clamp(2.4rem,5vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.035em]">
                  {entregasMes.length} {plural(entregasMes.length, 'mês', 'meses')} de trabalho, <span className="text-paper/55">contados em entregas.</span>
                </h1>
              </Revelar>
              <Revelar delay={160}>
                <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper/75">
                  O que foi entregue no período: sistemas novos, funcionalidades, integrações e correções, agrupados pelos chamados do Jira. Dados lidos ao vivo
                  do GitHub.
                </p>
              </Revelar>
              <Revelar delay={220}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a href="#entregas" className="gradient-border rounded-full bg-white/5 px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-white/10">
                    Ver as entregas ↓
                  </a>
                  <Link href="/demandas" className="rounded-full px-6 py-3 text-sm text-paper/70 transition-colors hover:text-paper">
                    Todas as demandas →
                  </Link>
                </div>
              </Revelar>
            </div>

            <Revelar delay={220} className="lg:col-span-5">
              <div className="gradient-border rounded-lg bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
                <p className="eyebrow text-paper/60">Composição das entregas</p>
                <p className="mt-4 text-2xl font-medium leading-snug tracking-tight">
                  <span className="brand-gradient-text-dark">{criaram}%</span> das demandas criaram capacidade nova: sistemas, funcionalidades ou integrações.
                </p>
                <div className="mt-7">
                  <BarraTipos porTipo={porTipo} escuro />
                </div>
              </div>
            </Revelar>
          </div>

          <Revelar delay={260} className="mt-16 lg:mt-20">
            <GradeCommits semanas={grade.semanas} max={grade.max} diasAtivos={grade.diasAtivos} total={grade.semanas.flat().reduce((s, d) => s + (d?.commits ?? 0), 0)} />
          </Revelar>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-3 lg:mt-14 lg:grid-cols-5">
            {numeros.map((n, i) => (
              <Revelar key={n.rotulo} delay={100 + i * 70}>
                <dt className="eyebrow text-paper/55">{n.rotulo}</dt>
                <dd>
                  <ContadorAnimado ate={n.valor} atraso={i * 110} className="mt-4 block text-figure font-medium text-paper" />
                  <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-paper/55">{n.nota}</p>
                </dd>
              </Revelar>
            ))}
          </dl>
        </div>
      </section>

      {/* ═════════════ PARTE 1 · AS ENTREGAS ═════════════ */}

      {/* ───────────── Entregas mês a mês ───────────── */}
      <section id="entregas" className="py-24 lg:py-32">
        <div className="shell">
          <Parte numero="1" titulo="As entregas" />
          <div className="mt-14">
            <CabecalhoSecao
              eyebrow="Entregas"
              titulo={<>Demandas concluídas, <span className="italic text-accent">mês a mês</span>.</>}
              texto="Cada barra é o que foi concluído no mês, pelo tipo de entrega. Passe o mouse para ver o detalhe."
            />
          </div>
          <div className="mt-14 grid gap-10 lg:grid-cols-12">
            <Revelar className="lg:col-span-9">
              <GraficoEntregas meses={entregasMes} />
            </Revelar>
            <Revelar delay={120} className="lg:col-span-3">
              <dl className="grid grid-cols-2 gap-6 border-t border-line pt-6 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div>
                  <dt className="eyebrow text-subtle">Média mensal</dt>
                  <dd className="mt-3 text-3xl font-medium tabular-nums tracking-tight text-ink-deep">{(kpis.demandas / Math.max(entregasMes.length, 1)).toFixed(1).replace('.', ',')}</dd>
                  <p className="mt-1 text-sm text-subtle">demandas concluídas por mês</p>
                </div>
                <div>
                  <dt className="eyebrow text-subtle">Mês mais produtivo</dt>
                  <dd className="mt-3 text-3xl font-medium tracking-tight text-ink-deep">{melhorMes.rotulo}</dd>
                  <p className="mt-1 text-sm text-subtle">{Math.max(...entregasTotais)} demandas concluídas</p>
                </div>
                <div>
                  <dt className="eyebrow text-subtle">Últimos 3 meses</dt>
                  <dd className="mt-3 text-3xl font-medium tabular-nums tracking-tight text-ink-deep">
                    {recentes}
                    {variacao !== 0 && (
                      <span className="ml-2 text-base font-medium" style={{ color: variacao > 0 ? '#087a52' : '#625e73' }}>
                        {variacao > 0 ? '▲' : '▼'} {Math.abs(variacao)}%
                      </span>
                    )}
                  </dd>
                  <p className="mt-1 text-sm text-subtle">demandas, contra {anteriores} nos 3 meses anteriores</p>
                </div>
              </dl>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ───────────── Frentes ───────────── */}
      <section className="grain relative overflow-hidden bg-ink-deep py-24 text-paper lg:py-32" style={{ backgroundColor: '#0e0c16' }}>
        <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[30rem] w-[36rem] rounded-full bg-signal/10 blur-[150px]" />
        <div className="shell relative">
          <CabecalhoSecao
            escuro
            eyebrow="Frentes"
            titulo={<>Os temas que <span className="brand-gradient-text-dark">atravessam o trabalho</span>.</>}
            texto="Temas que atravessam os repositórios. Uma mesma demanda pode contribuir para mais de uma frente."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {frentes.map((f, i) => (
              <Revelar key={f.id} delay={(i % 3) * 90} className={i < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}>
                <article className="flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.03] p-6 sm:p-7">
                  <div className="flex items-baseline gap-3">
                    <span className={`font-medium leading-none tracking-[-0.04em] tabular-nums ${i < 2 ? 'text-[3.4rem]' : 'text-[2.8rem]'}`}>
                      <ContadorAnimado ate={f.demandas} />
                    </span>
                    <span className="text-sm text-paper/55">demandas</span>
                  </div>
                  <h3 className="mt-5 text-xl font-medium tracking-tight">{f.rotulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-paper/60">{f.descricao}.</p>
                  <p className="mt-4 text-xs text-paper/45">
                    {f.sistemas} repositórios · {f.altoImpacto} de alto impacto
                  </p>
                  <ul className="mt-5 flex-1 space-y-1 border-t border-white/10 pt-4">
                    {f.exemplos.map((e) => (
                      <li key={e.slug}>
                        <Link href={`/demandas/${e.slug}`} className="group flex gap-2 py-1 text-sm leading-snug text-paper/80 hover:text-paper">
                          <span aria-hidden className="text-signal-light transition-transform group-hover:translate-x-0.5">›</span>
                          {e.titulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Por conta ou organização ───────────── */}
      <section className="bg-muted py-24 lg:py-32">
        <div className="shell">
          <CabecalhoSecao
            eyebrow="Por conta ou organização"
            titulo={<>Onde as entregas <span className="italic text-accent">aconteceram</span>.</>}
            texto="Demandas agrupadas pelo dono do repositório principal em que foram feitas."
            acao={{ href: '/sistemas', rotulo: 'Ver sistemas' }}
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {areas.map((a, i) => (
              <Revelar key={a.area} delay={(i % 3) * 80}>
                <article className="flex h-full flex-col rounded-lg border border-line bg-paper p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-medium tracking-tight text-ink-deep">{a.area}</h3>
                    <span className="text-[2.4rem] font-medium leading-none tracking-[-0.04em] tabular-nums text-ink-deep">{a.demandas}</span>
                  </div>
                  <p className="mt-1 text-sm text-subtle">
                    {a.altoImpacto > 0 && <>{a.altoImpacto} de alto impacto · </>}
                    {a.novos > 0 && <>{a.novos} criado{a.novos > 1 ? 's' : ''} do zero · </>}
                    {a.sistemas.length} {plural(a.sistemas.length, 'repositório', 'repositórios')}
                  </p>
                  <div className="mt-5">
                    <BarraTipos porTipo={a.porTipo} legenda={false} />
                  </div>
                  <ul className="mt-5 flex-1 space-y-1">
                    {a.principais.map((d) => (
                      <li key={d.slug}>
                        <Link href={`/demandas/${d.slug}`} className="group -mx-2 flex gap-3 rounded px-2 py-1.5 text-[14px] leading-snug transition-colors hover:bg-muted">
                          <span className="w-16 shrink-0 pt-px text-xs font-medium tabular-nums text-accent">{d.rotulo === 'Sem chamado' ? '—' : d.rotulo}</span>
                          <span className="text-ink-deep group-hover:text-accent">{d.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4">
                    {a.sistemas.map((s) => (
                      <Link key={s.slug} href={`/sistemas/${s.slug}`} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-subtle transition-colors hover:bg-ink-deep hover:text-paper">
                        {s.nome}
                      </Link>
                    ))}
                  </div>
                </article>
              </Revelar>
            ))}
          </div>
          <Revelar className="mt-8">
            <p className="text-center text-xs text-subtle">
              Cores das barras:{' '}
              {ORDEM_TIPOS.map((t) => (
                <span key={t} className="mx-2 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: TIPOS[t].cor }} />
                  {TIPOS[t].rotulo}
                </span>
              ))}
            </p>
          </Revelar>
        </div>
      </section>

      {/* ───────────── Destaques ───────────── */}
      {destaques.length > 0 && (
        <section className="grain relative overflow-hidden bg-ink-deep py-24 text-paper lg:py-32" style={{ backgroundColor: '#0e0c16' }}>
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[50rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[160px]" />
          <div className="shell relative">
            <CabecalhoSecao
              escuro
              eyebrow="Entregas de alto impacto"
              titulo={<>O que <span className="brand-gradient-text-dark">mais pesou</span>.</>}
              texto={`As ${destaques.length} maiores entregas de alto impacto, pelo volume de trabalho. São ${kpis.altoImpacto} no total.`}
              acao={{ href: '/demandas?impacto=alto', rotulo: `Ver as ${kpis.altoImpacto}` }}
            />
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {destaques.map((d, i) => (
                <Revelar key={d.id} delay={(i % 3) * 90}>
                  <CartaoDestaque d={d} />
                </Revelar>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═════════════ PARTE 2 · O RITMO ═════════════ */}

      <section className="py-24 lg:py-32">
        <div className="shell">
          <Parte numero="2" titulo="O ritmo" />
          <div className="mt-14">
            <CabecalhoSecao
              eyebrow="Ritmo"
              titulo={<>Commits <span className="italic text-accent">mês a mês</span>.</>}
              texto="Volume de código registrado em cada mês e onde ele foi parar. Passe o mouse sobre um mês para ver também as demandas concluídas."
              acao={{ href: '/dashboard', rotulo: 'Abrir o dashboard' }}
            />
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <Revelar className="lg:col-span-8">
              <GraficoMensal meses={meses} />
            </Revelar>
            <Revelar delay={120} className="lg:col-span-4">
              <p className="eyebrow text-ink">Repositórios com mais commits</p>
              <div className="mt-6">
                <BarrasHorizontais
                  linhas={sistemas.slice(0, 8).map((s) => ({ rotulo: s.nome, valores: { commits: s.commits }, href: `/sistemas/${s.slug}` }))}
                  series={[{ id: 'commits', rotulo: 'Commits', cor: COR_COMMITS }]}
                />
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ───────────── Últimas entregas ───────────── */}
      <section className="bg-muted py-24 lg:py-32">
        <div className="shell">
          <CabecalhoSecao
            eyebrow="Últimas entregas"
            titulo={<>O que saiu <span className="italic text-accent">mais recentemente</span>.</>}
            acao={{ href: '/demandas', rotulo: `Todas as ${kpis.demandas} demandas` }}
          />
          <div className="mt-12">
            <ListaDemandas demandas={demandas.slice(0, 30)} filtros="nenhum" />
          </div>
          <div className="mt-8 flex justify-end">
            <LinkSeta href="/demandas">Ver todas as demandas</LinkSeta>
          </div>
        </div>
      </section>
    </>
  )
}
