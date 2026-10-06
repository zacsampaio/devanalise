import type { CommitBase, Linguagem, PaginaCommits, Repo, Usuario } from './github'
import type { IssueJira } from './jira'

/**
 * O algoritmo da coleta incremental, sem saber de onde vêm os dados nem para
 * onde vão. Roda no servidor (modo local: GitHub direto, progresso salvo em
 * data/) e no navegador (modo hospedado: pelas rotas /api/coleta, tudo só em
 * memória na aba). Por isso aqui não entra nada de arquivo, .env ou cookie.
 *
 * Só os repositórios que receberam push desde a última leitura são relidos,
 * e só os commits a partir dali: o custo depende do que mudou, não do
 * tamanho do histórico.
 */

export const VERSAO_COLETA = 2

/** Folga ao reler um repositório: commits feitos antes e enviados (push) depois. */
const MARGEM_INCREMENTAL = 14 * 86_400_000

export type Coletado = {
  versao: number
  /** início do período coletado */
  desde: string
  usuario: Usuario | null
  /** fim da última atualização completa */
  atualizadoEm: string | null
  /** por repositório: o push que já foi lido e quando a leitura começou */
  repos: Record<string, { pushedAt: string; lidoEm: string }>
  commits: CommitBase[]
  jira: Record<string, IssueJira> | null
  /** linguagens por repositório ("dono/nome"), atualizadas a cada listagem */
  linguagens?: Record<string, Linguagem[]>
  /** repositório ("dono/nome") → privado?, atualizado a cada listagem */
  privados?: Record<string, boolean>
}

export type Progresso = { feitos: number; total: number }

/** O que as páginas recebem: a coleta mais o estado dela. */
export type Base = {
  geradoEm: string
  /** github: dados atualizados · arquivo: a última atualização falhou · coletando: primeira carga · vazio: nada */
  fonte: 'github' | 'arquivo' | 'coletando' | 'vazio'
  /** motivo de erro do GitHub ou do Jira, quando houver */
  aviso?: string
  /** atualização em andamento (null quando parada) */
  progresso: Progresso | null
  usuario: Usuario | null
  commits: CommitBase[]
  /** issues do Jira por chave; null quando o Jira não está configurado ou nunca respondeu */
  jira: Record<string, IssueJira> | null
  /** linguagens por repositório ("dono/nome"); vazio até a primeira atualização que as traga */
  linguagens: Record<string, Linguagem[]>
  /** repositório ("dono/nome") → privado?; vazio até a primeira atualização que traga a visibilidade */
  privados: Record<string, boolean>
}

export const coletaVazia = (desde: string): Coletado => ({ versao: VERSAO_COLETA, desde, usuario: null, atualizadoEm: null, repos: {}, commits: [], jira: null })

/** De onde a coleta lê. `issues` null = Jira não configurado/conectado. */
export type Fontes = {
  usuario: () => Promise<Usuario>
  repos: () => Promise<Repo[]>
  pagina: (repo: Repo, branch: string, desde: string, autor: string, depois: string | null) => Promise<PaginaCommits>
  issues: ((chaves: string[]) => Promise<Record<string, IssueJira>>) | null
}

export type Ganchos = {
  progresso?: (p: Progresso) => void
  /** chamado depois de cada repositório lido (o servidor salva o progresso a cada poucos) */
  repoLido?: (novos: number) => Promise<void> | void
  /** mensagem quando o Jira falhar (undefined quando respondeu) */
  avisoJira?: (aviso: string | undefined) => void
}

/** Executa `tarefa` para cada item com no máximo `limite` em paralelo. */
export async function emLotes<T>(itens: T[], limite: number, tarefa: (item: T) => Promise<void>) {
  const fila = [...itens]
  await Promise.all(
    Array.from({ length: Math.min(limite, fila.length) }, async () => {
      for (let item = fila.shift(); item !== undefined; item = fila.shift()) await tarefa(item)
    }),
  )
}

/**
 * Commits do autor (sem merges) em todas as branches do repositório, desde
 * `desde`. Branches cujo último commit é anterior a `desde` são puladas: não
 * há o que ler nelas — é o que torna as atualizações baratas.
 */
export async function historicoDoRepo(repo: Pick<Repo, 'branches'>, desde: string, pagina: (branch: string, depois: string | null) => Promise<PaginaCommits>): Promise<CommitBase[]> {
  const vistos = new Set<string>()
  const commits: CommitBase[] = []
  for (const branch of repo.branches) {
    if (branch.ultimoCommit < desde) continue
    let depois: string | null = null
    do {
      const r: PaginaCommits = await pagina(branch.nome, depois)
      for (const c of r.commits) {
        if (vistos.has(c.hash)) continue
        vistos.add(c.hash)
        commits.push(c)
      }
      depois = r.proxima
    } while (depois)
  }
  return commits
}

/**
 * Atualiza `dados` no lugar. `desde`: início do período (PAINEL_DESDE ou 12
 * meses). Erro do GitHub interrompe (e propaga); erro do Jira só vira aviso.
 */
export async function coletar(dados: Coletado, fontes: Fontes, desde: string, ganchos: Ganchos = {}) {
  const usuario = await fontes.usuario()

  // outra conta ou período ampliado para trás: relê tudo
  if (dados.usuario && dados.usuario.id !== usuario.id) Object.assign(dados, coletaVazia(desde))
  if (desde < dados.desde) dados.repos = {}
  dados.desde = desde
  dados.usuario = usuario

  const repos = await fontes.repos()
  // vêm na mesma listagem: atualiza todos, não só os dos repositórios com push novo
  dados.linguagens = { ...dados.linguagens, ...Object.fromEntries(repos.map((r) => [r.completo, r.linguagens])) }
  dados.privados = { ...dados.privados, ...Object.fromEntries(repos.map((r) => [r.completo, r.privado])) }
  const pendentes = repos.filter((r) => {
    const lido = dados.repos[r.completo]
    return !lido || r.pushedAt > lido.pushedAt
  })
  let feitos = 0
  ganchos.progresso?.({ feitos, total: pendentes.length })

  const vistos = new Set(dados.commits.map((c) => c.hash))
  // 2 repositórios por vez: mais que isso aciona o limite secundário do GitHub e tudo fica lento
  await emLotes(pendentes, 2, async (repo) => {
    const lido = dados.repos[repo.completo]
    const inicio = new Date().toISOString()
    const aPartir = lido ? new Date(Math.max(+new Date(desde), +new Date(lido.lidoEm) - MARGEM_INCREMENTAL)).toISOString() : desde
    const novos = (await historicoDoRepo(repo, aPartir, (branch, depois) => fontes.pagina(repo, branch, aPartir, usuario.id, depois))).filter((c) => !vistos.has(c.hash))
    for (const c of novos) vistos.add(c.hash)
    // nova lista (não push): quem já leu a anterior continua vendo um retrato consistente
    if (novos.length) dados.commits = [...dados.commits, ...novos].sort((a, b) => b.data.localeCompare(a.data))
    dados.repos[repo.completo] = { pushedAt: repo.pushedAt, lidoEm: inicio }
    ganchos.progresso?.({ feitos: ++feitos, total: pendentes.length })
    await ganchos.repoLido?.(novos.length)
  })

  await coletarJira(dados, fontes.issues, ganchos.avisoJira)
  dados.atualizadoEm = new Date().toISOString()
}

/** Consulta só as chaves novas e as que ainda não estavam concluídas no Jira. */
async function coletarJira(dados: Coletado, issues: Fontes['issues'], aviso?: Ganchos['avisoJira']) {
  if (!issues) {
    dados.jira = null
    return
  }
  const conhecidas = dados.jira ?? {}
  const chaves = [...new Set(dados.commits.flatMap((c) => c.chamados))]
  const consultar = chaves.filter((k) => !conhecidas[k] || conhecidas[k].categoria !== 'done')
  try {
    const novas = consultar.length ? await issues(consultar) : {}
    dados.jira = { ...conhecidas, ...novas }
    aviso?.(undefined)
  } catch (erro) {
    const texto = `Jira indisponível: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`
    aviso?.(texto)
    console.error('[painel]', texto)
  }
}
