import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { faltandoHospedado, modoHospedado } from './lib/modo'
import { abrir, COOKIE_GITHUB, type SessaoGithub } from './lib/sessao'

/**
 * Quem pode abrir o painel.
 *
 * Modo hospedado (GITHUB_CLIENT_ID definido): só quem entrou com o GitHub
 * (cookie de sessão criptografado). Sem sessão, páginas vão para /entrar e as
 * rotas /api respondem 401.
 *
 * Modo local: autenticação HTTP Basic para o painel inteiro, inclusive a
 * Server Action de "atualizar agora" (que também é um POST para estas rotas).
 * - PAINEL_SENHA definida: exige usuário (PAINEL_USUARIO, padrão "admin") e senha.
 * - Sem senha em produção: recusa, a menos que PAINEL_PUBLICO=true.
 * - Sem senha em desenvolvimento: libera (uso local).
 *
 * Basic Auth e cookie de sessão viajam a cada requisição: em produção, sirva só por HTTPS.
 */

const resumo = (s: string) => createHash('sha256').update(s).digest()
/** Comparação em tempo constante (o hash iguala os tamanhos). */
const iguais = (a: string, b: string) => timingSafeEqual(resumo(a), resumo(b))

/** Abertas sem login no modo hospedado: a tela de entrada e o próprio login. */
const PUBLICAS = ['/entrar', '/api/auth/github', '/api/auth/github/callback', '/api/auth/sair', '/icon.svg']

function hospedado(request: NextRequest) {
  const faltando = faltandoHospedado()
  if (faltando.length) return new NextResponse(`Modo hospedado incompleto: defina ${faltando.join(', ')}.`, { status: 503 })

  const caminho = request.nextUrl.pathname
  const logado = Boolean(abrir<SessaoGithub>(COOKIE_GITHUB, request.cookies.get(COOKIE_GITHUB)?.value))
  if (caminho === '/entrar' && logado) return NextResponse.redirect(new URL('/', request.url))
  if (logado || PUBLICAS.includes(caminho)) return NextResponse.next()
  if (caminho.startsWith('/api/')) return NextResponse.json({ erro: 'Sessão expirada: entre de novo com o GitHub.', codigo: 'sessao' }, { status: 401 })
  return NextResponse.redirect(new URL('/entrar', request.url))
}

export function proxy(request: NextRequest) {
  if (modoHospedado()) return hospedado(request)

  const senha = process.env.PAINEL_SENHA
  if (!senha) {
    if (process.env.NODE_ENV === 'production' && process.env.PAINEL_PUBLICO !== 'true') {
      return new NextResponse('Painel bloqueado: defina PAINEL_SENHA no .env (ou PAINEL_PUBLICO=true para abrir sem senha).', { status: 503 })
    }
    return NextResponse.next()
  }

  const usuario = process.env.PAINEL_USUARIO?.trim() || 'admin'
  const cabecalho = request.headers.get('authorization')
  if (cabecalho?.startsWith('Basic ')) {
    const texto = Buffer.from(cabecalho.slice(6), 'base64').toString('utf8')
    const separador = texto.indexOf(':')
    if (separador >= 0) {
      // compara os dois campos sempre, sem curto-circuito, para não revelar qual errou
      const usuarioOk = iguais(texto.slice(0, separador), usuario)
      const senhaOk = iguais(texto.slice(separador + 1), senha)
      if (usuarioOk && senhaOk) return NextResponse.next()
    }
  }
  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Painel de entregas", charset="UTF-8"' },
  })
}

export const config = {
  // tudo menos os arquivos estáticos do build
  matcher: ['/((?!_next/static|_next/image).*)'],
}
