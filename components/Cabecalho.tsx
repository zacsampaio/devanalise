'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { atualizarAgora } from '@/app/acoes'
import { Logotipo } from './Estrutura'

const LINKS = [
  { href: '/', rotulo: 'Início' },
  { href: '/dashboard', rotulo: 'Dashboard' },
  { href: '/demandas', rotulo: 'Demandas' },
  { href: '/sistemas', rotulo: 'Sistemas' },
  { href: '/portfolio', rotulo: 'Portfólio' },
]

type Progresso = { feitos: number; total: number } | null

/**
 * `aoAtualizar` e `conta`: modo hospedado. A coleta roda no navegador, então
 * "atualizar" é local (sem Server Action nem refresh periódico) e o menu da
 * conta (Jira, sair) aparece ao lado.
 */
export function Cabecalho({
  atualizadoEm,
  aoVivo,
  usuario,
  progresso,
  aoAtualizar,
  conta,
}: {
  atualizadoEm: string
  aoVivo: boolean
  usuario: string | null
  progresso: Progresso
  aoAtualizar?: () => void
  conta?: ReactNode
}) {
  const caminho = usePathname()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [atualizando, iniciar] = useTransition()
  const [espera, setEspera] = useState<number | null>(null)

  const atualizar = () =>
    aoAtualizar ? aoAtualizar() : iniciar(async () => {
      const r = await atualizarAgora()
      setEspera(r.ok ? null : (r.aguardarSegundos ?? null))
      router.refresh()
    })

  // coleta em segundo plano: a página se atualiza sozinha até ela terminar
  const coletando = progresso !== null
  const local = !aoAtualizar
  useEffect(() => {
    if (!coletando || !local) return
    const id = setInterval(() => router.refresh(), 5_000)
    return () => clearInterval(id)
  }, [coletando, local, router])

  const quando = new Date(atualizadoEm)
  const rotuloHora = quando.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href))

  return (
    <header className="no-print fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-ink-deep/95 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-4" onClick={() => setAberto(false)}>
          <Logotipo />
          <span className="hidden h-5 w-px bg-white/15 sm:block" />
          <span className="eyebrow hidden text-paper/60 sm:block">{usuario ?? 'GitHub + Jira'}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={ativo(l.href) ? 'page' : undefined}
              className={`relative rounded-full px-4 py-2 text-[13px] transition-colors ${
                ativo(l.href) ? 'bg-white/10 text-paper' : 'text-paper/65 hover:text-paper'
              }`}
            >
              {l.rotulo}
              {ativo(l.href) && <span className="absolute inset-x-4 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-accent-light to-signal-light" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={atualizar}
            disabled={atualizando || coletando}
            title={
              espera
                ? `Atualização recente: tente de novo em ${espera} s.`
                : aoVivo
                  ? `Lido do GitHub em ${rotuloHora}. Clique para buscar agora.`
                  : 'GitHub indisponível: mostrando a última coleta salva. Clique para tentar de novo.'
            }
            className="group hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-paper/70 transition-colors hover:border-white/25 hover:text-paper disabled:opacity-60 sm:flex"
          >
            <span className="relative flex h-2 w-2">
              {(aoVivo || coletando) && <span className="pulse-glow absolute inset-0 rounded-full bg-signal/60" />}
              <span className={`relative h-2 w-2 rounded-full ${aoVivo || coletando ? 'bg-signal' : 'bg-[#eda100]'}`} />
            </span>
            {progresso ? `Coletando · ${progresso.feitos}/${progresso.total} repositórios` : atualizando ? 'Atualizando…' : espera ? `Aguarde ${espera} s` : aoVivo ? `Ao vivo · ${rotuloHora}` : `Arquivo local · ${quando.toLocaleDateString('pt-BR')}`}
            <span aria-hidden className={`text-paper/50 transition-transform group-hover:text-paper ${atualizando ? 'animate-spin' : 'group-hover:rotate-90'}`}>↻</span>
          </button>
          {conta}
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-label="Menu"
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md border border-white/15 md:hidden"
          >
            <span className={`h-px w-4 bg-paper transition-transform ${aberto ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`h-px w-4 bg-paper transition-transform ${aberto ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {aberto && (
        <nav className="shell flex flex-col gap-1 border-t border-white/8 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`rounded-md px-3 py-3 text-sm ${ativo(l.href) ? 'bg-white/10 text-paper' : 'text-paper/70'}`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
