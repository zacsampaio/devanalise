import { describe, expect, it } from 'vitest'
import { filtrarPorVisibilidade, lerVisibilidade, montarModelo, nomeSistema } from '@/lib/dados'
import { base, commit } from './fabrica'

describe('lerVisibilidade', () => {
  it.each([
    [undefined, 'todos'],
    ['privados', 'privados'],
    ['publicos', 'publicos'],
    [['publicos', 'privados'], 'publicos'],
    ['qualquer', 'todos'],
  ] as const)('%s → %s', (entrada, esperado) => {
    expect(lerVisibilidade(entrada as string | string[] | undefined)).toBe(esperado)
  })
})

describe('filtrarPorVisibilidade', () => {
  const commits = [{ repo: 'a/privado' }, { repo: 'a/publico' }, { repo: 'a/desconhecido' }]
  const privados = { 'a/privado': true, 'a/publico': false }

  it('"todos" devolve tudo, inclusive repositórios sem visibilidade conhecida', () => {
    expect(filtrarPorVisibilidade(commits, privados, 'todos')).toBe(commits)
  })

  it('privados e públicos deixam de fora os desconhecidos', () => {
    expect(filtrarPorVisibilidade(commits, privados, 'privados').map((c) => c.repo)).toEqual(['a/privado'])
    expect(filtrarPorVisibilidade(commits, privados, 'publicos').map((c) => c.repo)).toEqual(['a/publico'])
  })

  it('sem nenhum dado de visibilidade, os recortes ficam vazios', () => {
    expect(filtrarPorVisibilidade(commits, {}, 'publicos')).toEqual([])
  })
})

describe('montarModelo num recorte', () => {
  it('os nomes seguem todos os repositórios: o mesmo sistema não muda de nome com o filtro', () => {
    const todos = [commit({ repo: 'empresa/api' }), commit({ repo: 'voce/api' })]
    const soPublicos = todos.filter((c) => c.repo === 'voce/api')
    const m = montarModelo(base(soPublicos), todos)
    expect(m.demandas).toHaveLength(1)
    expect(nomeSistema('voce/api')).toBe('voce/api')
    expect(m.demandas[0].sistemas).toEqual(['voce/api'])
  })
})
