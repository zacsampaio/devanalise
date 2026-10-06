import { describe, expect, it } from 'vitest'
import { analiseAutomatica, impactoDoJira, limparAssunto, tipoDoJira } from '@/lib/dados'
import { commit } from './fabrica'

describe('limparAssunto', () => {
  it.each([
    ['[PV-12] feat(api): adiciona webhook', 'adiciona webhook'],
    ['PV-12 - corrige login', 'corrige login'],
    ['fix: trata nulo', 'trata nulo'],
    ['refactor(core)!: separa módulos', 'separa módulos'],
    ['Atualiza a versão do aplicativo para 1.2.3 e corrige menu', 'corrige menu'],
    ['  - texto solto', 'texto solto'],
    ['Mensagem comum', 'Mensagem comum'],
  ])('%s → %s', (entrada, esperado) => {
    expect(limparAssunto(entrada)).toBe(esperado)
  })
})

describe('tipoDoJira', () => {
  it.each([
    ['Bug', 'correcao'],
    ['Defeito', 'correcao'],
    ['Epic', 'novo-sistema'],
    ['Épico', 'novo-sistema'],
    ['Story', 'funcionalidade'],
    ['História', 'funcionalidade'],
    ['Improvement', 'melhoria'],
    ['Melhoria', 'melhoria'],
    ['Spike', 'estrutura'],
    ['Débito técnico', 'estrutura'],
    ['Tarefa', null],
    ['Subtarefa', null],
  ])('%s → %s', (nome, esperado) => {
    expect(tipoDoJira(nome)).toBe(esperado)
  })
})

describe('impactoDoJira', () => {
  it.each([
    ['Highest', 'alto'],
    ['Crítica', 'alto'],
    ['Alta', 'alto'],
    ['Blocker', 'alto'],
    ['Medium', 'medio'],
    ['Média', 'medio'],
    ['Low', 'baixo'],
    ['Trivial', 'baixo'],
    ['Sem prioridade', null],
    [null, null],
  ])('%s → %s', (prioridade, esperado) => {
    expect(impactoDoJira(prioridade)).toBe(esperado)
  })
})

/** A coleta entrega os commits do mais recente para o mais antigo. */
const recentesPrimeiro = (...assuntos: string[]) =>
  assuntos.map((assunto, i) => commit({ assunto, data: new Date(Date.UTC(2026, 8, 30 - i)).toISOString() }))

describe('analiseAutomatica', () => {
  it('primeiro commit de criação com volume vira novo sistema, de impacto médio', () => {
    const commits = recentesPrimeiro('adiciona tela de login', 'Initial commit')
    commits[1].adicionadas = 800
    commits[1].arquivos = 40
    const a = analiseAutomatica('PV-1', commits)
    expect(a.tipo).toBe('novo-sistema')
    expect(a.impacto).toBe('medio')
    expect(a.titulo).toBe('Criação do api')
    expect(a.resumo).toContain('Primeira versão do api')
  })

  it('criação pequena vira estrutura', () => {
    expect(analiseAutomatica('PV-1', recentesPrimeiro('Initial commit')).tipo).toBe('estrutura')
  })

  it('maioria de correções vira correção', () => {
    const a = analiseAutomatica('PV-1', recentesPrimeiro('fix: trata nulo', 'corrige data', 'adiciona campo'))
    expect(a.tipo).toBe('correcao')
    expect(a.impacto).toBe('baixo')
  })

  it('novidades viram funcionalidade; com API ou IA, integração', () => {
    expect(analiseAutomatica('PV-1', recentesPrimeiro('feat: nova tela de relatório')).tipo).toBe('funcionalidade')
    expect(analiseAutomatica('PV-1', recentesPrimeiro('feat: adiciona webhook da API de pagamento')).tipo).toBe('integracao')
  })

  it('refatoração e documentação viram estrutura', () => {
    expect(analiseAutomatica('PV-1', recentesPrimeiro('refactor: separa serviços', 'docs: readme')).tipo).toBe('estrutura')
  })

  it('sem palavra-chave, fica melhoria', () => {
    expect(analiseAutomatica('PV-1', recentesPrimeiro('ajusta espaçamento do menu')).tipo).toBe('melhoria')
  })

  it('volume alto (15+ commits) sobe o impacto para médio', () => {
    const commits = recentesPrimeiro(...Array.from({ length: 15 }, (_, i) => `ajusta item ${i}`))
    expect(analiseAutomatica('PV-1', commits).impacto).toBe('medio')
  })

  it('título é o primeiro assunto útil em ordem cronológica, sem prefixos', () => {
    const a = analiseAutomatica('PV-1', recentesPrimeiro('feat: exporta CSV', 'wip', 'PV-1 feat: cria relatório mensal'))
    expect(a.titulo).toBe('Cria relatório mensal')
    expect(a.resumo).toBe('Exporta CSV.')
  })

  it('só mensagens genéricas: título e resumo descrevem o volume', () => {
    const a = analiseAutomatica('SC:empresa/api', recentesPrimeiro('wip', 'ajustes'))
    expect(a.titulo).toBe('Ajustes em api')
    expect(a.resumo).toBe('2 commits em api sem chamado no Jira.')
  })

  it('corta títulos longos sem partir palavras', () => {
    const a = analiseAutomatica('PV-1', recentesPrimeiro(`feat: ${'palavra '.repeat(30)}`))
    expect(a.titulo.length).toBeLessThanOrEqual(90)
    expect(a.titulo.endsWith('palavra…')).toBe(true)
  })
})
