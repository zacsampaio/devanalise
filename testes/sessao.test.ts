import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { proxy } from '@/proxy'
import { abrir, COOKIE_GITHUB, COOKIE_JIRA, precisaRenovar, selar, type SessaoGithub, type SessaoJira } from '@/lib/sessao'
import { conferirVolta } from '@/lib/rotasAuth'

const SEGREDO = 'x'.repeat(40)
const usuario = { id: 'U_1', login: 'voce', nome: 'Você', avatar: 'https://avatars.githubusercontent.com/u/1' }
const sessao = (exp = Date.now() + 3_600_000): SessaoGithub => ({ token: 'ghu_teste', exp, usuario })

function hospedado() {
  vi.stubEnv('GITHUB_CLIENT_ID', 'Iv1.teste')
  vi.stubEnv('GITHUB_CLIENT_SECRET', 'segredo')
  vi.stubEnv('SESSAO_SEGREDO', SEGREDO)
}

const pedido = (caminho: string, cookies: Record<string, string> = {}) =>
  new NextRequest(`https://painel.exemplo${caminho}`, {
    headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') },
  })

describe('cookies selados da sessão', () => {
  beforeEach(() => vi.stubEnv('SESSAO_SEGREDO', SEGREDO))

  it('abre o que foi selado, com o mesmo nome', () => {
    const s = sessao()
    expect(abrir(COOKIE_GITHUB, selar(COOKIE_GITHUB, s))).toEqual(s)
  })

  it('não guarda o token em texto claro', () => {
    expect(selar(COOKIE_GITHUB, sessao())).not.toContain('ghu_teste')
  })

  it('recusa cookie adulterado, de outro nome, de outra chave ou vencido', () => {
    const valor = selar(COOKIE_GITHUB, sessao())
    const bytes = Buffer.from(valor, 'base64url')
    bytes[bytes.length - 1] ^= 1
    expect(abrir(COOKIE_GITHUB, bytes.toString('base64url'))).toBeNull()
    // o do GitHub não serve como o do Jira
    expect(abrir(COOKIE_JIRA, valor)).toBeNull()
    expect(abrir(COOKIE_GITHUB, selar(COOKIE_GITHUB, sessao(Date.now() - 1)))).toBeNull()
    expect(abrir(COOKIE_GITHUB, 'lixo')).toBeNull()
    expect(abrir(COOKIE_GITHUB, undefined)).toBeNull()
    vi.stubEnv('SESSAO_SEGREDO', 'y'.repeat(40))
    expect(abrir(COOKIE_GITHUB, valor)).toBeNull()
  })

  it('exige SESSAO_SEGREDO com 32+ caracteres', () => {
    vi.stubEnv('SESSAO_SEGREDO', 'curto')
    expect(() => selar(COOKIE_GITHUB, sessao())).toThrow('SESSAO_SEGREDO')
  })

  it('renova o token do Jira só perto de vencer', () => {
    const site = { id: 'c1', url: 'https://x.atlassian.net', nome: 'X' }
    const jira = (accessExp: number): SessaoJira => ({ access: 'a', refresh: 'r', accessExp, exp: Date.now() + 8 * 3_600_000, site })
    expect(precisaRenovar(jira(Date.now() + 3_600_000))).toBe(false)
    expect(precisaRenovar(jira(Date.now() + 60_000))).toBe(true)
  })
})

describe('proxy no modo hospedado', () => {
  beforeEach(hospedado)

  it('sem login, páginas vão para /entrar e a API responde 401', () => {
    const r = proxy(pedido('/dashboard'))
    expect(r.status).toBe(307)
    expect(r.headers.get('location')).toBe('https://painel.exemplo/entrar')
    expect(proxy(pedido('/api/coleta/inicio')).status).toBe(401)
  })

  it('a tela de entrada e o login abrem sem sessão', () => {
    for (const c of ['/entrar', '/api/auth/github', '/api/auth/github/callback', '/api/auth/sair']) expect(proxy(pedido(c)).status).toBe(200)
  })

  it('com sessão válida, libera; em /entrar, manda para o início', () => {
    const cookie = { [COOKIE_GITHUB]: selar(COOKIE_GITHUB, sessao()) }
    expect(proxy(pedido('/dashboard', cookie)).status).toBe(200)
    expect(proxy(pedido('/api/coleta/inicio', cookie)).status).toBe(200)
    expect(proxy(pedido('/entrar', cookie)).headers.get('location')).toBe('https://painel.exemplo/')
  })

  it('sessão vencida ou forjada não entra', () => {
    expect(proxy(pedido('/', { [COOKIE_GITHUB]: selar(COOKIE_GITHUB, sessao(Date.now() - 1)) })).status).toBe(307)
    expect(proxy(pedido('/', { [COOKIE_GITHUB]: 'forjado' })).status).toBe(307)
  })

  it('não pede senha Basic (o login é o GitHub)', () => {
    vi.stubEnv('PAINEL_SENHA', 'qualquer')
    expect(proxy(pedido('/entrar')).headers.get('www-authenticate')).toBeNull()
  })

  it('configuração incompleta bloqueia com a lista do que falta', async () => {
    vi.stubEnv('SESSAO_SEGREDO', 'curto')
    const r = proxy(pedido('/'))
    expect(r.status).toBe(503)
    expect(await r.text()).toContain('SESSAO_SEGREDO')
  })
})

describe('volta do OAuth (state anti-CSRF)', () => {
  beforeEach(hospedado)
  const estado = (state: string, provedor: 'github' | 'atlassian' = 'github') => ({ painel_oauth: selar('painel_oauth', { state, provedor, exp: Date.now() + 60_000 }) })

  it('aceita quando o state bate com o do cookie', () => {
    expect(conferirVolta(pedido('/api/auth/github/callback?code=c1&state=abc', estado('abc')), 'github')).toEqual({ code: 'c1' })
  })

  it('recusa state diferente, ausente, de outro provedor ou sem cookie', () => {
    expect(conferirVolta(pedido('/x?code=c1&state=outro', estado('abc')), 'github')).toEqual({ erro: 'estado' })
    expect(conferirVolta(pedido('/x?code=c1', estado('abc')), 'github')).toEqual({ erro: 'estado' })
    expect(conferirVolta(pedido('/x?code=c1&state=abc', estado('abc', 'atlassian')), 'github')).toEqual({ erro: 'estado' })
    expect(conferirVolta(pedido('/x?code=c1&state=abc'), 'github')).toEqual({ erro: 'estado' })
  })

  it('acesso negado pelo usuário vira erro próprio', () => {
    expect(conferirVolta(pedido('/x?error=access_denied&state=abc', estado('abc')), 'github')).toEqual({ erro: 'negado' })
  })
})
