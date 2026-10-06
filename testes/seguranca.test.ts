import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { proxy } from '@/proxy'

const pedido = (usuario?: string, senha?: string) =>
  new NextRequest('https://painel.exemplo/dashboard', {
    headers: usuario === undefined ? {} : { authorization: `Basic ${Buffer.from(`${usuario}:${senha}`).toString('base64')}` },
  })

describe('proxy: autenticação do painel', () => {
  it('com senha, aceita usuário e senha corretos', () => {
    vi.stubEnv('PAINEL_SENHA', 's3nha:com:dois-pontos')
    expect(proxy(pedido('admin', 's3nha:com:dois-pontos')).status).toBe(200)
  })

  it('com senha, recusa senha errada, usuário errado ou sem cabeçalho', () => {
    vi.stubEnv('PAINEL_SENHA', 'certa')
    for (const r of [pedido('admin', 'errada'), pedido('outro', 'certa'), pedido()]) {
      const resposta = proxy(r)
      expect(resposta.status).toBe(401)
      expect(resposta.headers.get('www-authenticate')).toContain('Basic')
    }
  })

  it('usuário configurável por PAINEL_USUARIO', () => {
    vi.stubEnv('PAINEL_SENHA', 'certa')
    vi.stubEnv('PAINEL_USUARIO', 'isaac')
    expect(proxy(pedido('isaac', 'certa')).status).toBe(200)
    expect(proxy(pedido('admin', 'certa')).status).toBe(401)
  })

  it('cabeçalho malformado é recusado', () => {
    vi.stubEnv('PAINEL_SENHA', 'certa')
    const r = new NextRequest('https://painel.exemplo/', { headers: { authorization: `Basic ${Buffer.from('semdoispontos').toString('base64')}` } })
    expect(proxy(r).status).toBe(401)
  })

  it('sem senha em produção, bloqueia, a menos que PAINEL_PUBLICO=true', () => {
    vi.stubEnv('PAINEL_SENHA', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(proxy(pedido()).status).toBe(503)
    vi.stubEnv('PAINEL_PUBLICO', 'true')
    expect(proxy(pedido()).status).toBe(200)
  })

  it('sem senha em desenvolvimento, libera', () => {
    vi.stubEnv('PAINEL_SENHA', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(proxy(pedido()).status).toBe(200)
  })
})

describe('repoPermitido: filtros GITHUB_OWNERS e GITHUB_IGNORAR', () => {
  async function carregar(env: Record<string, string>) {
    vi.resetModules()
    for (const [k, v] of Object.entries({ GITHUB_OWNERS: '', GITHUB_IGNORAR: '', ...env })) vi.stubEnv(k, v)
    return (await import('@/lib/github')).repoPermitido
  }

  it('sem filtros, aceita tudo', async () => {
    expect((await carregar({}))('qualquer/repo')).toBe(true)
  })

  it('GITHUB_OWNERS limita aos donos listados, sem diferenciar maiúsculas', async () => {
    const permitido = await carregar({ GITHUB_OWNERS: 'Empresa, voce' })
    expect(permitido('empresa/api')).toBe(true)
    expect(permitido('VOCE/site')).toBe(true)
    expect(permitido('outro/api')).toBe(false)
  })

  it('GITHUB_IGNORAR aceita "dono/nome" ou só o nome', async () => {
    const permitido = await carregar({ GITHUB_IGNORAR: 'empresa/legado, rascunhos' })
    expect(permitido('empresa/legado')).toBe(false)
    expect(permitido('voce/rascunhos')).toBe(false)
    expect(permitido('voce/legado')).toBe(true)
  })
})
