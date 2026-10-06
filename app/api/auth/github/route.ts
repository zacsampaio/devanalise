import type { NextRequest } from 'next/server'
import { faltandoHospedado, modoHospedado } from '@/lib/modo'
import { origemPublica, urlAutorizacaoGithub } from '@/lib/oauth'
import { foraDoModo, irParaProvedor, paraEntrar } from '@/lib/rotasAuth'

/** "Entrar com GitHub": manda para a tela de autorização do GitHub App. */
export function GET(pedido: NextRequest) {
  if (!modoHospedado()) return foraDoModo()
  if (faltandoHospedado().length) return paraEntrar(pedido, 'config')
  const origem = origemPublica(pedido)
  return irParaProvedor('github', (state) => urlAutorizacaoGithub(origem, state))
}
