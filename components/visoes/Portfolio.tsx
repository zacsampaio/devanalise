/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import Image from 'next/image'
import Link from 'next/link'
import { BarraTipos } from '@/components/BarraTipos'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { DetalhesProjeto } from '@/components/DetalhesProjeto'
import { EstadoVazio } from '@/components/Estrutura'
import { FiltroVisibilidade, RecorteVazio } from '@/components/FiltroVisibilidade'
import { Revelar } from '@/components/Revelar'
import { mesAno, SeloImpacto, SeloTipo } from '@/components/Selos'
import type { VisibilidadeId } from '@/lib/dados'
import { CRITERIOS, type portfolioDe, type Projeto } from '@/lib/portfolio'

const numero = (n: number) => n.toLocaleString('pt-BR')
const periodoProjeto = (p: Projeto) => (mesAno(p.inicio) === mesAno(p.fim) ? mesAno(p.inicio) : `${mesAno(p.inicio)} – ${mesAno(p.fim)}`)
const corPrincipal = (p: Projeto) => p.linguagens[0]?.cor ?? '#a99bff'

export type DadosPortfolio = ReturnType<typeof portfolioDe>

export function VisaoPortfolio({ dados, visibilidade, hospedado = false }: { dados: DadosPortfolio; visibilidade: VisibilidadeId; hospedado?: boolean }) {
  const { projetos, avaliados, perfil, vazio, aviso, progresso, temLinguagens, temVisibilidade, usuario } = dados
  // sem dado nenhum: explica a configuração; recorte vazio é tratado abaixo, com o filtro à vista
  if (vazio && visibilidade === 'todos') return <div className="pt-16"><EstadoVazio aviso={aviso} progresso={progresso} hospedado={hospedado} /></div>
  const [principal, ...demais] = projetos

  return (
    <>
      {/* ───────────── apresentação ───────────── */}
      <section className="grain relative overflow-hidden bg-ink-deep pb-20 pt-32 text-paper lg:pb-24 lg:pt-40">
        <div aria-hidden className="pointer-events-none absolute -right-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-accent/25 blur-[150px]" />
        <div className="shell relative">
          <Revelar>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {usuario?.avatar && <Image src={usuario.avatar} alt="" width={64} height={64} className="h-16 w-16 rounded-full ring-2 ring-white/15" />}
                <div>
                  <p className="text-xl font-medium">{usuario?.nome ?? 'Portfólio'}</p>
                  {usuario && <p className="mt-1 font-mono text-sm text-paper/55">@{usuario.login}</p>}
                </div>
              </div>
              <FiltroVisibilidade escuro atual={visibilidade} href={(v) => (v === 'todos' ? '/portfolio' : `/portfolio?repos=${v}`)} />
            </div>
          </Revelar>
          <Revelar delay={80}>
            <h1 className="mt-10 max-w-4xl text-[clamp(2.4rem,5.2vw,4.5rem)] font-medium leading-[1.03] tracking-[-0.035em]">{perfil.posicionamento}</h1>
          </Revelar>
          <Revelar delay={140} className={vazio ? 'hidden' : undefined}>
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              {[
                { valor: perfil.entregas, rotulo: 'entregas' },
                { valor: perfil.sistemas, rotulo: 'sistemas' },
                { valor: perfil.meses, rotulo: perfil.meses === 1 ? 'mês de trabalho' : 'meses de trabalho' },
              ].map((n) => (
                <div key={n.rotulo} className="flex items-baseline gap-2.5">
                  <dd className="font-mono text-3xl font-medium tracking-tight">{numero(n.valor)}</dd>
                  <dt className="text-paper/60">{n.rotulo}</dt>
                </div>
              ))}
            </dl>
            {perfil.stack.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tecnologias">
                {perfil.stack.map((l) => (
                  <li key={l.nome} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-sm text-paper/85">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.cor }} />
                    {l.nome}
                  </li>
                ))}
              </ul>
            )}
          </Revelar>
          <Revelar delay={200}>
            <div className="no-print mt-12 flex flex-wrap items-center gap-3">
              <a href="#projetos" className="rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink-deep transition-colors hover:bg-white">
                Ver projetos
              </a>
              <BotaoImprimir>Salvar em PDF</BotaoImprimir>
              {usuario && (
                <a href={`https://github.com/${usuario.login}`} target="_blank" rel="noreferrer" className="px-3 py-2.5 text-sm text-paper/70 transition-colors hover:text-paper">
                  Perfil no GitHub ↗
                </a>
              )}
            </div>
          </Revelar>
        </div>
      </section>

      {/* ───────────── projetos ───────────── */}
      <section id="projetos" className="scroll-mt-16 bg-muted py-20 lg:py-28">
        <div className="shell">
          <h2 className="text-title font-medium text-ink-deep">Projetos em destaque</h2>
          {!vazio && (
            <p className="mt-4 max-w-2xl leading-relaxed text-subtle">
              Os {projetos.length} sistemas mais relevantes entre {avaliados}, escolhidos pelo impacto, esforço e continuidade do trabalho. Cada um tem os detalhes completos.
            </p>
          )}

          {vazio && (
            <div className="mt-12">
              <RecorteVazio visibilidade={visibilidade} temVisibilidade={temVisibilidade} />
            </div>
          )}
          {principal && <CardProjeto p={principal} destaque temLinguagens={temLinguagens} />}
          {/* depois do destaque, sem card sobrando sozinho numa linha: 5 = 2 + 3, 3 = 3, o resto em duas colunas */}
          {(() => {
            const emTres = demais.length === 5 ? demais.slice(2) : demais.length === 3 ? demais : []
            const emDuas = demais.filter((p) => !emTres.includes(p))
            return (
              <>
                {emDuas.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {emDuas.map((p) => (
                      <CardProjeto key={p.repo} p={p} temLinguagens={temLinguagens} />
                    ))}
                  </div>
                )}
                {emTres.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {emTres.map((p) => (
                      <CardProjeto key={p.repo} p={p} compacto temLinguagens={temLinguagens} />
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          <details className="group mt-16 rounded-xl border border-line bg-paper">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-ink-deep [&::-webkit-details-marker]:hidden">
              <span className="font-medium">Como os projetos foram escolhidos</span>
              <span aria-hidden className="text-subtle transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-line px-6 py-6">
              <p className="max-w-2xl text-sm leading-relaxed text-subtle">
                Por regras, sem inteligência artificial. Cada critério é medido em relação ao repositório que mais se destacou nele, e a soma ponderada dá uma nota de 0 a 100.
              </p>
              <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {CRITERIOS.map((c) => (
                  <div key={c.id}>
                    <dt className="flex items-baseline gap-2 font-medium text-ink-deep">
                      {c.rotulo} <span className="font-mono text-xs text-accent">{c.peso} pts</span>
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-subtle">{c.descricao}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        </div>
      </section>
    </>
  )
}

/** Capa gerada dos próprios commits: as últimas 26 semanas, na cor da linguagem principal. */
function Capa({ p, destaque = false }: { p: Projeto; destaque?: boolean }) {
  const cor = corPrincipal(p)
  const { semanas, max } = p.capa
  return (
    <div className={`grain relative flex flex-col justify-between overflow-hidden bg-ink-deep p-6 text-paper sm:p-8 ${destaque ? 'min-h-72 lg:min-h-full' : 'min-h-56'}`}>
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-[90px]" style={{ background: cor }} />
      <p className="relative flex items-center justify-between gap-4 font-mono text-xs text-paper/55">
        <span className="truncate">{p.repo}</span>
        <span className="shrink-0">{periodoProjeto(p)}</span>
      </p>
      <div className="relative mt-8 flex gap-[3px]" role="img" aria-label={`${p.capa.diasAtivos} dias com commits nas últimas 26 semanas do projeto`}>
        {semanas.map((semana, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-[3px]">
            {semana.map((d, j) => (
              <span
                key={j}
                className="aspect-square rounded-[2px]"
                style={d && d.commits ? { background: cor, opacity: 0.3 + 0.7 * (d.commits / max) } : { background: 'rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function CardProjeto({ p, destaque = false, compacto = false, temLinguagens }: { p: Projeto; destaque?: boolean; compacto?: boolean; temLinguagens: boolean }) {
  return (
    <article className={`overflow-hidden rounded-xl border border-line bg-paper print:break-inside-avoid ${destaque ? 'mt-12 grid lg:grid-cols-2' : 'flex flex-col'}`}>
      <Capa p={p} destaque={destaque} />
      <div className={`flex flex-1 flex-col ${destaque ? 'p-8 lg:p-10' : 'p-6 sm:p-8'}`}>
        <span className={`self-start rounded-full px-2.5 py-1 text-xs font-medium ${p.criou ? 'bg-signal/10 text-signal' : 'bg-accent/10 text-accent'}`}>
          {p.criou ? 'Criado do zero' : 'Evolução de sistema'}
        </span>
        <h3 className={`mt-4 font-medium tracking-tight text-ink-deep ${destaque ? 'text-4xl' : 'text-2xl'}`}>{p.titulo}</h3>
        <p className="mt-3 leading-relaxed text-subtle">{p.chamada}</p>

        {p.vitrine.length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {p.vitrine.map((t) => (
              <li key={t} className="flex gap-3 text-[15px] leading-snug text-ink">
                <span aria-hidden className="font-mono text-signal">+</span>
                {t}
              </li>
            ))}
          </ul>
        )}

        {p.linguagens.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tecnologias">
            {p.linguagens.map((l) => (
              <li key={l.nome} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink">
                <span className="h-2 w-2 rounded-full" style={{ background: l.cor }} />
                {l.nome}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-8">
          <dl className={`flex ${compacto ? 'gap-5' : 'gap-7'}`}>
            {[
              { valor: p.numeros.entregas, rotulo: 'entregas' },
              { valor: p.mesesAtivos, rotulo: p.mesesAtivos === 1 ? 'mês' : 'meses' },
              { valor: p.numeros.altoImpacto, rotulo: 'alto impacto' },
            ].map((n) => (
              <div key={n.rotulo}>
                <dd className="font-mono text-2xl font-medium tracking-tight text-ink-deep">{numero(n.valor)}</dd>
                <dt className="mt-1 text-xs text-subtle">{n.rotulo}</dt>
              </div>
            ))}
          </dl>
          <DetalhesProjeto titulo={p.titulo}>
            <Detalhes p={p} temLinguagens={temLinguagens} />
          </DetalhesProjeto>
        </div>
      </div>
    </article>
  )
}

/** Tudo o que o card resume: aparece na janela "Ver detalhes". */
function Detalhes({ p, temLinguagens }: { p: Projeto; temLinguagens: boolean }) {
  const maxAtividade = Math.max(1, ...p.atividade)
  const numeros = [
    { rotulo: 'Entregas', valor: numero(p.numeros.entregas) },
    { rotulo: 'Chamados no Jira', valor: numero(p.numeros.chamados) },
    { rotulo: 'Alto impacto', valor: numero(p.numeros.altoImpacto) },
    { rotulo: 'Commits', valor: numero(p.numeros.commits) },
    { rotulo: 'Linhas adicionadas', valor: `+${numero(p.numeros.adicionadas)}`, classe: 'text-signal' },
    { rotulo: 'Linhas removidas', valor: `−${numero(p.numeros.removidas)}`, classe: 'text-removed' },
  ]
  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-xs text-subtle">
          {p.repo} · {periodoProjeto(p)}
        </p>
        <p className="mt-3 text-lg leading-relaxed text-ink">{p.resumo}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
        {numeros.map((n) => (
          <div key={n.rotulo}>
            <dt className="eyebrow text-subtle">{n.rotulo}</dt>
            <dd className={`mt-2 font-mono text-2xl font-medium tracking-tight tabular-nums ${n.classe ?? 'text-ink-deep'}`}>{n.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <h4 className="eyebrow text-subtle">Tipos de entrega</h4>
          <div className="mt-4">
            <BarraTipos porTipo={p.porTipo} />
          </div>
        </div>
        <div>
          <h4 className="eyebrow text-subtle">Tecnologias</h4>
          {p.linguagens.length ? (
            <ul className="mt-4 space-y-2">
              {p.linguagens.map((l) => (
                <li key={l.nome} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-[13px]">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.cor }} />
                    {l.nome}
                  </span>
                  <span className="h-1.5 rounded-full bg-line">
                    <span className="block h-full rounded-full" style={{ width: `${l.parte * 100}%`, background: l.cor }} />
                  </span>
                  <span className="text-right font-mono text-xs text-subtle">{Math.round(l.parte * 100)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-subtle">
              {temLinguagens ? 'O GitHub não identificou linguagens neste repositório.' : 'As linguagens aparecem depois da próxima atualização dos dados.'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <h4 className="eyebrow text-subtle">Atividade no período</h4>
          <div className="mt-4 flex h-14 items-end gap-[3px]" role="img" aria-label={`Commits por mês: ${p.atividade.join(', ')}`}>
            {p.atividade.map((v, i) => (
              <span key={i} className="flex-1 rounded-t-[2px]" style={{ height: v ? `${Math.max(8, (v / maxAtividade) * 100)}%` : '2px', background: v ? '#5b45e0' : '#e4e2ec' }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-subtle">Commits por mês.</p>
          {p.frentes.length > 0 && (
            <>
              <h4 className="eyebrow mt-8 text-subtle">Frentes</h4>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.frentes.map((f) => (
                  <li key={f.id} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink">
                    {f.rotulo} <span className="font-mono text-xs text-subtle">{f.demandas}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h4 className="flex items-baseline justify-between eyebrow text-subtle">
            Por que está aqui
            <span className="font-mono text-base text-ink-deep">
              {p.nota}
              <span className="text-xs text-subtle">/100</span>
            </span>
          </h4>
          <ul className="mt-4 space-y-2.5">
            {p.notas.map((c) => (
              <li key={c.id} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-[13px]">
                <span className="text-ink">{c.rotulo}</span>
                <span className="h-1.5 rounded-full bg-line">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${c.relativo * 100}%` }} />
                </span>
                <span className="text-right font-mono text-xs tabular-nums text-subtle">
                  {Math.round(c.pontos)}/{c.peso}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="eyebrow text-subtle">Entregas ({p.entregas.length})</h4>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {p.entregas.map((d) => (
            <li key={d.id}>
              <Link href={`/demandas/${d.slug}`} className="group flex flex-col gap-2 py-3.5 sm:flex-row sm:items-baseline sm:gap-5">
                <span className="w-24 shrink-0 font-mono text-xs text-subtle">{d.rotulo}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink-deep transition-colors group-hover:text-accent">{d.titulo}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-3">
                    <SeloTipo tipo={d.tipo} />
                    <SeloImpacto impacto={d.impacto} />
                    <span className="text-xs text-subtle">
                      {d.nCommits} commit{d.nCommits === 1 ? '' : 's'}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
