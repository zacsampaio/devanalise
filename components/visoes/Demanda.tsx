/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LinhaDemanda } from '@/components/Cartoes'
import { HeroPagina, LinkSeta } from '@/components/Estrutura'
import { LinhaTempoCommits } from '@/components/ListasCommits'
import { Revelar } from '@/components/Revelar'
import { dataLonga, SeloAutomatica, SeloImpacto, SeloStatusJira, SeloTipo } from '@/components/Selos'
import { TIPOS } from '@/lib/config'
import { slugRepo, type demandaDe } from '@/lib/dados'

const numero = (n: number) => n.toLocaleString('pt-BR')

const LIMITE_LINHA_DO_TEMPO = 300

export type DadosDemanda = NonNullable<ReturnType<typeof demandaDe>>

/** Título da aba: "ABC-12 · título" (ou só o título, sem chamado). */
export const tituloDemanda = (dados: DadosDemanda | null) =>
  dados ? `${dados.demanda.rotulo === 'Sem chamado' ? '' : `${dados.demanda.rotulo} · `}${dados.demanda.titulo}` : 'Demanda'

/** Arquivos mais alterados: vêm da API do GitHub, então chegam depois do resto da página. */
export function ListaArquivos({ arquivos }: { arquivos: string[] }) {
  if (!arquivos.length) return null
  return (
    <div className="rounded-lg border border-line p-6">
      <p className="eyebrow text-ink">Arquivos mais alterados</p>
      <ul className="mt-5 space-y-2.5">
        {arquivos.map((a) => {
          const partes = a.split('/')
          return (
            <li key={a} className="text-[13px] leading-snug" title={a}>
              <span className="font-medium text-ink-deep">{partes.at(-1)}</span>
              {partes.length > 1 && <span className="block truncate text-xs text-subtle">{partes.slice(0, -1).join('/')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Enquanto os arquivos mais alterados não chegam. */
export const EsperaArquivos = () => <div className="h-40 animate-pulse rounded-lg border border-line bg-muted/50" />

/** `arquivos`: a lista de arquivos mais alterados (chega depois: Suspense no servidor, busca no navegador). */
export function VisaoDemanda({ dados, arquivos }: { dados: DadosDemanda; arquivos: ReactNode }) {
  const { demanda: d, commits, adicionadas, removidas, arquivosTocados, relacionadas, anterior, proxima } = dados
  const total = commits.length
  const dias = Math.max(1, Math.round((+new Date(d.fim) - +new Date(d.inicio)) / 86_400_000) + 1)
  // a linha do tempo vai para o navegador: em demandas enormes, só os commits mais recentes
  const cronologico = commits.slice(0, LIMITE_LINHA_DO_TEMPO).reverse()

  return (
    <>
      <HeroPagina
        trilha={[
          { href: '/', rotulo: 'Início' },
          { href: '/demandas', rotulo: 'Demandas' },
        ]}
        eyebrow={
          <>
            <span>{d.rotulo}</span>
            <span className="normal-case tracking-normal">
              <SeloTipo tipo={d.tipo} escuro />
            </span>
            <span className="normal-case tracking-normal">
              <SeloImpacto impacto={d.impacto} escuro />
            </span>
            {d.jira && (
              <span className="normal-case tracking-normal">
                <SeloStatusJira jira={d.jira} escuro />
              </span>
            )}
            {d.automatica && (
              <span className="normal-case tracking-normal">
                <SeloAutomatica escuro />
              </span>
            )}
          </>
        }
        titulo={d.titulo}
      >
        <Revelar delay={140}>
          <div className="mt-8 max-w-3xl border-l-2 pl-6" style={{ borderColor: TIPOS[d.tipo].cor }}>
            <p className="eyebrow text-paper/55">Resumo dos commits</p>
            <p className="mt-3 text-xl leading-relaxed text-paper/90">{d.resumo}</p>
          </div>
        </Revelar>

        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-10 lg:grid-cols-5">
          <Revelar delay={100} className="col-span-2 lg:col-span-1">
            <dt className="eyebrow text-paper/55">Chamado</dt>
            <dd className="mt-4 space-y-1 text-[15px]">
              {d.jira ? (
                <>
                  <a href={d.jira.url} target="_blank" rel="noopener noreferrer" className="block hover:text-signal-light">
                    {d.rotulo} no Jira ↗
                  </a>
                  <span className="block text-sm text-paper/50">
                    {d.jira.tipo}
                    {d.jira.prioridade && <> · {d.jira.prioridade}</>}
                  </span>
                </>
              ) : (
                <span className="text-paper/60">{d.rotulo === 'Sem chamado' ? 'Commits sem chamado' : `${d.rotulo} (não consultado no Jira)`}</span>
              )}
            </dd>
          </Revelar>
          <Revelar delay={160}>
            <dt className="eyebrow text-paper/55">Período</dt>
            <dd className="mt-4 text-[15px] leading-relaxed">
              {dataLonga(d.inicio)}
              {dias > 1 && <><br />a {dataLonga(d.fim)}</>}
              <span className="mt-1 block text-sm text-paper/50">{dias} dia{dias > 1 ? 's' : ''}</span>
            </dd>
          </Revelar>
          <Revelar delay={220}>
            <dt className="eyebrow text-paper/55">Sistema{d.repos.length > 1 ? 's' : ''}</dt>
            <dd className="mt-4 space-y-1.5 text-[15px]">
              {d.repos.map((r, i) => (
                <Link key={r} href={`/sistemas/${slugRepo(r)}`} className="block hover:text-signal-light">
                  {d.sistemas[i]} →
                </Link>
              ))}
            </dd>
          </Revelar>
          <Revelar delay={280}>
            <dt className="eyebrow text-paper/55">Commits</dt>
            <dd className="mt-3 text-[2.6rem] font-medium leading-none tracking-[-0.04em] tabular-nums">{total}</dd>
            <p className="mt-2 text-sm text-paper/50">{numero(arquivosTocados)} alterações em arquivos</p>
          </Revelar>
          <Revelar delay={340}>
            <dt className="eyebrow text-paper/55">Linhas de código</dt>
            <dd className="mt-3 text-2xl font-medium tabular-nums tracking-tight">
              <span className="text-signal-light">+{numero(adicionadas)}</span> <span className="text-paper/45">−{numero(removidas)}</span>
            </dd>
            <p className="mt-2 text-sm text-paper/50">inclui arquivos gerados</p>
          </Revelar>
        </dl>
      </HeroPagina>

      <section className="py-20 lg:py-24">
        <div className="shell grid grid-cols-1 gap-14 lg:grid-cols-12">
          {/* linha do tempo */}
          <div className="lg:col-span-8">
            <p className="eyebrow flex items-center gap-3 text-accent">
              <span aria-hidden className="h-px w-8 bg-accent/50" />
              Linha do tempo · {total} commit{total > 1 ? 's' : ''}
            </p>
            {total > LIMITE_LINHA_DO_TEMPO && <p className="mt-3 text-sm text-subtle">Mostrando os {LIMITE_LINHA_DO_TEMPO} commits mais recentes.</p>}
            <LinhaTempoCommits commits={cronologico} mostrarRepo={d.repos.length > 1} />
          </div>

          {/* lateral */}
          <aside className="space-y-10 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
            {arquivos}

            <div className="rounded-lg bg-muted p-6">
              <p className="eyebrow text-ink">Tipo de entrega</p>
              <p className="mt-4 flex items-center gap-2 font-medium text-ink-deep">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIPOS[d.tipo].cor }} />
                {TIPOS[d.tipo].rotulo}
              </p>
              <p className="mt-1 text-sm text-subtle">{TIPOS[d.tipo].descricao}.</p>
              <LinkSeta href={`/demandas?tipo=${d.tipo}`} className="mt-5">
                Outras do mesmo tipo
              </LinkSeta>
            </div>
          </aside>
        </div>
      </section>

      {relacionadas.length > 0 && (
        <section className="bg-muted py-20 lg:py-24">
          <div className="shell">
            <p className="eyebrow flex items-center gap-3 text-accent">
              <span aria-hidden className="h-px w-8 bg-accent/50" />
              Mais em {d.sistemas[0]}
            </p>
            <ul className="mt-8 divide-y divide-line border-y border-line bg-paper">
              {relacionadas.map((r) => (
                <li key={r.id}>
                  <LinhaDemanda d={r} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* navegação entre demandas, em ordem cronológica */}
      <nav className="border-t border-line">
        <div className="shell grid grid-cols-1 sm:grid-cols-2">
          {anterior ? (
            <Link href={`/demandas/${anterior.slug}`} className="group border-line py-10 sm:border-r sm:pr-8">
              <span className="eyebrow text-subtle">← Anterior</span>
              <span className="mt-3 block text-lg font-medium leading-snug text-ink-deep group-hover:text-accent">{anterior.titulo}</span>
              <span className="mt-1 block text-xs text-subtle">{anterior.rotulo}</span>
            </Link>
          ) : (
            <span />
          )}
          {proxima && (
            <Link href={`/demandas/${proxima.slug}`} className="group border-t border-line py-10 text-right sm:border-t-0 sm:pl-8">
              <span className="eyebrow text-subtle">Próxima →</span>
              <span className="mt-3 block text-lg font-medium leading-snug text-ink-deep group-hover:text-accent">{proxima.titulo}</span>
              <span className="mt-1 block text-xs text-subtle">{proxima.rotulo}</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
