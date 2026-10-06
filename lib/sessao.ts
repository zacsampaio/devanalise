import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { Usuario } from './github'

/**
 * Sessão do modo hospedado, inteira em cookies httpOnly criptografados
 * (AES-256-GCM com chave derivada de SESSAO_SEGREDO). Nada vai para banco:
 * sair apaga os cookies e acabou.
 *
 * O nome do cookie entra como dado autenticado: o conteúdo de um cookie não
 * serve em outro (ex.: o do Jira no lugar do do GitHub).
 */

export const COOKIE_GITHUB = 'painel_gh'
export const COOKIE_JIRA = 'painel_jira'
/** state do OAuth em andamento (anti-CSRF), 10 minutos */
export const COOKIE_OAUTH = 'painel_oauth'
/** tokens da Atlassian enquanto a pessoa escolhe o site, 10 minutos */
export const COOKIE_JIRA_SITES = 'painel_jira_sites'

export type SessaoGithub = { token: string; exp: number; usuario: Usuario }
export type SiteJira = { id: string; url: string; nome: string }
/** `exp`: validade da sessão; `accessExp`: do token de acesso (1 h, renovado com o refresh). */
export type SessaoJira = { access: string; refresh?: string; accessExp: number; exp: number; site: SiteJira }
export type EstadoOAuth = { state: string; provedor: 'github' | 'atlassian'; exp: number }
export type SitesPendentes = { access: string; refresh?: string; accessExp: number; exp: number; sites: SiteJira[] }

const chave = () => {
  const segredo = process.env.SESSAO_SEGREDO?.trim() ?? ''
  if (segredo.length < 32) throw new Error('SESSAO_SEGREDO precisa ter 32 caracteres ou mais.')
  return createHash('sha256').update(segredo).digest()
}

/** Criptografa `dados` para o cookie `nome`: base64url(iv · tag · texto). */
export function selar(nome: string, dados: unknown): string {
  const iv = randomBytes(12)
  const cifra = createCipheriv('aes-256-gcm', chave(), iv)
  cifra.setAAD(Buffer.from(nome))
  const texto = Buffer.concat([cifra.update(JSON.stringify(dados), 'utf8'), cifra.final()])
  return Buffer.concat([iv, cifra.getAuthTag(), texto]).toString('base64url')
}

/** Abre um cookie selado. Adulterado, de outro cookie, de outra chave ou vencido: null. */
export function abrir<T extends { exp: number }>(nome: string, valor: string | undefined): T | null {
  if (!valor) return null
  try {
    const bruto = Buffer.from(valor, 'base64url')
    if (bruto.length < 29) return null
    const decifra = createDecipheriv('aes-256-gcm', chave(), bruto.subarray(0, 12))
    decifra.setAAD(Buffer.from(nome))
    decifra.setAuthTag(bruto.subarray(12, 28))
    const dados = JSON.parse(Buffer.concat([decifra.update(bruto.subarray(28)), decifra.final()]).toString('utf8')) as T
    return typeof dados.exp === 'number' && dados.exp > Date.now() ? dados : null
  } catch {
    return null
  }
}

/** Opções dos cookies da sessão. `segundos` = validade no navegador. */
export const opcoesCookie = (segundos: number) => ({
  httpOnly: true,
  // http só no `next dev` em localhost; em produção, sempre https
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: Math.max(0, Math.floor(segundos)),
})

/** Validade da sessão do GitHub: 8 h, sem renovação (o token do OAuth App não vence; "Sair" o revoga). */
export const DURACAO_GITHUB = 8 * 3600

/**
 * Validade do cookie do Jira no navegador: a mesma da sessão do GitHub. O
 * token de acesso dentro dele vence em 1 h e é renovado (refresh) no caminho.
 */
export const DURACAO_JIRA = DURACAO_GITHUB

/** O token de acesso do Jira vence em menos de 5 minutos? */
export const precisaRenovar = (s: SessaoJira) => s.accessExp - Date.now() < 300_000
