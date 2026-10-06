import { NextResponse, type NextRequest } from 'next/server'
import { obterUsuario } from '@/lib/github'
import { origemPublica, trocarCodigoGithub } from '@/lib/oauth'
import { conferirVolta, paraEntrar } from '@/lib/rotasAuth'
import { COOKIE_GITHUB, COOKIE_JIRA, COOKIE_OAUTH, DURACAO_GITHUB, opcoesCookie, selar, type SessaoGithub } from '@/lib/sessao'

/** Volta do GitHub: troca o código pelo token e abre a sessão (cookie de até 8 h). */
export async function GET(pedido: NextRequest) {
  const volta = conferirVolta(pedido, 'github')
  if ('erro' in volta) return paraEntrar(pedido, volta.erro)
  try {
    const { token, expiraEm } = await trocarCodigoGithub(origemPublica(pedido), volta.code)
    const usuario = await obterUsuario(token)
    // nunca além do próprio token; sem validade informada (app sem expiração), 8 h
    const exp = Math.min(expiraEm ?? Infinity, Date.now() + DURACAO_GITHUB * 1000)
    const resposta = NextResponse.redirect(new URL('/', pedido.nextUrl.origin), 303)
    resposta.cookies.set(COOKIE_GITHUB, selar(COOKIE_GITHUB, { token, exp, usuario } satisfies SessaoGithub), opcoesCookie((exp - Date.now()) / 1000))
    // outra conta do GitHub não herda o Jira de quem entrou antes neste navegador
    resposta.cookies.delete(COOKIE_JIRA)
    resposta.cookies.delete(COOKIE_OAUTH)
    return resposta
  } catch (erro) {
    console.error('[painel] login do GitHub falhou:', erro instanceof Error ? erro.message : erro)
    return paraEntrar(pedido, 'github')
  }
}
