import type { Fontes } from './coleta'
import type { PaginaCommits, Repo, Usuario } from './github'
import type { IssueJira } from './jira'

/**
 * Fontes da coleta no navegador (modo hospedado): cada leitura é um pedido
 * curto às rotas /api/coleta do painel, que usam o token do cookie da
 * pessoa. O token nunca chega a este código.
 */

/** O login venceu ou foi revogado: a pessoa precisa entrar de novo. */
export class SessaoExpirada extends Error {}

async function pedir<T>(caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(caminho, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const json = (await r.json().catch(() => ({}))) as T & { erro?: string; codigo?: string }
  if (r.status === 401 || json.codigo === 'sessao') throw new SessaoExpirada(json.erro ?? 'Sessão expirada.')
  if (!r.ok) throw new Error(json.erro ?? `O painel respondeu ${r.status}`)
  return json
}

export type Inicio = { usuario: Usuario; desde: string; repos: Repo[]; jira: { site: string; url: string } | null }

export const pedirInicio = () => pedir<Inicio>('/api/coleta/inicio')

/** Lote por pedido ao Jira: a rota aceita até 2000 chaves, mas lotes menores falham menos de uma vez. */
const LOTE_JIRA = 300

export function fontesNavegador(inicio: Inicio): Fontes {
  return {
    usuario: async () => inicio.usuario,
    repos: async () => inicio.repos,
    pagina: (repo, branch, desde, _autor, depois) => pedir<PaginaCommits>('/api/coleta/historico', { dono: repo.dono, nome: repo.nome, branch, desde, depois }),
    issues: inicio.jira
      ? async (chaves) => {
          const todas: Record<string, IssueJira> = {}
          for (let i = 0; i < chaves.length; i += LOTE_JIRA) Object.assign(todas, await pedir<Record<string, IssueJira>>('/api/coleta/jira', { chaves: chaves.slice(i, i + LOTE_JIRA) }))
          return todas
        }
      : null,
  }
}

export const pedirArquivos = (commits: { repo: string; hash: string }[]) => pedir<string[]>('/api/coleta/arquivos', { commits })
