/**
 * Integração com o Jira Cloud: as chaves citadas nos commits (ex.: "ABC-123")
 * são consultadas na API para trazer título, tipo, prioridade e status reais.
 *
 * Modo local (.env):
 *   JIRA_URL=https://sua-empresa.atlassian.net
 *   JIRA_EMAIL=voce@empresa.com
 *   JIRA_API_TOKEN=...            (id.atlassian.com → Security → API tokens)
 *   JIRA_PROJETOS=ABC,XYZ         (opcional: só essas chaves contam como chamado)
 *
 * Modo hospedado: o token OAuth da pessoa, pelo gateway api.atlassian.com.
 */

export type IssueJira = {
  chave: string
  titulo: string
  tipo: string
  prioridade: string | null
  status: string
  /** categoria do status no Jira: a fazer, em andamento ou concluído */
  categoria: 'new' | 'indeterminate' | 'done'
  url: string
}

const PROJETOS = new Set(
  (process.env.JIRA_PROJETOS ?? '')
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean),
)

/** Siglas que parecem chave do Jira mas não são (UTF-8, SHA-256, ISO-8601…). */
const NAO_SAO_CHAMADO = new Set(['UTF', 'ISO', 'SHA', 'MD', 'HTTP', 'HTTPS', 'RFC', 'CVE', 'CWE', 'TLS', 'SSL', 'AES', 'RSA', 'ES', 'PEP', 'WCAG', 'GPT', 'UUID', 'IPV', 'H', 'X', 'V'])

/**
 * Chaves do Jira citadas no texto. Com JIRA_PROJETOS, aceita só esses
 * projetos (e minúsculas, como "abc-12"); sem ele, qualquer chave em maiúsculas.
 */
export function extrairChamados(texto: string) {
  const chaves = PROJETOS.size
    ? [...texto.matchAll(/\b([A-Za-z][A-Za-z0-9]{0,9})[- ](\d{1,6})\b/g)].map((m) => `${m[1].toUpperCase()}-${m[2]}`).filter((c) => PROJETOS.has(c.split('-')[0]))
    : [...texto.matchAll(/\b([A-Z][A-Z0-9]{1,9})-(\d{1,6})\b/g)].filter((m) => !NAO_SAO_CHAMADO.has(m[1])).map((m) => `${m[1]}-${m[2]}`)
  return [...new Set(chaves)]
}

/** Origem do Jira (só https), ou null quando não configurado. */
function origemJira(): string | null {
  const bruto = process.env.JIRA_URL?.trim()
  if (!bruto || !process.env.JIRA_EMAIL?.trim() || !process.env.JIRA_API_TOKEN?.trim()) return null
  try {
    const url = new URL(bruto)
    // o token vai no cabeçalho: nunca enviar por http
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

export const jiraConfigurado = () => origemJira() !== null

/**
 * Como chegar ao Jira: `api` recebe as chamadas REST, `site` monta os links
 * das issues. No modo local é o próprio site com e-mail e token (Basic); no
 * hospedado, o gateway da Atlassian com o token OAuth da pessoa (Bearer).
 */
export type CredencialJira = { api: string; site: string; autorizacao: string }

/** Credencial do .env (modo local), ou null quando não configurado. */
export function credencialJiraLocal(): CredencialJira | null {
  const origem = origemJira()
  if (!origem) return null
  const basic = Buffer.from(`${process.env.JIRA_EMAIL!.trim()}:${process.env.JIRA_API_TOKEN!.trim()}`).toString('base64')
  return { api: origem, site: origem, autorizacao: `Basic ${basic}` }
}

/** Credencial OAuth (modo hospedado): o cloudId do site escolhido e o token da pessoa. */
export const credencialJiraOAuth = (cloudId: string, siteUrl: string, access: string): CredencialJira => ({
  api: `https://api.atlassian.com/ex/jira/${encodeURIComponent(cloudId)}`,
  site: siteUrl,
  autorizacao: `Bearer ${access}`,
})

type RespostaBulk = {
  issues?: {
    key: string
    fields: {
      summary: string
      issuetype?: { name: string }
      priority?: { name: string } | null
      status?: { name: string; statusCategory?: { key: string } }
    }
  }[]
}

const LOTE = 100

/**
 * Busca as issues pelas chaves (endpoint bulkfetch: chave inexistente não
 * derruba o lote, só fica de fora). Devolve um mapa chave → issue.
 */
export async function buscarIssues(chaves: string[], credencial: CredencialJira | null = credencialJiraLocal()): Promise<Record<string, IssueJira>> {
  if (!credencial) throw new Error('Jira não configurado (JIRA_URL https, JIRA_EMAIL e JIRA_API_TOKEN).')
  const resultado: Record<string, IssueJira> = {}

  for (let i = 0; i < chaves.length; i += LOTE) {
    const resposta = await fetch(`${credencial.api}/rest/api/3/issue/bulkfetch`, {
      method: 'POST',
      headers: { Authorization: credencial.autorizacao, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueIdsOrKeys: chaves.slice(i, i + LOTE), fields: ['summary', 'issuetype', 'priority', 'status'] }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    if (!resposta.ok) throw new Error(`Jira respondeu ${resposta.status}`)
    const json = (await resposta.json()) as RespostaBulk
    for (const issue of json.issues ?? []) {
      const categoria = issue.fields.status?.statusCategory?.key
      resultado[issue.key] = {
        chave: issue.key,
        titulo: issue.fields.summary,
        tipo: issue.fields.issuetype?.name ?? '',
        prioridade: issue.fields.priority?.name ?? null,
        status: issue.fields.status?.name ?? '',
        categoria: categoria === 'done' || categoria === 'indeterminate' ? categoria : 'new',
        url: `${credencial.site}/browse/${encodeURIComponent(issue.key)}`,
      }
    }
  }
  return resultado
}
