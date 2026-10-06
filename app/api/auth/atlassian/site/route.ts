import type { NextRequest } from 'next/server'
import { modoHospedado } from '@/lib/modo'
import { foraDoModo, paraInicio } from '@/lib/rotasAuth'
import { abrir, COOKIE_JIRA, COOKIE_JIRA_SITES, DURACAO_JIRA, opcoesCookie, selar, type SessaoJira, type SitesPendentes } from '@/lib/sessao'

/** Escolha do site em /conectar-jira (formulário). Só aceita um dos sites que a Atlassian autorizou. */
export async function POST(pedido: NextRequest) {
  if (!modoHospedado()) return foraDoModo()
  const pendentes = abrir<SitesPendentes>(COOKIE_JIRA_SITES, pedido.cookies.get(COOKIE_JIRA_SITES)?.value)
  const id = (await pedido.formData().catch(() => null))?.get('site')
  const site = pendentes?.sites.find((s) => s.id === id)
  if (!pendentes || !site) return paraInicio(pedido, 'erro')

  const resposta = paraInicio(pedido)
  const sessao: SessaoJira = { access: pendentes.access, refresh: pendentes.refresh, accessExp: pendentes.accessExp, exp: Date.now() + DURACAO_JIRA * 1000, site }
  resposta.cookies.set(COOKIE_JIRA, selar(COOKIE_JIRA, sessao), opcoesCookie(DURACAO_JIRA))
  resposta.cookies.delete(COOKIE_JIRA_SITES)
  return resposta
}
