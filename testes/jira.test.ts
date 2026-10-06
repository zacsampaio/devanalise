import { afterEach, describe, expect, it, vi } from 'vitest'

/** O módulo lê JIRA_PROJETOS ao carregar: cada cenário importa uma cópia nova. */
async function carregar(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [k, v] of Object.entries({ JIRA_PROJETOS: '', JIRA_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '', ...env })) vi.stubEnv(k, v)
  return import('@/lib/jira')
}

afterEach(() => vi.unstubAllGlobals())

describe('extrairChamados', () => {
  it('encontra chaves em maiúsculas e remove repetidas', async () => {
    const { extrairChamados } = await carregar()
    expect(extrairChamados('PV-209: corrige login (ver PV-209 e TYC-494)')).toEqual(['PV-209', 'TYC-494'])
  })

  it('ignora siglas que parecem chave mas não são', async () => {
    const { extrairChamados } = await carregar()
    expect(extrairChamados('Converte para UTF-8, hash SHA-256, data ISO-8601 e CVE-2024')).toEqual([])
  })

  it('sem JIRA_PROJETOS, não aceita minúsculas', async () => {
    const { extrairChamados } = await carregar()
    expect(extrairChamados('fix pv-12')).toEqual([])
  })

  it('com JIRA_PROJETOS, aceita só esses projetos, inclusive em minúsculas e com espaço', async () => {
    const { extrairChamados } = await carregar({ JIRA_PROJETOS: 'pv, TYC' })
    expect(extrairChamados('pv-12, TYC 7, ABC-1 e UTF-8')).toEqual(['PV-12', 'TYC-7'])
  })
})

describe('jiraConfigurado', () => {
  it('exige URL https, e-mail e token', async () => {
    expect((await carregar({ JIRA_URL: 'https://x.atlassian.net', JIRA_EMAIL: 'a@b.c', JIRA_API_TOKEN: 't' })).jiraConfigurado()).toBe(true)
    expect((await carregar({ JIRA_URL: 'http://x.atlassian.net', JIRA_EMAIL: 'a@b.c', JIRA_API_TOKEN: 't' })).jiraConfigurado()).toBe(false)
    expect((await carregar({ JIRA_URL: 'https://x.atlassian.net', JIRA_EMAIL: 'a@b.c' })).jiraConfigurado()).toBe(false)
    expect((await carregar({ JIRA_URL: 'não é url', JIRA_EMAIL: 'a@b.c', JIRA_API_TOKEN: 't' })).jiraConfigurado()).toBe(false)
  })
})

describe('buscarIssues', () => {
  const env = { JIRA_URL: 'https://x.atlassian.net/qualquer/caminho', JIRA_EMAIL: 'a@b.c', JIRA_API_TOKEN: 'segredo' }

  it('consulta o bulkfetch em lotes de 100 e converte a resposta', async () => {
    const { buscarIssues } = await carregar(env)
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const { issueIdsOrKeys } = JSON.parse(init.body as string) as { issueIdsOrKeys: string[] }
      return Response.json({
        issues: issueIdsOrKeys.slice(0, 1).map((key) => ({
          key,
          fields: { summary: 'Título', issuetype: { name: 'Bug' }, priority: { name: 'High' }, status: { name: 'Feito', statusCategory: { key: 'done' } } },
        })),
      })
    })
    vi.stubGlobal('fetch', fetch)

    const chaves = Array.from({ length: 150 }, (_, i) => `PV-${i + 1}`)
    const r = await buscarIssues(chaves)

    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, init] = fetch.mock.calls[0]
    // só a origem do JIRA_URL é usada
    expect(url).toBe('https://x.atlassian.net/rest/api/3/issue/bulkfetch')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('a@b.c:segredo').toString('base64')}`)
    expect(JSON.parse(init.body as string).issueIdsOrKeys).toHaveLength(100)
    expect(r['PV-1']).toEqual({
      chave: 'PV-1',
      titulo: 'Título',
      tipo: 'Bug',
      prioridade: 'High',
      status: 'Feito',
      categoria: 'done',
      url: 'https://x.atlassian.net/browse/PV-1',
    })
    expect(Object.keys(r)).toEqual(['PV-1', 'PV-101'])
  })

  it('categoria desconhecida vira "a fazer" e campos ausentes não quebram', async () => {
    const { buscarIssues } = await carregar(env)
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ issues: [{ key: 'PV-1', fields: { summary: 'S', priority: null } }] })))
    expect((await buscarIssues(['PV-1']))['PV-1']).toMatchObject({ categoria: 'new', prioridade: null, tipo: '', status: '' })
  })

  it('erro HTTP do Jira vira exceção com o status', async () => {
    const { buscarIssues } = await carregar(env)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await expect(buscarIssues(['PV-1'])).rejects.toThrow('Jira respondeu 404')
  })

  it('sem configuração, recusa antes de chamar a rede', async () => {
    const { buscarIssues } = await carregar()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(buscarIssues(['PV-1'])).rejects.toThrow('Jira não configurado')
    expect(fetch).not.toHaveBeenCalled()
  })
})
