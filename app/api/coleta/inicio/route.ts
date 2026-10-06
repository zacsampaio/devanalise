import type { NextRequest } from 'next/server'
import { DESDE, listarRepos } from '@/lib/github'
import { abrir, COOKIE_JIRA, type SessaoJira } from '@/lib/sessao'
import { erro, json, semSessao, sessaoGithub, tokenRecusado } from '@/lib/sessaoPedido'

export const maxDuration = 60

/**
 * Começo da coleta no navegador: quem é a pessoa, o período, os repositórios
 * (já filtrados por GITHUB_OWNERS/GITHUB_IGNORAR) e se o Jira está conectado.
 */
export async function GET(pedido: NextRequest) {
  const sessao = sessaoGithub(pedido)
  if (!sessao) return semSessao()
  try {
    const repos = await listarRepos(sessao.token)
    const jira = abrir<SessaoJira>(COOKIE_JIRA, pedido.cookies.get(COOKIE_JIRA)?.value)
    return json({ usuario: sessao.usuario, desde: DESDE, repos, jira: jira ? { site: jira.site.nome, url: jira.site.url } : null })
  } catch (e) {
    if (tokenRecusado(e)) return semSessao()
    return erro(e instanceof Error ? e.message : 'GitHub indisponível', 502)
  }
}
