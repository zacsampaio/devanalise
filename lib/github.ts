import { extrairChamados } from './jira'

/**
 * Leitura dos commits direto da API do GitHub (GraphQL). O painel mostra os
 * commits da conta dona do token, em todos os repositórios a que ela tem
 * acesso (próprios, de colaboração e de organizações). O token vem do
 * GITHUB_TOKEN (modo local) ou do login da pessoa (modo hospedado): toda
 * função que fala com o GitHub o recebe como parâmetro.
 *
 * As funções aqui são as peças da coleta incremental (lib/coleta.ts): listar os
 * repositórios com a data do último push e ler o histórico de um repositório a
 * partir de uma data — assim, depois da primeira carga, só o que mudou é lido.
 */

/** Início do período analisado: PAINEL_DESDE ou os últimos 12 meses. */
export const DESDE = process.env.PAINEL_DESDE?.trim() || new Date(Date.now() - 365 * 86_400_000).toISOString()

const lista = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)

/** Donos (usuários ou organizações) cujos repositórios entram no painel; vazio = todos. */
const DONOS = new Set(lista(process.env.GITHUB_OWNERS))
/** Repositórios que não entram no painel ("dono/nome" ou só "nome"). */
const IGNORADOS = new Set(lista(process.env.GITHUB_IGNORAR))

/** O repositório ("dono/nome") passa pelos filtros GITHUB_OWNERS e GITHUB_IGNORAR? */
export function repoPermitido(completo: string) {
  const [dono = '', nome = ''] = completo.toLowerCase().split('/')
  if (DONOS.size && !DONOS.has(dono)) return false
  return !IGNORADOS.has(completo.toLowerCase()) && !IGNORADOS.has(nome)
}

export type Usuario = { id: string; login: string; nome: string; avatar: string }

/** Formato da coleta salva em data/. */
export type CommitBase = {
  /** "dono/nome" */
  repo: string
  hash: string
  data: string
  assunto: string
  corpo: string
  /** chaves do Jira citadas na mensagem (candidatas: o Jira confirma depois) */
  chamados: string[]
  arquivos: number
  adicionadas: number
  removidas: number
  url: string
}

/** GITHUB_TOKEN do .env (modo local), ou null. */
export const tokenLocal = () => process.env.GITHUB_TOKEN?.trim() || null

export const githubConfigurado = () => Boolean(tokenLocal())

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Chamada GraphQL com novas tentativas. Respeita o limite secundário do
 * GitHub (403/429 com retry-after): muitas chamadas simultâneas do mesmo
 * token deixam todas lentas, então a coleta usa pouca concorrência.
 */
async function graphql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!token) throw new Error('GITHUB_TOKEN não configurado.')
  for (let tentativa = 1; ; tentativa++) {
    try {
      const resposta = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      })
      if (resposta.status === 403 || resposta.status === 429) {
        // limite de requisições: espera o que o GitHub pedir (até 2 min) e tenta de novo
        const segundos = Number(resposta.headers.get('retry-after')) || 30 * tentativa
        if (tentativa >= 4) throw Object.assign(new Error(`GitHub limitou as requisições (HTTP ${resposta.status})`), { definitivo: true })
        await esperar(Math.min(segundos, 120) * 1000)
        continue
      }
      if (resposta.status === 401) throw Object.assign(new Error('GitHub recusou o token (HTTP 401)'), { definitivo: true, naoAutorizado: true })
      if (resposta.status >= 500) throw new Error(`GitHub respondeu ${resposta.status}`)
      if (!resposta.ok) throw Object.assign(new Error(`GitHub respondeu ${resposta.status}`), { definitivo: true })
      const json = (await resposta.json()) as { data?: T; errors?: { message: string; type?: string }[] }
      if (json.errors?.length) {
        const limitado = json.errors.some((e) => e.type === 'RATE_LIMITED')
        throw Object.assign(new Error(`GitHub: ${json.errors.map((e) => e.message).join('; ')}`), { definitivo: !limitado })
      }
      return json.data!
    } catch (erro) {
      if (tentativa >= 4 || (erro as { definitivo?: boolean }).definitivo) throw erro
      await esperar(2_000 * tentativa)
    }
  }
}

type Pagina<T> = { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: T[] }

export async function obterUsuario(token: string): Promise<Usuario> {
  const { viewer } = await graphql<{ viewer: { id: string; login: string; name: string | null; avatarUrl: string } }>(token, `query { viewer { id login name avatarUrl } }`)
  return { id: viewer.id, login: viewer.login, nome: viewer.name || viewer.login, avatar: viewer.avatarUrl }
}

const Q_REPOS = `
query ($depois: String) {
  viewer {
    repositories(first: 50, after: $depois, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name nameWithOwner owner { login } pushedAt isPrivate
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
        refs(refPrefix: "refs/heads/", first: 100) { nodes { name target { ... on Commit { committedDate } } } }
      }
    }
  }
}`

type NoRepo = {
  name: string
  nameWithOwner: string
  owner: { login: string }
  pushedAt: string | null
  isPrivate: boolean
  languages: { edges: { size: number; node: { name: string; color: string | null } }[] } | null
  refs: { nodes: { name: string; target: { committedDate?: string } | null }[] } | null
}

/** Linguagem do repositório, pelo tamanho do código (dado do próprio GitHub). */
export type Linguagem = { nome: string; cor: string; bytes: number }

export type Repo = {
  dono: string
  nome: string
  completo: string
  pushedAt: string
  /** branches com a data do último commit de cada uma */
  branches: { nome: string; ultimoCommit: string }[]
  linguagens: Linguagem[]
  privado: boolean
}

/** Repositórios acessíveis com push desde DESDE (os demais não têm commit novo para ler). */
export async function listarRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = []
  let depois: string | null = null
  do {
    const dados: { viewer: { repositories: Pagina<NoRepo> } } = await graphql(token, Q_REPOS, { depois })
    const pagina = dados.viewer.repositories
    for (const r of pagina.nodes) {
      if (!repoPermitido(r.nameWithOwner) || !r.pushedAt || r.pushedAt < DESDE) continue
      repos.push({
        dono: r.owner.login,
        nome: r.name,
        completo: r.nameWithOwner,
        pushedAt: r.pushedAt,
        branches: (r.refs?.nodes ?? []).map((b) => ({ nome: b.name, ultimoCommit: b.target?.committedDate ?? r.pushedAt! })),
        privado: r.isPrivate,
        linguagens: (r.languages?.edges ?? []).map((e) => ({ nome: e.node.name, cor: e.node.color ?? '#8a8699', bytes: e.size })),
      })
    }
    depois = pagina.pageInfo.hasNextPage ? pagina.pageInfo.endCursor : null
  } while (depois)
  return repos
}

const Q_HISTORICO = `
query ($dono: String!, $repo: String!, $ref: String!, $desde: GitTimestamp!, $autor: ID!, $depois: String) {
  repository(owner: $dono, name: $repo) {
    ref(qualifiedName: $ref) {
      target {
        ... on Commit {
          history(first: 100, since: $desde, after: $depois, author: { id: $autor }) {
            pageInfo { hasNextPage endCursor }
            nodes { oid message authoredDate additions deletions changedFilesIfAvailable url parents { totalCount } }
          }
        }
      }
    }
  }
}`

type NoCommit = {
  oid: string
  message: string
  authoredDate: string
  additions: number
  deletions: number
  changedFilesIfAvailable: number | null
  url: string
  parents: { totalCount: number }
}

type RespostaHistorico = { repository: { ref: { target: { history?: Pagina<NoCommit> } } | null } | null }

/** Uma página (até 100) do histórico de uma branch: commits do autor, sem merges. */
export async function paginaHistorico(
  token: string,
  alvo: { dono: string; nome: string; branch: string; desde: string; autor: string; depois: string | null },
): Promise<PaginaCommits> {
  const dados = await graphql<RespostaHistorico>(token, Q_HISTORICO, {
    dono: alvo.dono,
    repo: alvo.nome,
    ref: `refs/heads/${alvo.branch}`,
    desde: alvo.desde,
    autor: alvo.autor,
    depois: alvo.depois,
  })
  const historico = dados.repository?.ref?.target.history
  if (!historico) return { commits: [], proxima: null }
  const completo = `${alvo.dono}/${alvo.nome}`
  const commits = historico.nodes
    .filter((c) => c.parents.totalCount <= 1)
    .map<CommitBase>((c) => {
      // messageHeadline vem cortado em ~70 caracteres; a mensagem inteira não
      const [assunto = '', ...resto] = c.message.split(/\r?\n/)
      return {
        repo: completo,
        hash: c.oid,
        data: c.authoredDate,
        assunto: assunto.trim(),
        corpo: resto.join('\n').trim(),
        chamados: extrairChamados(c.message),
        arquivos: c.changedFilesIfAvailable ?? 0,
        adicionadas: c.additions,
        removidas: c.deletions,
        url: c.url,
      }
    })
  return { commits, proxima: historico.pageInfo.hasNextPage ? historico.pageInfo.endCursor : null }
}

export type PaginaCommits = { commits: CommitBase[]; proxima: string | null }

export const NOME_REPO = /^[\w.-]+\/[\w.-]+$/
export const SHA = /^[0-9a-f]{40}$/i

/**
 * Arquivos de um commit (REST). Commit não muda: no modo local o cache é
 * permanente. No hospedado, `compartilhar = false`: a resposta, feita com o
 * token de uma pessoa, não pode ir para o cache comum do servidor.
 */
export async function arquivosDoCommit(token: string | null, repo: string, sha: string, compartilhar = true): Promise<{ arquivo: string; mudancas: number }[]> {
  // repo e sha vêm da coleta, mas a URL só é montada com valores no formato esperado
  if (!token || !NOME_REPO.test(repo) || !SHA.test(sha)) return []
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      cache: compartilhar ? 'force-cache' : 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) return []
    const j = (await r.json()) as { files?: { filename: string; changes: number }[] }
    return (j.files ?? []).map((f) => ({ arquivo: f.filename, mudancas: f.changes }))
  } catch {
    return []
  }
}
