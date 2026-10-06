'use client'

import Link from 'next/link'
import type { CommitDetalhe } from '@/lib/dados'
import { BarraLista, SentinelaRolagem, useRolagemInfinita } from './RolagemInfinita'

const numero = (n: number) => n.toLocaleString('pt-BR')

/** Link para o commit no GitHub (a URL vem da API; só https do github.com é aceita). */
function LinkCommit({ url, hash }: { url: string; hash: string }) {
  if (!url.startsWith('https://github.com/')) return <span className="font-mono">{hash}</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-accent hover:underline">
      {hash}
    </a>
  )
}

/** Linha do tempo dos commits de uma demanda (do mais antigo ao mais recente). */
export function LinhaTempoCommits({ commits, mostrarRepo }: { commits: CommitDetalhe[]; mostrarRepo: boolean }) {
  const { limite, temMais, carregarMais } = useRolagemInfinita(commits.length, 'linha-do-tempo')

  return (
    <div className="mt-8">
      <BarraLista contagem={`${commits.length} commit${commits.length !== 1 ? 's' : ''}`} />
      <ol className="relative mt-8 border-l border-line pl-8">
        {commits.slice(0, limite).map((c) => (
          <li key={`${c.repo}-${c.hash}`} className="relative pb-10 last:pb-0">
            <span className="absolute -left-[39px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent ring-4 ring-paper">
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
            </span>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
              <time dateTime={c.data}>
                {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às{' '}
                {new Date(c.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </time>
              <span>·</span>
              <LinkCommit url={c.url} hash={c.hash} />
              {mostrarRepo && (
                <>
                  <span>·</span>
                  <span>{c.repo}</span>
                </>
              )}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-deep">{c.assunto}</p>
            {c.corpo && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-subtle">{c.corpo}</p>}
            <p className="mt-3 flex gap-4 text-xs tabular-nums text-subtle">
              <span>
                {c.arquivos} arquivo{c.arquivos !== 1 ? 's' : ''}
              </span>
              <span className="text-signal">+{numero(c.adicionadas)}</span>
              <span className="text-removed">−{numero(c.removidas)}</span>
            </p>
          </li>
        ))}
      </ol>
      <SentinelaRolagem temMais={temMais} aoAparecer={carregarMais} restantes={commits.length - limite} />
    </div>
  )
}

export type CommitFeed = { hash: string; data: string; assunto: string; url: string; sistema: string; demanda: { slug: string; rotulo: string } | null }

/** Feed dos commits mais recentes (Dashboard). */
export function FeedCommits({ commits }: { commits: CommitFeed[] }) {
  const { limite, temMais, carregarMais } = useRolagemInfinita(commits.length, 'feed')

  return (
    <div>
      <BarraLista contagem={`${commits.length} commits recentes`} />
      <ul className="mt-4 divide-y divide-line">
        {commits.slice(0, limite).map((c) => (
          <li key={`${c.hash}-${c.sistema}`} className="grid items-center gap-x-4 gap-y-1 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="truncate text-ink-deep" title={c.assunto}>
                {c.assunto}
              </p>
              <p className="mt-0.5 text-xs text-subtle">
                {c.sistema} · <LinkCommit url={c.url} hash={c.hash} />
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-subtle md:justify-end">
              {c.demanda && (
                <Link href={`/demandas/${c.demanda.slug}`} className="rounded-full bg-muted px-2.5 py-1 font-medium text-accent hover:bg-accent hover:text-paper">
                  {c.demanda.rotulo}
                </Link>
              )}
              <time dateTime={c.data} className="tabular-nums">
                {new Date(c.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          </li>
        ))}
      </ul>
      <SentinelaRolagem temMais={temMais} aoAparecer={carregarMais} restantes={commits.length - limite} />
      {!commits.length && <p className="py-10 text-center text-sm text-subtle">Nenhum commit no período.</p>}
    </div>
  )
}
