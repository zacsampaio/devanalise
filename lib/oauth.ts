import type { SessaoJira, SiteJira } from './sessao'

/**
 * Trocas de código por token dos dois provedores. Os segredos dos apps ficam
 * só no servidor; o navegador nunca vê token nenhum (vão em cookie httpOnly).
 *
 * - GitHub App: permissões só de leitura (Contents e Metadata), token de 8 h.
 * - Atlassian (OAuth 2.0 3LO): read:jira-work + offline_access; o token de
 *   acesso dura 1 h e é renovado com o refresh token (que muda a cada troca).
 */

/** Endereço público do painel: PAINEL_URL ou a origem do próprio pedido. */
export const origemPublica = (pedido: { nextUrl: { origin: string } }) => (process.env.PAINEL_URL?.trim().replace(/\/+$/, '') || pedido.nextUrl.origin)

export const urlCallback = (origem: string, provedor: 'github' | 'atlassian') => `${origem}/api/auth/${provedor}/callback`

export function urlAutorizacaoGithub(origem: string, state: string) {
  const u = new URL('https://github.com/login/oauth/authorize')
  u.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!.trim())
  u.searchParams.set('redirect_uri', urlCallback(origem, 'github'))
  u.searchParams.set('state', state)
  return u.toString()
}

export async function trocarCodigoGithub(origem: string, code: string): Promise<{ token: string; expiraEm: number | null }> {
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!.trim(),
      client_secret: process.env.GITHUB_CLIENT_SECRET!.trim(),
      code,
      redirect_uri: urlCallback(origem, 'github'),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string }
  if (!r.ok || !j.access_token) throw new Error(`GitHub recusou o login${j.error ? ` (${j.error})` : ''}`)
  return { token: j.access_token, expiraEm: j.expires_in ? Date.now() + j.expires_in * 1000 : null }
}

export const ESCOPOS_ATLASSIAN = 'read:jira-work offline_access'

export function urlAutorizacaoAtlassian(origem: string, state: string) {
  const u = new URL('https://auth.atlassian.com/authorize')
  u.searchParams.set('audience', 'api.atlassian.com')
  u.searchParams.set('client_id', process.env.ATLASSIAN_CLIENT_ID!.trim())
  u.searchParams.set('scope', ESCOPOS_ATLASSIAN)
  u.searchParams.set('redirect_uri', urlCallback(origem, 'atlassian'))
  u.searchParams.set('state', state)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('prompt', 'consent')
  return u.toString()
}

type TokensAtlassian = { access: string; refresh?: string; accessExp: number }

async function tokenAtlassian(corpo: Record<string, string>): Promise<TokensAtlassian> {
  const r = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.ATLASSIAN_CLIENT_ID!.trim(), client_secret: process.env.ATLASSIAN_CLIENT_SECRET!.trim(), ...corpo }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
  if (!r.ok || !j.access_token) throw new Error(`Atlassian recusou o acesso${j.error ? ` (${j.error})` : ''}`)
  return { access: j.access_token, refresh: j.refresh_token, accessExp: Date.now() + (j.expires_in ?? 3600) * 1000 }
}

export const trocarCodigoAtlassian = (origem: string, code: string) =>
  tokenAtlassian({ grant_type: 'authorization_code', code, redirect_uri: urlCallback(origem, 'atlassian') })

/** Renova o acesso ao Jira. O refresh token antigo deixa de valer: grave o novo. */
export async function renovarJira(sessao: SessaoJira): Promise<SessaoJira> {
  if (!sessao.refresh) throw new Error('Sessão do Jira sem renovação.')
  const novos = await tokenAtlassian({ grant_type: 'refresh_token', refresh_token: sessao.refresh })
  return { ...sessao, access: novos.access, refresh: novos.refresh ?? sessao.refresh, accessExp: novos.accessExp }
}

/** Sites do Jira que o token pode ler. */
export async function sitesAtlassian(access: string): Promise<SiteJira[]> {
  const r = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${access}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!r.ok) throw new Error(`Atlassian respondeu ${r.status}`)
  const lista = (await r.json()) as { id: string; url: string; name: string; scopes?: string[] }[]
  return lista
    .filter((s) => !s.scopes || s.scopes.includes('read:jira-work'))
    .filter((s) => /^https:\/\//.test(s.url))
    .map((s) => ({ id: s.id, url: s.url.replace(/\/+$/, ''), nome: s.name }))
}
