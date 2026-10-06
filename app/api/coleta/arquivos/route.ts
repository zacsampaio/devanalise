import type { NextRequest } from 'next/server'
import { arquivosMaisAlterados } from '@/lib/dados'
import { arquivosDoCommit, NOME_REPO, SHA } from '@/lib/github'
import { corpo, erro, json, semSessao, sessaoGithub } from '@/lib/sessaoPedido'

/** Arquivos mais alterados de uma demanda (até 20 commits), com o token da pessoa e sem cache compartilhado. */
export async function POST(pedido: NextRequest) {
  const sessao = sessaoGithub(pedido)
  if (!sessao) return semSessao()
  const commits = (await corpo(pedido))?.commits
  const validos =
    Array.isArray(commits) &&
    commits.length <= 20 &&
    commits.every((c) => c && typeof c.repo === 'string' && NOME_REPO.test(c.repo) && typeof c.hash === 'string' && SHA.test(c.hash))
  if (!validos) return erro('Pedido inválido.', 400)
  const listas = await Promise.all((commits as { repo: string; hash: string }[]).map((c) => arquivosDoCommit(sessao.token, c.repo, c.hash, false)))
  return json(arquivosMaisAlterados(listas))
}
