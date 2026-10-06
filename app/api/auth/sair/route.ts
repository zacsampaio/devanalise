import { NextResponse, type NextRequest } from 'next/server'
import { modoHospedado } from '@/lib/modo'
import { revogarTokenGithub } from '@/lib/oauth'
import { abrir, COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES, COOKIE_OAUTH, type SessaoGithub } from '@/lib/sessao'

/**
 * Sair: revoga o token do GitHub (o do OAuth App não vence sozinho) e apaga
 * os cookies da sessão — o servidor não guarda mais nada. `?so=jira`
 * desconecta só o Jira.
 */
export async function POST(pedido: NextRequest) {
  const soJira = pedido.nextUrl.searchParams.get('so') === 'jira'
  if (!soJira && modoHospedado()) {
    const sessao = abrir<SessaoGithub>(COOKIE_GITHUB, pedido.cookies.get(COOKIE_GITHUB)?.value)
    if (sessao) await revogarTokenGithub(sessao.token)
  }
  const resposta = NextResponse.redirect(new URL(soJira ? '/' : '/entrar', pedido.nextUrl.origin), 303)
  const nomes = soJira ? [COOKIE_JIRA, COOKIE_JIRA_SITES] : [COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES, COOKIE_OAUTH]
  for (const nome of nomes) resposta.cookies.delete(nome)
  return resposta
}
