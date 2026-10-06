import type { NextRequest } from 'next/server'
import { jiraOAuthDisponivel, modoHospedado } from '@/lib/modo'
import { origemPublica, urlAutorizacaoAtlassian } from '@/lib/oauth'
import { foraDoModo, irParaProvedor } from '@/lib/rotasAuth'

/** "Conectar Jira": manda para o consentimento da Atlassian (o proxy já exige o login do GitHub). */
export function GET(pedido: NextRequest) {
  if (!modoHospedado() || !jiraOAuthDisponivel()) return foraDoModo()
  const origem = origemPublica(pedido)
  return irParaProvedor('atlassian', (state) => urlAutorizacaoAtlassian(origem, state))
}
