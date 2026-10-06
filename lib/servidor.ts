import { connection } from 'next/server'
import { dashboardDe, type PeriodoId } from './analises'
import { arquivosMaisAlterados, commitsParaArquivos, demandaDe, painelDe, recortar, sistemaDe, type Modelo, type VisibilidadeId } from './dados'
import { obterBase, revisaoDados } from './fonte'
import { arquivosDoCommit, tokenLocal } from './github'
import { portfolioDe } from './portfolio'

/**
 * Dados das páginas no modo local: a coleta salva em data/ (lib/fonte.ts),
 * passada pelas mesmas funções puras que o navegador usa no modo hospedado.
 */

export async function modelo(visibilidade: VisibilidadeId = 'todos'): Promise<Modelo> {
  // os dados mudam com a coleta em segundo plano: nada aqui pode virar HTML estático no build
  await connection()
  return recortar(await obterBase(), visibilidade, revisaoDados())
}

export const obterPainel = async () => painelDe(await modelo())
export const obterDemanda = async (slug: string) => demandaDe(await modelo(), slug)
export const obterSistema = async (slug: string) => sistemaDe(await modelo(), slug)
export const obterDashboard = async (periodo: PeriodoId = 'tudo', visibilidade: VisibilidadeId = 'todos') => dashboardDe(await modelo(visibilidade), periodo, visibilidade)
export const obterPortfolio = async (visibilidade: VisibilidadeId = 'todos') => portfolioDe(await modelo(visibilidade), visibilidade)

/**
 * Arquivos mais alterados de uma demanda, pela API REST (uma chamada por
 * commit, com cache permanente). Fica fora de obterDemanda para a página
 * aparecer na hora e esta parte chegar depois (Suspense).
 */
export async function arquivosDaDemanda(id: string) {
  const token = tokenLocal()
  const listas = await Promise.all(commitsParaArquivos(await modelo(), id).map((c) => arquivosDoCommit(token, c.repo, c.hash)))
  return arquivosMaisAlterados(listas)
}
