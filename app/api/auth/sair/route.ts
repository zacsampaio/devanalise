import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES, COOKIE_OAUTH } from '@/lib/sessao'

/**
 * Sair: apaga os cookies da sessão — e é só isso, porque o servidor não
 * guarda mais nada. `?so=jira` desconecta só o Jira.
 */
export function POST(pedido: NextRequest) {
  const soJira = pedido.nextUrl.searchParams.get('so') === 'jira'
  const resposta = NextResponse.redirect(new URL(soJira ? '/' : '/entrar', pedido.nextUrl.origin), 303)
  const nomes = soJira ? [COOKIE_JIRA, COOKIE_JIRA_SITES] : [COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES, COOKIE_OAUTH]
  for (const nome of nomes) resposta.cookies.delete(nome)
  return resposta
}
