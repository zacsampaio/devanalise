import Link from 'next/link'
import type { ReactNode } from 'react'
import { Revelar } from './Revelar'

/** Marca do painel: um "‹›" (código) sobre o gradiente violeta → verde do diff. */
export function Logotipo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" aria-hidden className="h-7 w-7">
        <defs>
          <linearGradient id="marca" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a99bff" />
            <stop offset="1" stopColor="#4fe0a8" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#marca)" />
        <path d="M13 10l-6 6 6 6M19 10l6 6-6 6" fill="none" stroke="#0e0c16" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-[1.1rem] font-bold leading-none tracking-[-0.04em] text-paper">entregas</span>
    </span>
  )
}

/**
 * Painel sem dados: explica o motivo e o que fazer. `hospedado`: a pessoa
 * entrou com o GitHub (não há .env a configurar).
 */
export function EstadoVazio({ aviso, progresso, hospedado = false }: { aviso?: string; progresso?: { feitos: number; total: number } | null; hospedado?: boolean }) {
  if (progresso) {
    return (
      <section className="py-24 lg:py-32">
        <div className="shell max-w-3xl">
          <p className="eyebrow text-accent">{hospedado ? 'Coleta em andamento' : 'Primeira coleta em andamento'}</p>
          <h2 className="mt-5 text-title font-medium text-ink-deep">Lendo seus commits no GitHub…</h2>
          <p className="mt-6 text-base leading-relaxed text-subtle">
            {progresso.total ? `${progresso.feitos} de ${progresso.total} repositórios lidos.` : 'Listando os repositórios.'} A página se atualiza sozinha e os
            dados aparecem assim que os primeiros repositórios forem lidos.{' '}
            {hospedado ? 'Nada é guardado no servidor: a coleta fica só nesta aba e some quando você sai.' : 'Depois desta carga, as atualizações só leem o que mudou.'}
          </p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${progresso.total ? Math.max(4, (progresso.feitos / progresso.total) * 100) : 4}%` }} />
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="py-24 lg:py-32">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-accent">Nenhum commit encontrado</p>
        <h2 className="mt-5 text-title font-medium text-ink-deep">Ainda não há dados para mostrar.</h2>
        {aviso && <p className="mt-6 rounded-md border border-line bg-muted px-4 py-3 font-mono text-sm text-ink">{aviso}</p>}
        {hospedado ? (
          <ol className="mt-8 list-decimal space-y-3 pl-5 text-base leading-relaxed text-subtle">
            <li>
              Organizações que restringem apps de terceiros precisam <b className="font-medium text-ink">aprovar</b> o painel. No GitHub, abra <b className="font-medium text-ink">Settings → Applications → Authorized OAuth Apps</b>, entre no painel e peça acesso (Request) à organização; um owner aprova.
            </li>
            <li>Para o commit contar como seu, o e-mail do git precisa estar verificado na sua conta do GitHub.</li>
            <li>Commits com mais de 12 meses ficam de fora.</li>
          </ol>
        ) : (
        <ol className="mt-8 list-decimal space-y-3 pl-5 text-base leading-relaxed text-subtle">
          <li>
            Crie um token no GitHub com leitura dos repositórios e coloque em <code className="font-mono text-ink">GITHUB_TOKEN</code> no arquivo <code className="font-mono text-ink">.env</code>.
          </li>
          <li>
            Opcional: preencha <code className="font-mono text-ink">JIRA_URL</code>, <code className="font-mono text-ink">JIRA_EMAIL</code> e <code className="font-mono text-ink">JIRA_API_TOKEN</code> para trazer título, tipo e status dos chamados.
          </li>
          <li>
            Confira o acesso com <code className="font-mono text-ink">npm run testar</code> e recarregue a página.
          </li>
        </ol>
        )}
      </div>
    </section>
  )
}

export function CabecalhoSecao({ eyebrow, titulo, texto, escuro = false, acao }: { eyebrow: string; titulo: ReactNode; texto?: string; escuro?: boolean; acao?: { href: string; rotulo: string } }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <Revelar>
          <p className={`eyebrow flex items-center gap-3 ${escuro ? 'text-accent-light' : 'text-accent'}`}>
            <span aria-hidden className={`h-px w-8 ${escuro ? 'bg-accent-light/60' : 'bg-accent/50'}`} />
            {eyebrow}
          </p>
        </Revelar>
        <Revelar delay={70}>
          <h2 className={`mt-5 text-title font-medium ${escuro ? 'text-paper' : 'text-ink-deep'}`}>{titulo}</h2>
        </Revelar>
      </div>
      {(texto || acao) && (
        <Revelar delay={120} className="lg:col-span-4 lg:col-start-9">
          {texto && <p className={`text-base leading-relaxed ${escuro ? 'text-paper/70' : 'text-subtle'}`}>{texto}</p>}
          {acao && <LinkSeta href={acao.href} escuro={escuro} className="mt-4">{acao.rotulo}</LinkSeta>}
        </Revelar>
      )}
    </div>
  )
}

export function LinkSeta({ href, children, escuro = false, className = '' }: { href: string; children: ReactNode; escuro?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] ${escuro ? 'text-paper' : 'text-ink-deep'} ${className}`}
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-flow group-hover:bg-[length:100%_1px]">
        {children}
      </span>
      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </Link>
  )
}

/** Topo escuro das páginas internas: trilha, título e um espaço para números. */
export function HeroPagina({
  trilha,
  eyebrow,
  titulo,
  texto,
  children,
}: {
  trilha?: { href: string; rotulo: string }[]
  eyebrow: ReactNode
  titulo: ReactNode
  texto?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="grain relative overflow-hidden bg-ink-deep pb-14 pt-28 text-paper lg:pb-16 lg:pt-32" style={{ backgroundColor: '#0e0c16' }}>
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute -left-40 bottom-0 h-[20rem] w-[24rem] rounded-full bg-signal/12 blur-[120px]" />
      <div className="shell relative">
        {trilha && (
          <nav aria-label="Trilha" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-paper/50">
            {trilha.map((t) => (
              <span key={t.href} className="flex items-center gap-2">
                <Link href={t.href} className="transition-colors hover:text-paper">{t.rotulo}</Link>
                <span aria-hidden>/</span>
              </span>
            ))}
          </nav>
        )}
        <Revelar>
          <div className="eyebrow flex flex-wrap items-center gap-3 text-accent-light">
            <span aria-hidden className="h-px w-8 bg-accent-light/60" />
            {eyebrow}
          </div>
        </Revelar>
        <Revelar delay={70}>
          <h1 className="mt-6 max-w-4xl text-[clamp(2.1rem,4.6vw,3.9rem)] font-medium leading-[1.02] tracking-[-0.035em]">{titulo}</h1>
        </Revelar>
        {texto && (
          <Revelar delay={130}>
            <div className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/70">{texto}</div>
          </Revelar>
        )}
        {children}
      </div>
    </section>
  )
}

/** Faixa de números grandes, usada nos heróis. */
export function FaixaNumeros({ itens, children }: { itens?: { valor: ReactNode; rotulo: string; nota?: string }[]; children?: ReactNode }) {
  return (
    <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-3 lg:grid-cols-5">
      {itens?.map((n, i) => (
        <Revelar key={n.rotulo} delay={100 + i * 70}>
          <dt className="eyebrow text-paper/55">{n.rotulo}</dt>
          <dd className="mt-4 text-figure font-medium text-paper">{n.valor}</dd>
          {n.nota && <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-paper/55">{n.nota}</p>}
        </Revelar>
      ))}
      {children}
    </dl>
  )
}
