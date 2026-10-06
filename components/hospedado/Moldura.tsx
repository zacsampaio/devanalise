'use client'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Cabecalho } from '@/components/Cabecalho'
import { Rodape } from '@/components/Rodape'
import { painelDe, recortar } from '@/lib/dados'
import { esquecerColeta, useColeta } from './ProvedorColeta'

/** Cabeçalho e rodapé do modo hospedado: os dados vêm da coleta desta aba. */

/** Resultado da conexão com o Jira, que volta na URL (`/?jira=erro`). */
const MENSAGENS_JIRA: Record<string, string> = {
  erro: 'Não foi possível conectar o Jira. Tente de novo.',
  'sem-site': 'Sua conta Atlassian não tem nenhum site do Jira liberado para este app.',
}

function Conta() {
  const { usuario, jira, jiraDisponivel } = useColeta()
  const mensagem = MENSAGENS_JIRA[useSearchParams().get('jira') ?? ''] ?? null

  return (
    // com mensagem do Jira, o menu já abre mostrando o que aconteceu
    <details className="group relative" open={mensagem ? true : undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 p-0.5 pr-2.5 text-xs text-paper/70 hover:border-white/25 [&::-webkit-details-marker]:hidden">
        <Image src={usuario.avatar} alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${jira ? 'bg-signal' : 'bg-white/25'}`} />
        <span className="sr-only">Conta de {usuario.login}</span>
      </summary>
      <div className="absolute right-0 top-11 w-72 rounded-lg border border-white/10 bg-ink-deep p-4 text-sm text-paper shadow-2xl">
        <p className="font-medium">{usuario.nome}</p>
        <p className="font-mono text-xs text-paper/55">@{usuario.login}</p>

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="eyebrow text-paper/50">Jira</p>
          {jira ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-paper/80" title={jira.url}>
                {jira.site}
              </span>
              <form method="post" action="/api/auth/sair?so=jira">
                <button type="submit" className="text-xs text-paper/55 underline-offset-4 hover:text-paper hover:underline">
                  Desconectar
                </button>
              </form>
            </div>
          ) : jiraDisponivel ? (
            <a href="/api/auth/atlassian" className="mt-2 inline-block rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink-deep hover:bg-white">
              Conectar Jira
            </a>
          ) : (
            <p className="mt-2 text-xs text-paper/55">Não disponível neste painel.</p>
          )}
          {mensagem && <p className="mt-2 text-xs text-[#eda100]">{mensagem}</p>}
        </div>

        <form method="post" action="/api/auth/sair" onSubmit={esquecerColeta} className="mt-4 border-t border-white/10 pt-4">
          <button type="submit" className="w-full rounded-full border border-white/15 px-3 py-2 text-xs text-paper/80 hover:border-white/30 hover:text-paper">
            Sair
          </button>
          <p className="mt-2 text-[11px] leading-snug text-paper/45">Sair apaga o login e os dados desta aba. Nada fica guardado no servidor.</p>
        </form>
      </div>
    </details>
  )
}

export function CabecalhoNoNavegador() {
  const { base, atualizar, usuario } = useColeta()
  return (
    <Cabecalho
      atualizadoEm={base.geradoEm}
      aoVivo={base.fonte === 'github'}
      usuario={`@${usuario.login}`}
      progresso={base.progresso}
      aoAtualizar={atualizar}
      conta={<Conta />}
    />
  )
}

export function RodapeNoNavegador() {
  const { base, versao } = useColeta()
  return <Rodape dados={painelDe(recortar(base, 'todos', versao))} />
}
