import { NextResponse, type NextRequest } from 'next/server'
import { origemPublica, sitesAtlassian, trocarCodigoAtlassian } from '@/lib/oauth'
import { conferirVolta, paraInicio } from '@/lib/rotasAuth'
import { COOKIE_JIRA, COOKIE_JIRA_SITES, COOKIE_OAUTH, DURACAO_JIRA, opcoesCookie, selar, type SessaoJira, type SitesPendentes } from '@/lib/sessao'

/**
 * Volta da Atlassian. Um site: conecta direto. Vários: guarda os tokens por
 * 10 minutos (cookie criptografado) e manda a pessoa escolher em /conectar-jira.
 */
export async function GET(pedido: NextRequest) {
  const volta = conferirVolta(pedido, 'atlassian')
  if ('erro' in volta) return paraInicio(pedido, 'erro')
  try {
    const tokens = await trocarCodigoAtlassian(origemPublica(pedido), volta.code)
    const sites = await sitesAtlassian(tokens.access)
    if (!sites.length) return paraInicio(pedido, 'sem-site')

    const resposta = sites.length === 1 ? paraInicio(pedido) : NextResponse.redirect(new URL('/conectar-jira', pedido.nextUrl.origin), 303)
    if (sites.length === 1) {
      resposta.cookies.set(COOKIE_JIRA, selar(COOKIE_JIRA, { ...tokens, exp: Date.now() + DURACAO_JIRA * 1000, site: sites[0] } satisfies SessaoJira), opcoesCookie(DURACAO_JIRA))
    } else {
      const pendentes: SitesPendentes = { ...tokens, sites, exp: Date.now() + 600_000 }
      resposta.cookies.set(COOKIE_JIRA_SITES, selar(COOKIE_JIRA_SITES, pendentes), opcoesCookie(600))
    }
    resposta.cookies.delete(COOKIE_OAUTH)
    return resposta
  } catch (erro) {
    console.error('[painel] conexão com o Jira falhou:', erro instanceof Error ? erro.message : erro)
    return paraInicio(pedido, 'erro')
  }
}
