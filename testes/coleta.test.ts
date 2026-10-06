import { describe, expect, it, vi } from 'vitest'
import { coletar, coletaVazia, type Fontes } from '@/lib/coleta'
import type { Repo } from '@/lib/github'
import { commit, issue } from './fabrica'

const DESDE = '2026-01-01T00:00:00.000Z'
const usuario = { id: 'U_1', login: 'voce', nome: 'Você', avatar: '' }

const repo = (completo: string, pushedAt: string, branches = ['main']): Repo => {
  const [dono, nome] = completo.split('/')
  return { dono, nome, completo, pushedAt, branches: branches.map((b) => ({ nome: b, ultimoCommit: pushedAt })), linguagens: [], privado: false }
}

describe('coletar (algoritmo comum aos dois modos)', () => {
  it('lê todas as branches, sem repetir commits que estão em mais de uma', async () => {
    const a = commit({ repo: 'voce/app', data: '2026-03-01T00:00:00Z' })
    const b = commit({ repo: 'voce/app', data: '2026-04-01T00:00:00Z' })
    const fontes: Fontes = {
      usuario: async () => usuario,
      repos: async () => [repo('voce/app', '2026-04-02T00:00:00Z', ['main', 'dev'])],
      pagina: async (_r, branch) => ({ commits: branch === 'main' ? [a] : [a, b], proxima: null }),
      issues: null,
    }
    const dados = coletaVazia(DESDE)
    await coletar(dados, fontes, DESDE)
    expect(dados.commits.map((c) => c.hash)).toEqual([b.hash, a.hash])
    expect(dados.usuario).toEqual(usuario)
    expect(dados.atualizadoEm).not.toBeNull()
  })

  it('segue as páginas do histórico até o fim', async () => {
    const c1 = commit({ repo: 'voce/app' })
    const c2 = commit({ repo: 'voce/app' })
    const pagina = vi.fn(async (_r: Repo, _b: string, _d: string, _a: string, depois: string | null) => (depois ? { commits: [c2], proxima: null } : { commits: [c1], proxima: 'cursor' }))
    const dados = coletaVazia(DESDE)
    await coletar(dados, { usuario: async () => usuario, repos: async () => [repo('voce/app', '2026-04-02T00:00:00Z')], pagina, issues: null }, DESDE)
    expect(pagina).toHaveBeenCalledTimes(2)
    expect(dados.commits).toHaveLength(2)
  })

  it('na segunda vez, só relê repositórios com push novo', async () => {
    const pagina = vi.fn(async () => ({ commits: [], proxima: null }))
    const repos = [repo('voce/a', '2026-04-01T00:00:00Z'), repo('voce/b', '2026-04-01T00:00:00Z')]
    const fontes: Fontes = { usuario: async () => usuario, repos: async () => repos, pagina, issues: null }
    const dados = coletaVazia(DESDE)
    await coletar(dados, fontes, DESDE)
    expect(pagina).toHaveBeenCalledTimes(2)
    pagina.mockClear()
    // push agora: o commit novo cai dentro da janela incremental
    repos[1] = repo('voce/b', new Date().toISOString())
    await coletar(dados, fontes, DESDE)
    expect(pagina).toHaveBeenCalledTimes(1)
  })

  it('outra conta recomeça do zero', async () => {
    const dados = { ...coletaVazia(DESDE), usuario: { ...usuario, id: 'OUTRA' }, commits: [commit()] }
    await coletar(dados, { usuario: async () => usuario, repos: async () => [], pagina: async () => ({ commits: [], proxima: null }), issues: null }, DESDE)
    expect(dados.commits).toEqual([])
  })

  it('Jira: consulta só chaves novas ou não concluídas; falha vira aviso sem derrubar a coleta', async () => {
    const c = commit({ repo: 'voce/app', chamados: ['AB-1', 'AB-2'] })
    const issues = vi.fn(async (chaves: string[]) => Object.fromEntries(chaves.map((k) => [k, issue(k, { categoria: 'indeterminate' })])))
    const dados = { ...coletaVazia(DESDE), jira: { 'AB-1': issue('AB-1', { categoria: 'done' }) } }
    const fontes: Fontes = { usuario: async () => usuario, repos: async () => [repo('voce/app', '2026-04-02T00:00:00Z')], pagina: async () => ({ commits: [c], proxima: null }), issues }
    await coletar(dados, fontes, DESDE)
    expect(issues).toHaveBeenCalledWith(['AB-2'])
    expect(Object.keys(dados.jira!)).toEqual(['AB-1', 'AB-2'])

    const aviso = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await coletar(dados, { ...fontes, issues: async () => Promise.reject(new Error('HTTP 500')) }, DESDE, { avisoJira: aviso })
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'))
    expect(dados.commits).toHaveLength(1)
  })

  it('sem Jira conectado, apaga as issues antigas', async () => {
    const dados = { ...coletaVazia(DESDE), jira: { 'AB-1': issue('AB-1') } }
    await coletar(dados, { usuario: async () => usuario, repos: async () => [], pagina: async () => ({ commits: [], proxima: null }), issues: null }, DESDE)
    expect(dados.jira).toBeNull()
  })
})
