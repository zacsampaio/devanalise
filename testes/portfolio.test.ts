import { describe, expect, it } from 'vitest'
import { montarModelo } from '@/lib/dados'
import { chamadaProjeto, CRITERIOS, montarPortfolio, resumoProjeto, tituloAmigavel, tituloLimpo } from '@/lib/portfolio'
import { base, commit, issue } from './fabrica'

const tiposZerados = { 'novo-sistema': 0, funcionalidade: 0, integracao: 0, melhoria: 0, correcao: 0, estrutura: 0 }

describe('CRITERIOS', () => {
  it('pesos somam 100', () => {
    expect(CRITERIOS.reduce((s, c) => s + c.peso, 0)).toBe(100)
  })
})

describe('resumoProjeto', () => {
  it('quem criou: data de criação, tempo, tipos mais frequentes e alto impacto', () => {
    const texto = resumoProjeto({
      nome: 'api',
      criou: true,
      inicio: '2026-03-10T12:00:00Z',
      meses: 7,
      porTipo: { ...tiposZerados, 'novo-sistema': 1, funcionalidade: 9, integracao: 6, correcao: 5 },
      altoImpacto: 3,
      entregas: 21,
    })
    expect(texto).toBe('Criou o api em mar 2026 e o evoluiu ao longo de 7 meses: 21 entregas, entre elas 9 funcionalidades, 6 integrações e 5 correções. 3 delas foram de alto impacto.')
  })

  it('quem não criou, em um mês, com uma entrega', () => {
    const texto = resumoProjeto({ nome: 'web', criou: false, inicio: '2026-09-02T12:00:00Z', meses: 1, porTipo: { ...tiposZerados, correcao: 1 }, altoImpacto: 1, entregas: 1 })
    expect(texto).toBe('Trabalhou no web a partir de set 2026: 1 entrega, entre elas 1 correção. Uma delas foi de alto impacto.')
  })
})

describe('montarPortfolio', () => {
  // "grande": criado por você, várias entregas, vários meses · "pequeno": uma correção
  const commits = [
    commit({ repo: 'empresa/grande', chamados: ['PV-1'], assunto: 'Initial commit', adicionadas: 900, data: '2026-03-01T12:00:00Z' }),
    commit({ repo: 'empresa/grande', chamados: ['PV-2'], assunto: 'feat: nova tela', data: '2026-05-01T12:00:00Z' }),
    commit({ repo: 'empresa/grande', chamados: ['PV-3'], assunto: 'fix: corrige data', data: '2026-07-01T12:00:00Z' }),
    commit({ repo: 'empresa/grande', assunto: 'ajusta', data: '2026-07-02T12:00:00Z' }),
    commit({ repo: 'empresa/pequeno', chamados: ['PV-9'], assunto: 'fix: x', data: '2026-06-01T12:00:00Z' }),
  ]
  const jira = { 'PV-1': issue('PV-1'), 'PV-2': issue('PV-2', { prioridade: 'High' }), 'PV-3': issue('PV-3'), 'PV-9': issue('PV-9') }

  function montar(n = 6) {
    const b = base(commits, jira)
    b.linguagens = { 'empresa/grande': [{ nome: 'TypeScript', cor: '#3178c6', bytes: 750 }, { nome: 'CSS', cor: '#663399', bytes: 250 }] }
    return montarPortfolio(montarModelo(b), n)
  }

  it('ordena pela nota e limita a n projetos', () => {
    const { projetos, avaliados } = montar(1)
    expect(avaliados).toBe(2)
    expect(projetos.map((p) => p.repo)).toEqual(['empresa/grande'])
  })

  it('o melhor em todos os critérios tira 100; a conta de cada critério acompanha', () => {
    const [grande, pequeno] = montar().projetos
    expect(grande.nota).toBe(100)
    expect(grande.notas.map((c) => c.pontos)).toEqual(CRITERIOS.map((c) => c.peso))
    expect(pequeno.nota).toBeLessThan(grande.nota)
    expect(pequeno.notas.find((c) => c.id === 'autoria')!.pontos).toBe(0)
    expect(pequeno.posicao).toBe(2)
  })

  it('números, período, papel e atividade mensal', () => {
    const [grande] = montar().projetos
    expect(grande).toMatchObject({ nome: 'grande', dono: 'empresa', slug: 'empresa-grande', criou: true, mesesAtivos: 3, inicio: '2026-03-01T12:00:00Z', fim: '2026-07-02T12:00:00Z' })
    expect(grande.numeros).toMatchObject({ entregas: 4, chamados: 3, altoImpacto: 1, commits: 4 })
    // escala de março a julho, comum a todos os projetos
    expect(grande.atividade).toEqual([1, 0, 1, 0, 2])
    expect(grande.resumo.startsWith('Criou o grande em mar 2026 e o evoluiu ao longo de 3 meses')).toBe(true)
  })

  it('destaques põem os chamados antes do "sem chamado" e o alto impacto primeiro', () => {
    const [grande] = montar().projetos
    expect(grande.destaques.map((d) => d.id)).toEqual(['PV-2', 'PV-1', 'PV-3', 'SC:empresa/grande'])
  })

  it('linguagens com a parte de cada uma; sem dado, lista vazia', () => {
    const [grande, pequeno] = montar().projetos
    expect(grande.linguagens.map((l) => [l.nome, l.parte])).toEqual([
      ['TypeScript', 0.75],
      ['CSS', 0.25],
    ])
    expect(pequeno.linguagens).toEqual([])
  })

  it('sem commits, portfólio vazio', () => {
    expect(montarPortfolio(montarModelo(base([])))).toMatchObject({ projetos: [], avaliados: 0, perfil: { entregas: 0, sistemas: 0, meses: 0, stack: [] } })
  })
})

describe('montarPortfolio: linguagens', () => {
  it('descarta linguagens com menos de 1% do código', () => {
    const b = base([commit({ repo: 'empresa/x' })])
    b.linguagens = { 'empresa/x': [{ nome: 'Go', cor: '#00add8', bytes: 995 }, { nome: 'Shell', cor: '#89e051', bytes: 5 }] }
    expect(montarPortfolio(montarModelo(b)).projetos[0].linguagens.map((l) => l.nome)).toEqual(['Go'])
  })
})

describe('apresentação', () => {
  it('tituloAmigavel tira o dono e troca hífens por espaços', () => {
    expect(tituloAmigavel('empresa/tychat-v2')).toBe('Tychat v2')
    expect(tituloAmigavel('voce/servicos_imob')).toBe('Servicos imob')
    expect(tituloAmigavel('sem-dono')).toBe('Sem dono')
  })

  it.each([
    ['[CONEXÃO] Modificar página de conexões', 'Modificar página de conexões'],
    ['[BUG] [UI] menu suspenso com espaço sobrando.', 'Menu suspenso com espaço sobrando'],
    ['PV-12: corrige login', 'Corrige login'],
    ['Implementa coleta automática', 'Implementa coleta automática'],
  ])('tituloLimpo: %s → %s', (entrada, esperado) => {
    expect(tituloLimpo(entrada)).toBe(esperado)
  })

  it('chamadaProjeto usa as duas frentes mais fortes; sem frente, o tipo dominante', () => {
    expect(
      chamadaProjeto({
        criou: true,
        frentes: [
          { id: 'qualidade', demandas: 1 },
          { id: 'integracoes', demandas: 5 },
          { id: 'ia', demandas: 3 },
        ],
        porTipo: tiposZerados,
      }),
    ).toBe('Sistema criado do zero, com foco em integrações e inteligência artificial.')
    expect(chamadaProjeto({ criou: false, frentes: [], porTipo: { ...tiposZerados, correcao: 4, melhoria: 1 } })).toBe('Sistema em evolução contínua, com foco em correções.')
    expect(chamadaProjeto({ criou: false, frentes: [], porTipo: tiposZerados })).toBe('Sistema em evolução contínua.')
  })

  it('card: vitrine com títulos limpos, sem "sem chamado", e capa de 26 semanas', () => {
    const b = base(
      [
        commit({ repo: 'empresa/app', chamados: ['PV-1'], data: '2026-09-01T12:00:00Z' }),
        commit({ repo: 'empresa/app', chamados: ['PV-2'], data: '2026-09-02T12:00:00Z' }),
        commit({ repo: 'empresa/app', data: '2026-09-03T12:00:00Z' }),
      ],
      { 'PV-1': issue('PV-1', { titulo: '[API] Integra pagamentos', prioridade: 'High' }), 'PV-2': issue('PV-2', { titulo: '[UI] nova tela de login' }) },
    )
    const { projetos, perfil } = montarPortfolio(montarModelo(b))
    expect(projetos[0].titulo).toBe('App')
    expect(projetos[0].vitrine).toEqual(['Integra pagamentos', 'Nova tela de login'])
    expect(projetos[0].entregas).toHaveLength(3)
    expect(projetos[0].capa.semanas).toHaveLength(26)
    expect(projetos[0].capa.diasAtivos).toBe(3)
    expect(perfil).toMatchObject({ entregas: 3, sistemas: 1, meses: 1 })
  })

  it('perfil: posicionamento pelas frentes de todo o trabalho e stack somada', () => {
    const b = base(
      [
        commit({ repo: 'empresa/a', chamados: ['PV-1'] }),
        commit({ repo: 'empresa/b', chamados: ['PV-2'] }),
      ],
      { 'PV-1': issue('PV-1', { titulo: 'Integração com a API de pagamentos' }), 'PV-2': issue('PV-2', { titulo: 'Rotina automática de cobrança' }) },
    )
    b.linguagens = {
      'empresa/a': [{ nome: 'TypeScript', cor: '#3178c6', bytes: 100 }],
      'empresa/b': [{ nome: 'TypeScript', cor: '#3178c6', bytes: 100 }, { nome: 'Python', cor: '#3572a5', bytes: 150 }],
    }
    const { perfil } = montarPortfolio(montarModelo(b))
    expect(perfil.posicionamento).toBe('Desenvolvimento de sistemas com foco em automação e integrações.')
    expect(perfil.stack.map((l) => [l.nome, l.bytes])).toEqual([
      ['TypeScript', 200],
      ['Python', 150],
    ])
  })
})

describe('títulos repetidos', () => {
  it('o mesmo nome em contas diferentes leva o dono', () => {
    const { projetos } = montarPortfolio(montarModelo(base([commit({ repo: 'empresa/app' }), commit({ repo: 'voce/app' }), commit({ repo: 'voce/site' })])))
    expect(projetos.map((p) => p.titulo).sort()).toEqual(['App · empresa', 'App · voce', 'Site'])
  })
})

describe('vitrine', () => {
  it('correções vão para o fim, mesmo sendo de alto impacto', () => {
    const b = base(
      [commit({ repo: 'empresa/app', chamados: ['PV-1'] }), commit({ repo: 'empresa/app', chamados: ['PV-2'] })],
      { 'PV-1': issue('PV-1', { titulo: 'Erro no login', tipo: 'Bug', prioridade: 'High' }), 'PV-2': issue('PV-2', { titulo: 'Exportação em PDF', tipo: 'Story', prioridade: 'Low' }) },
    )
    expect(montarPortfolio(montarModelo(b)).projetos[0].vitrine).toEqual(['Exportação em PDF', 'Erro no login'])
  })
})

describe('chamadaProjeto: novo sistema', () => {
  it('não repete "sistemas novos" depois de "criado do zero"', () => {
    expect(chamadaProjeto({ criou: true, frentes: [], porTipo: { ...tiposZerados, 'novo-sistema': 1 } })).toBe('Sistema criado do zero.')
    expect(chamadaProjeto({ criou: true, frentes: [], porTipo: { ...tiposZerados, 'novo-sistema': 2, melhoria: 1 } })).toBe('Sistema criado do zero, com foco em melhorias.')
  })
})
