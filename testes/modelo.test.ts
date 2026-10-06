import { describe, expect, it } from 'vitest'
import { contarTipos, demandaDoCommit, gradeDeCommits, montarModelo, nomeSistema, slugRepo } from '@/lib/dados'
import { base, commit, issue } from './fabrica'

describe('montarModelo: agrupamento em demandas', () => {
  it('sem Jira, agrupa pelo primeiro chamado citado e o resto fica "sem chamado" por repositório', () => {
    const m = montarModelo(
      base([
        commit({ chamados: ['PV-1'], data: '2026-09-02T10:00:00Z' }),
        commit({ chamados: ['PV-1', 'PV-2'], data: '2026-09-05T10:00:00Z' }),
        commit({ chamados: [], data: '2026-09-03T10:00:00Z' }),
        commit({ chamados: [], repo: 'empresa/web', data: '2026-09-04T10:00:00Z' }),
      ]),
    )
    expect(m.demandas.map((d) => d.id).sort()).toEqual(['PV-1', 'SC:empresa/api', 'SC:empresa/web'])
    const pv1 = m.demandas.find((d) => d.id === 'PV-1')!
    expect(pv1).toMatchObject({ slug: 'pv-1', rotulo: 'PV-1', nCommits: 2, inicio: '2026-09-02T10:00:00Z', fim: '2026-09-05T10:00:00Z', jira: null, automatica: true })
    expect(m.demandas.find((d) => d.id === 'SC:empresa/web')).toMatchObject({ slug: 'sem-chamado-empresa-web', rotulo: 'Sem chamado' })
  })

  it('com Jira, só chaves confirmadas agrupam; as demais caem em "sem chamado"', () => {
    const m = montarModelo(
      base(
        [commit({ chamados: ['UTF-8X', 'PV-2'] }), commit({ chamados: ['ABC-9'] })],
        { 'PV-2': issue('PV-2') },
      ),
    )
    expect(m.demandas.map((d) => d.id).sort()).toEqual(['PV-2', 'SC:empresa/api'])
  })

  it('Jira define título, tipo e impacto; tarefa genérica mantém o tipo automático', () => {
    const m = montarModelo(
      base(
        [commit({ chamados: ['PV-1'], assunto: 'fix: trata nulo' }), commit({ chamados: ['PV-2'], assunto: 'fix: corrige data' })],
        {
          'PV-1': issue('PV-1', { titulo: 'Erro no faturamento', tipo: 'Story', prioridade: 'High' }),
          'PV-2': issue('PV-2', { tipo: 'Tarefa', prioridade: 'Low' }),
        },
      ),
    )
    const pv1 = m.demandas.find((d) => d.id === 'PV-1')!
    expect(pv1).toMatchObject({ titulo: 'Erro no faturamento', tipo: 'funcionalidade', impacto: 'alto', automatica: false })
    expect(pv1.jira).toMatchObject({ status: 'Concluído', categoria: 'done', url: 'https://empresa.atlassian.net/browse/PV-1' })
    expect(m.demandas.find((d) => d.id === 'PV-2')).toMatchObject({ tipo: 'correcao', impacto: 'baixo', automatica: true })
  })

  it('o repositório principal da demanda é o que tem mais commits', () => {
    const m = montarModelo(
      base([commit({ chamados: ['PV-1'], repo: 'empresa/web' }), commit({ chamados: ['PV-1'], repo: 'empresa/api' }), commit({ chamados: ['PV-1'], repo: 'empresa/api' })]),
    )
    expect(m.demandas[0].repos).toEqual(['empresa/api', 'empresa/web'])
  })

  it('demandas ficam da mais recente para a mais antiga e cada commit aponta para a sua', () => {
    const antigo = commit({ chamados: ['PV-1'], data: '2026-01-10T10:00:00Z' })
    const novo = commit({ chamados: ['PV-2'], data: '2026-08-10T10:00:00Z' })
    const m = montarModelo(base([antigo, novo]))
    expect(m.demandas.map((d) => d.id)).toEqual(['PV-2', 'PV-1'])
    expect(demandaDoCommit(m, antigo)?.id).toBe('PV-1')
    expect(demandaDoCommit(m, { repo: 'empresa/api', hash: 'inexistente' })).toBeNull()
  })
})

describe('montarModelo: contagens mensais', () => {
  it('conta commits, rastreáveis, repositórios e demandas concluídas pelo mês do último commit', () => {
    const m = montarModelo(
      base(
        [
          commit({ chamados: ['PV-1'], data: '2026-08-30T10:00:00Z' }),
          commit({ chamados: ['PV-1'], data: '2026-09-02T10:00:00Z', repo: 'empresa/web' }),
          commit({ data: '2026-09-03T10:00:00Z' }),
        ],
        { 'PV-1': issue('PV-1', { prioridade: 'High' }) },
      ),
    )
    const ago = m.mensal.get('2026-08')!
    const set = m.mensal.get('2026-09')!
    expect(ago).toMatchObject({ commits: 1, comChamado: 1, concluidas: 0 })
    expect(set).toMatchObject({ commits: 2, comChamado: 1, concluidas: 2, altoImpacto: 1 })
    expect([...set.repos].sort()).toEqual(['empresa/api', 'empresa/web'])
  })
})

describe('nomes de sistema', () => {
  it('repositórios homônimos de donos diferentes aparecem com o dono', () => {
    montarModelo(base([commit({ repo: 'empresa/api' }), commit({ repo: 'voce/api' }), commit({ repo: 'voce/site' })]))
    expect(nomeSistema('empresa/api')).toBe('empresa/api')
    expect(nomeSistema('voce/site')).toBe('site')
  })

  it('slug só com letras, números e hífens', () => {
    expect(slugRepo('Empresa/Meu_Repo.JS')).toBe('empresa-meu-repo-js')
  })
})

describe('contarTipos', () => {
  it('zera todos os tipos e conta os presentes', () => {
    const m = montarModelo(base([commit({ chamados: ['PV-1'], assunto: 'fix: x' }), commit({ chamados: ['PV-2'], assunto: 'fix: y' })]))
    expect(contarTipos(m.demandas)).toEqual({ 'novo-sistema': 0, funcionalidade: 0, integracao: 0, melhoria: 0, correcao: 2, estrutura: 0 })
  })
})

describe('gradeDeCommits', () => {
  // 2026-10-01 é quinta-feira; horários ao meio-dia UTC = 09:00 em São Paulo
  const FIM = '2026-10-01T12:00:00Z'

  it('termina na semana do fim, com colunas de segunda a domingo', () => {
    const g = gradeDeCommits([], FIM, 2)
    expect(g.semanas).toHaveLength(2)
    expect(g.semanas[0][0]?.data).toBe('2026-09-21')
    expect(g.semanas[1][0]?.data).toBe('2026-09-28')
    expect(g.semanas[1][3]?.data).toBe('2026-10-01')
    // sexta a domingo depois do fim ficam vazios
    expect(g.semanas[1].slice(4)).toEqual([null, null, null])
  })

  it('conta commits por dia local, o máximo e os dias com atividade', () => {
    const g = gradeDeCommits(
      [
        { data: '2026-09-29T12:00:00Z' },
        { data: '2026-09-29T15:00:00Z' },
        // 01:00 UTC do dia 30 ainda é dia 29 em São Paulo
        { data: '2026-09-30T01:00:00Z' },
        { data: '2026-09-22T12:00:00Z' },
        // fora da grade
        { data: '2025-01-01T12:00:00Z' },
      ],
      FIM,
      2,
    )
    expect(g.semanas[1][1]).toEqual({ data: '2026-09-29', commits: 3 })
    expect(g.semanas[0][1]).toEqual({ data: '2026-09-22', commits: 1 })
    expect(g.max).toBe(3)
    expect(g.diasAtivos).toBe(2)
  })

  it('padrão: 53 semanas', () => {
    expect(gradeDeCommits([], FIM).semanas).toHaveLength(53)
  })
})
