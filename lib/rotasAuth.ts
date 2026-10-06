import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { modoHospedado } from './modo'
import { abrir, COOKIE_OAUTH, opcoesCookie, selar, type EstadoOAuth } from './sessao'

/** Peças comuns das rotas /api/auth/*: começo e volta do OAuth com state anti-CSRF. */

/** Volta para /entrar com um código de erro (a página traduz). */
export const paraEntrar = (pedido: NextRequest, erro?: string) => {
  const url = new URL('/entrar', pedido.nextUrl.origin)
  if (erro) url.searchParams.set('erro', erro)
  return NextResponse.redirect(url, 303)
}

/** Volta para o início com o resultado da conexão com o Jira (`?jira=...`). */
export const paraInicio = (pedido: NextRequest, jira?: string) => {
  const url = new URL('/', pedido.nextUrl.origin)
  if (jira) url.searchParams.set('jira', jira)
  return NextResponse.redirect(url, 303)
}

/** Fora do modo hospedado as rotas de login não existem. */
export const foraDoModo = () => new NextResponse('Não encontrado.', { status: 404 })

/** Redireciona ao provedor guardando um state aleatório num cookie de 10 minutos. */
export function irParaProvedor(provedor: EstadoOAuth['provedor'], montarUrl: (state: string) => string) {
  const state = randomBytes(24).toString('base64url')
  const resposta = NextResponse.redirect(montarUrl(state), 303)
  resposta.cookies.set(COOKIE_OAUTH, selar(COOKIE_OAUTH, { state, provedor, exp: Date.now() + 600_000 } satisfies EstadoOAuth), opcoesCookie(600))
  return resposta
}

/**
 * Confere a volta do provedor: o state tem de bater com o do cookie (pedido
 * que não começou aqui é recusado). Devolve o `code` ou um código de erro.
 */
export function conferirVolta(pedido: NextRequest, provedor: EstadoOAuth['provedor']): { code: string } | { erro: string } {
  if (!modoHospedado()) return { erro: 'modo' }
  const p = pedido.nextUrl.searchParams
  if (p.get('error')) return { erro: 'negado' }
  const salvo = abrir<EstadoOAuth>(COOKIE_OAUTH, pedido.cookies.get(COOKIE_OAUTH)?.value)
  const state = p.get('state')
  const code = p.get('code')
  if (!salvo || salvo.provedor !== provedor || !state || state !== salvo.state || !code) return { erro: 'estado' }
  return { code }
}
