import type { NextRequest } from 'next/server'
import { paginaHistorico } from '@/lib/github'
import { corpo, erro, json, semSessao, sessaoGithub, tokenRecusado } from '@/lib/sessaoPedido'

export const maxDuration = 60

const NOME = /^[\w.-]{1,100}$/
const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/

/**
 * Uma página (até 100 commits) do histórico de uma branch. O autor é sempre
 * quem está logado: a rota não serve para ler os commits de outra pessoa.
 */
export async function POST(pedido: NextRequest) {
  const sessao = sessaoGithub(pedido)
  if (!sessao) return semSessao()
  const c = await corpo(pedido)
  const { dono, nome, branch, desde, depois } = c ?? {}
  if (
    typeof dono !== 'string' || !NOME.test(dono) ||
    typeof nome !== 'string' || !NOME.test(nome) ||
    typeof branch !== 'string' || !branch || branch.length > 255 ||
    typeof desde !== 'string' || !ISO.test(desde) ||
    (depois !== null && (typeof depois !== 'string' || depois.length > 200))
  ) {
    return erro('Pedido inválido.', 400)
  }
  try {
    return json(await paginaHistorico(sessao.token, { dono, nome, branch, desde, autor: sessao.usuario.id, depois }))
  } catch (e) {
    if (tokenRecusado(e)) return semSessao()
    return erro(e instanceof Error ? e.message : 'GitHub indisponível', 502)
  }
}
