import { NextResponse, type NextRequest } from 'next/server'
import { credencialJiraOAuth, type CredencialJira } from './jira'
import { modoHospedado } from './modo'
import { renovarJira } from './oauth'
import { abrir, COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES, DURACAO_JIRA, opcoesCookie, precisaRenovar, selar, type SessaoGithub, type SessaoJira } from './sessao'

/**
 * Sessão de quem fez o pedido às rotas /api/coleta (modo hospedado). Cada
 * rota só fala com o GitHub/Jira com o token da própria pessoa e devolve a
 * resposta — nada fica no servidor.
 */

export const json = (dados: unknown, status = 200) => NextResponse.json(dados, { status, headers: { 'Cache-Control': 'no-store' } })

/** Resposta de erro; `sessao` faz o navegador voltar para /entrar. */
export const erro = (mensagem: string, status: number, codigo?: 'sessao') => json({ erro: mensagem, codigo }, status)

export function sessaoGithub(pedido: NextRequest): SessaoGithub | null {
  if (!modoHospedado()) return null
  return abrir<SessaoGithub>(COOKIE_GITHUB, pedido.cookies.get(COOKIE_GITHUB)?.value)
}

/**
 * Manda a pessoa entrar de novo e apaga a sessão. Quando o GitHub recusa o
 * token (revogado), o cookie ainda abre: sem apagá-lo, o proxy devolveria
 * /entrar para o início, que coleta, recebe 401 e volta a /entrar — em laço.
 */
export function semSessao() {
  const resposta = erro('Sessão expirada: entre de novo com o GitHub.', 401, 'sessao')
  for (const nome of [COOKIE_GITHUB, COOKIE_JIRA, COOKIE_JIRA_SITES]) resposta.cookies.delete(nome)
  return resposta
}

/** Erro de token recusado pelo GitHub (revogado, expirado): a pessoa entra de novo. */
export const tokenRecusado = (e: unknown) => Boolean((e as { naoAutorizado?: boolean } | null)?.naoAutorizado)

/**
 * Credencial do Jira da pessoa, renovando o token de acesso se estiver para
 * vencer. `gravar` põe o cookie novo na resposta: o refresh token da
 * Atlassian muda a cada renovação, e o antigo deixa de valer.
 */
export async function jiraDoPedido(pedido: NextRequest): Promise<{ credencial: CredencialJira; gravar: (r: NextResponse) => NextResponse } | null> {
  let sessao = abrir<SessaoJira>(COOKIE_JIRA, pedido.cookies.get(COOKIE_JIRA)?.value)
  if (!sessao) return null
  let renovada = false
  if (precisaRenovar(sessao)) {
    try {
      sessao = await renovarJira(sessao)
      renovada = true
    } catch (e) {
      console.error('[painel] renovação do Jira falhou:', e instanceof Error ? e.message : e)
      return null
    }
  }
  const s = sessao
  return {
    credencial: credencialJiraOAuth(s.site.id, s.site.url, s.access),
    gravar: (r) => {
      if (renovada) r.cookies.set(COOKIE_JIRA, selar(COOKIE_JIRA, s), opcoesCookie((s.exp - Date.now()) / 1000 || DURACAO_JIRA))
      return r
    },
  }
}

/** Corpo JSON do pedido, ou null se não for um objeto. */
export async function corpo(pedido: NextRequest): Promise<Record<string, unknown> | null> {
  const dados = await pedido.json().catch(() => null)
  return dados && typeof dados === 'object' && !Array.isArray(dados) ? (dados as Record<string, unknown>) : null
}
