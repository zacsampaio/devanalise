'use client'

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { coletar, coletaVazia, VERSAO_COLETA, type Base, type Coletado, type Progresso } from '@/lib/coleta'
import { fontesNavegador, pedirInicio, SessaoExpirada } from '@/lib/coletaNavegador'
import type { Usuario } from '@/lib/github'

/**
 * Coleta do modo hospedado, feita pelo navegador e guardada só nesta aba
 * (memória + sessionStorage, que some ao fechar a aba). Sair apaga tudo.
 * Nada do que é coletado passa a existir no servidor.
 */

export type JiraConectado = { site: string; url: string } | null

type Estado = {
  dados: Coletado | null
  /** muda quando os dados mudam: chave de memoização do modelo */
  versao: number
  progresso: Progresso | null
  erro?: string
  avisoJira?: string
}

type ValorColeta = {
  base: Base
  versao: string
  atualizar: () => void
  usuario: Usuario
  jira: JiraConectado
  /** o servidor tem o app da Atlassian configurado (mostra "Conectar Jira") */
  jiraDisponivel: boolean
}

const Contexto = createContext<ValorColeta | null>(null)

export function useColeta() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useColeta fora do ProvedorColeta')
  return valor
}

const PREFIXO = 'painel:'
type Guardado = { dados: Coletado; jira: string | null }

function ler(chave: string, jira: JiraConectado): Coletado | null {
  try {
    const g = JSON.parse(sessionStorage.getItem(chave) ?? 'null') as Guardado | null
    if (!g || g.dados.versao !== VERSAO_COLETA) return null
    // outro site do Jira (ou desconectado): as issues guardadas não valem mais
    if (g.jira !== (jira?.url ?? null)) g.dados.jira = null
    return g.dados
  } catch {
    return null
  }
}

function guardar(chave: string, dados: Coletado, jira: JiraConectado) {
  try {
    sessionStorage.setItem(chave, JSON.stringify({ dados, jira: jira?.url ?? null } satisfies Guardado))
  } catch {
    // cheio ou bloqueado: a coleta segue só em memória
  }
}

/** Apaga a coleta guardada nesta aba (ao sair ou quando a sessão vence). */
export function esquecerColeta() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIXO)) sessionStorage.removeItem(k)
  } catch {
    // sem acesso ao armazenamento: não há o que apagar
  }
}

// começa "coletando": a primeira pintura (inclusive a do servidor) mostra o progresso, não "nenhum commit"
const INICIAL: Estado = { dados: null, versao: 0, progresso: { feitos: 0, total: 0 } }
const lerInicial = () => INICIAL

/** Estado da coleta fora do React: a coleta muda os dados aos poucos e avisa quem assina. */
function criarLoja(chave: string, jira: JiraConectado) {
  let estado = INICIAL
  let rodando = false
  let carregado = false
  const ouvintes = new Set<() => void>()
  const definir = (parte: Partial<Estado>) => {
    estado = { ...estado, ...parte }
    for (const f of ouvintes) f()
  }

  async function atualizar() {
    if (rodando) return
    rodando = true
    definir({ erro: undefined, progresso: { feitos: 0, total: 0 } })
    try {
      const inicio = await pedirInicio()
      const d = estado.dados ?? coletaVazia(inicio.desde)
      let lidos = 0
      await coletar(d, fontesNavegador(inicio), inicio.desde, {
        progresso: (progresso) => definir({ progresso }),
        repoLido: (novos) => {
          // `d` é mudado no lugar: uma cópia rasa faz o React ver a mudança
          if (novos) definir({ dados: { ...d }, versao: estado.versao + 1 })
          if (++lidos % 5 === 0) guardar(chave, d, inicio.jira)
        },
        avisoJira: (avisoJira) => definir({ avisoJira }),
      })
      guardar(chave, d, inicio.jira)
      definir({ dados: { ...d }, versao: estado.versao + 1 })
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        esquecerColeta()
        window.location.replace('/entrar')
        return
      }
      definir({ erro: e instanceof Error ? e.message : 'erro desconhecido' })
    } finally {
      rodando = false
      definir({ progresso: null })
    }
  }

  return {
    assinar: (f: () => void) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    ler: () => estado,
    atualizar,
    /** ao abrir a aba: mostra o que já foi coletado nela e atualiza (só lê o que mudou) */
    iniciar() {
      if (!carregado) {
        carregado = true
        const guardado = ler(chave, jira)
        if (guardado) definir({ dados: guardado, versao: estado.versao + 1 })
      }
      void atualizar()
    },
  }
}

export function ProvedorColeta({ usuario, jira, jiraDisponivel, children }: { usuario: Usuario; jira: JiraConectado; jiraDisponivel: boolean; children: ReactNode }) {
  const chave = `${PREFIXO}coleta:${usuario.id}`
  const jiraUrl = jira?.url ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `jira` muda de identidade a cada render do servidor; o que importa é o site
  const loja = useMemo(() => criarLoja(chave, jira), [chave, jiraUrl])
  const estado = useSyncExternalStore(loja.assinar, loja.ler, lerInicial)

  useEffect(() => loja.iniciar(), [loja])

  const valor = useMemo<ValorColeta>(() => {
    const d = estado.dados
    const commits = d?.commits ?? []
    const base: Base = {
      geradoEm: d?.atualizadoEm ?? new Date().toISOString(),
      fonte: commits.length ? (estado.erro ? 'arquivo' : 'github') : estado.progresso ? 'coletando' : 'vazio',
      aviso: estado.erro ? `GitHub: ${estado.erro}` : estado.avisoJira,
      progresso: estado.progresso,
      usuario: d?.usuario ?? usuario,
      commits,
      jira: d?.jira ?? null,
      linguagens: d?.linguagens ?? {},
      privados: d?.privados ?? {},
    }
    return { base, versao: String(estado.versao), atualizar: () => void loja.atualizar(), usuario, jira, jiraDisponivel }
  }, [estado, loja, usuario, jira, jiraDisponivel])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
