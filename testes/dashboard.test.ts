import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Base } from '@/lib/fonte'
import { base, commit, issue } from './fabrica'

// o dashboard lê a base pela coleta; aqui ela vem pronta, sem rede nem disco
const fonte = vi.hoisted(() => ({ atual: null as Base | null, revisao: 0 }))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('@/lib/fonte', () => ({
  obterBase: async () => fonte.atual,
  revisaoDados: () => String(fonte.revisao),
}))

const { obterDashboard, obterPainel } = await import('@/lib/servidor')

function usar(b: Base) {
  fonte.atual = b
  fonte.revisao++
}

// "agora" do painel = geradoEm da base
const AGORA = '2026-10-01T12:00:00Z'
const diasAtras = (n: number, hora = 12) => new Date(Date.parse(AGORA) - n * 86_400_000 + (hora - 12) * 3_600_000).toISOString()

describe('obterDashboard', () => {
  beforeEach(() => {
    usar(
      base(
        [
          // janela atual (últimos 30 dias)
          commit({ chamados: ['PV-1'], data: diasAtras(10) }),
          commit({ chamados: ['PV-1'], data: diasAtras(3) }),
          commit({ chamados: ['PV-2'], data: diasAtras(5), repo: 'empresa/web' }),
          commit({ data: diasAtras(2) }),
          // janela anterior (31–60 dias)
          commit({ chamados: ['PV-3'], data: diasAtras(40) }),
          // fora das duas janelas
          commit({ chamados: ['PV-4'], data: diasAtras(200) }),
        ],
        {
          'PV-1': issue('PV-1', { prioridade: 'High' }),
          'PV-2': issue('PV-2', { categoria: 'indeterminate' }),
          'PV-3': issue('PV-3'),
          'PV-4': issue('PV-4'),
        },
        AGORA,
      ),
    )
  })

  it('recorta pelo período e compara com a janela anterior do mesmo tamanho', async () => {
    const d = await obterDashboard('30d')
    expect(d.periodo).toMatchObject({ id: '30d', janelaDias: 30, ate: '2026-10-01T12:00:00.000Z' })
    expect(d.indicadores.commits).toMatchObject({ valor: 4, variacao: 300 })
    // PV-1, PV-2 e o "sem chamado" de empresa/api
    expect(d.indicadores.demandas).toMatchObject({ valor: 3, variacao: 200 })
    expect(d.indicadores.altoImpacto).toMatchObject({ valor: 1, variacao: null })
  })

  it('"tudo" começa no commit mais antigo', async () => {
    const d = await obterDashboard('tudo')
    expect(d.periodo.desde).toBe(diasAtras(200))
    expect(d.indicadores.commits.valor).toBe(6)
  })

  it('período desconhecido cai em "tudo"', async () => {
    expect((await obterDashboard('xyz' as never)).periodo.id).toBe('tudo')
  })

  it('rastreabilidade é a parcela de commits ligados a um chamado', async () => {
    expect((await obterDashboard('30d')).indicadores.rastreabilidade.valor).toBe(75)
  })

  it('status do Jira das demandas do período', async () => {
    const { statusJira } = await obterDashboard('30d')
    expect(statusJira).toEqual([
      { id: 'done', rotulo: 'Concluído', valor: 1 },
      { id: 'indeterminate', rotulo: 'Em andamento', valor: 1 },
      { id: 'new', rotulo: 'A fazer', valor: 0 },
    ])
  })

  it('duração da demanda conta do primeiro ao último commit, inclusive', async () => {
    const d = await obterDashboard('30d')
    // PV-1: 8 dias · PV-2: 1 dia · sem chamado: 1 dia
    expect(d.indicadores.duracaoMediana.valor).toBe(1)
    expect(d.distribuicaoDuracao.find((f) => f.rotulo === '1 dia')!.valor).toBe(2)
    expect(d.distribuicaoDuracao.find((f) => f.rotulo === '8–15 dias')!.valor).toBe(1)
  })

  it('mapa de calor usa dia da semana e hora locais', async () => {
    // 2026-09-29 é terça; 12:00Z = 09:00 em São Paulo → faixa 8–10h
    usar(base([commit({ data: '2026-09-29T12:00:00Z' })], null, AGORA))
    const { calor, statusJira } = await obterDashboard('30d')
    expect(calor.valores[1][calor.faixas.indexOf('8–10h')]).toBe(1)
    expect(calor.valores.flat().reduce((s, v) => s + v, 0)).toBe(1)
    expect(statusJira).toBeNull()
  })

  it('sistemas mais trabalhados, por commits', async () => {
    const { sistemas } = await obterDashboard('30d')
    expect(sistemas.map((s) => [s.rotulo, s.total])).toEqual([
      ['api', 3],
      ['web', 1],
    ])
    expect(sistemas[0].href).toBe('/sistemas/empresa-api')
  })

  it('base vazia não quebra', async () => {
    usar(base([], null, AGORA))
    const d = await obterDashboard('tudo')
    expect(d.vazio).toBe(true)
    expect(d.indicadores.commits.valor).toBe(0)
    expect(d.indicadores.rastreabilidade.valor).toBe(0)
  })
})

describe('obterPainel', () => {
  it('resume o período inteiro', async () => {
    usar(
      base(
        [commit({ chamados: ['PV-1'], data: '2026-03-01T12:00:00Z' }), commit({ data: '2026-09-01T12:00:00Z', repo: 'empresa/web' })],
        { 'PV-1': issue('PV-1', { prioridade: 'High', tipo: 'Epic' }) },
      ),
    )
    const p = await obterPainel()
    expect(p.periodo).toEqual({ inicio: '2026-03-01T12:00:00Z', fim: '2026-09-01T12:00:00Z' })
    expect(p.kpis).toMatchObject({ demandas: 2, chamados: 1, novosSistemas: 1, altoImpacto: 1, sistemas: 2, commits: 2 })
    expect(p.meses.map((m) => m.chave)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    expect(p.jiraAtivo).toBe(true)
  })
})

describe('obterDashboard: recorte por visibilidade', () => {
  it('só os commits dos repositórios do recorte entram nos números', async () => {
    const b = base(
      [commit({ repo: 'empresa/privado', data: diasAtras(3) }), commit({ repo: 'empresa/privado', data: diasAtras(4) }), commit({ repo: 'voce/publico', data: diasAtras(5) })],
      null,
      AGORA,
    )
    b.privados = { 'empresa/privado': true, 'voce/publico': false }
    usar(b)
    expect((await obterDashboard('tudo')).indicadores.commits.valor).toBe(3)
    const privados = await obterDashboard('tudo', 'privados')
    expect(privados.indicadores.commits.valor).toBe(2)
    expect(privados.sistemas.map((s) => s.rotulo)).toEqual(['privado'])
    expect(privados).toMatchObject({ visibilidade: 'privados', temVisibilidade: true })
    const publicos = await obterDashboard('tudo', 'publicos')
    expect(publicos.indicadores.commits.valor).toBe(1)
  })

  it('recorte sem repositórios fica vazio, sem quebrar', async () => {
    const b = base([commit({ repo: 'empresa/privado', data: diasAtras(3) })], null, AGORA)
    b.privados = { 'empresa/privado': true }
    usar(b)
    const d = await obterDashboard('30d', 'publicos')
    expect(d.vazio).toBe(true)
    expect(d.indicadores.commits.valor).toBe(0)
  })
})
