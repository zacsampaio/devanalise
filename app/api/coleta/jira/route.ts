import type { NextRequest } from 'next/server'
import { buscarIssues } from '@/lib/jira'
import { corpo, erro, jiraDoPedido, json, semSessao, sessaoGithub } from '@/lib/sessaoPedido'

export const maxDuration = 60

const CHAVE = /^[A-Z][A-Z0-9]{0,9}-\d{1,6}$/

/** Issues do Jira pelas chaves citadas nos commits, com o token OAuth da pessoa. */
export async function POST(pedido: NextRequest) {
  if (!sessaoGithub(pedido)) return semSessao()
  const chaves = (await corpo(pedido))?.chaves
  if (!Array.isArray(chaves) || chaves.length > 2000 || !chaves.every((k) => typeof k === 'string' && CHAVE.test(k))) return erro('Pedido inválido.', 400)
  const jira = await jiraDoPedido(pedido)
  if (!jira) return erro('Jira desconectado: conecte de novo.', 409)
  try {
    return jira.gravar(json(await buscarIssues(chaves, jira.credencial)))
  } catch (e) {
    return jira.gravar(erro(e instanceof Error ? e.message : 'Jira indisponível', 502))
  }
}
