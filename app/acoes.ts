'use server'

import { forcarAtualizacao } from '@/lib/fonte'
import { modoHospedado } from '@/lib/modo'

/** Intervalo mínimo entre duas atualizações forçadas. */
const INTERVALO_MINIMO = 60_000
let ultimaAtualizacao = 0

/**
 * "Atualizar agora": começa uma atualização em segundo plano (incremental:
 * só lê o que mudou) e volta na hora. A ação é um endpoint POST dentro do
 * painel (protegido pelo proxy.ts), então é limitada para não esgotar o rate
 * limit da API.
 */
export async function atualizarAgora(): Promise<{ ok: boolean; aguardarSegundos?: number }> {
  // no modo hospedado a coleta é do navegador de cada pessoa: não há coleta do servidor para disparar
  if (modoHospedado()) return { ok: false }
  const agora = Date.now()
  const falta = ultimaAtualizacao + INTERVALO_MINIMO - agora
  if (falta > 0) return { ok: false, aguardarSegundos: Math.ceil(falta / 1000) }
  ultimaAtualizacao = agora
  await forcarAtualizacao()
  return { ok: true }
}
