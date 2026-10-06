/**
 * Confere o acesso do painel ao GitHub e ao Jira sem mostrar segredos.
 * Uso: npm run testar
 */
import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const env = (v) => process.env[v]?.trim() ?? ''
const tem = (v) => (env(v) ? 'preenchido' : 'vazio')

console.log('Configuração lida do .env:')
console.log(`  GITHUB_TOKEN ....... ${tem('GITHUB_TOKEN')}`)
console.log(`  GITHUB_OWNERS ...... ${env('GITHUB_OWNERS') || 'todos'}`)
console.log(`  JIRA_URL ........... ${env('JIRA_URL') || 'vazio'}`)
console.log(`  JIRA_EMAIL ......... ${tem('JIRA_EMAIL')}`)
console.log(`  JIRA_API_TOKEN ..... ${tem('JIRA_API_TOKEN')}`)
console.log(`  PAINEL_SENHA ....... ${tem('PAINEL_SENHA')}`)

async function testarGitHub() {
  if (!env('GITHUB_TOKEN')) {
    console.log('\n✗ GITHUB_TOKEN vazio: o painel não tem de onde ler os commits.')
    return false
  }
  try {
    const r = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('GITHUB_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'query { viewer { login repositories(affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) { totalCount } } rateLimit { remaining } }' }),
      signal: AbortSignal.timeout(20_000),
    })
    const j = await r.json()
    if (!r.ok || j.errors || !j.data?.viewer) {
      console.log(`\n✗ GitHub recusou o token (HTTP ${r.status}): ${JSON.stringify(j.errors ?? j.message ?? '').slice(0, 200)}`)
      return false
    }
    const { viewer, rateLimit } = j.data
    console.log(`\n✓ GitHub OK: @${viewer.login}, ${viewer.repositories.totalCount} repositórios visíveis (limite restante: ${rateLimit.remaining}/h).`)
    return true
  } catch (erro) {
    console.log(`\n✗ Falha ao chamar o GitHub: ${erro.message}`)
    return false
  }
}

async function testarJira() {
  if (!env('JIRA_URL') || !env('JIRA_EMAIL') || !env('JIRA_API_TOKEN')) {
    console.log('\n· Jira não configurado: título, tipo e impacto virão das mensagens dos commits.')
    return true
  }
  let origem
  try {
    origem = new URL(env('JIRA_URL'))
  } catch {
    console.log('\n✗ JIRA_URL não é uma URL válida.')
    return false
  }
  if (origem.protocol !== 'https:') {
    console.log('\n✗ JIRA_URL precisa ser https:// (o token vai no cabeçalho de cada chamada).')
    return false
  }
  try {
    const credencial = Buffer.from(`${env('JIRA_EMAIL')}:${env('JIRA_API_TOKEN')}`).toString('base64')
    const r = await fetch(`${origem.origin}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${credencial}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) {
      console.log(`\n✗ Jira recusou as credenciais (HTTP ${r.status}). Confira o e-mail e o API token.`)
      return false
    }
    const eu = await r.json()
    console.log(`\n✓ Jira OK: ${eu.displayName} em ${origem.host}.`)
    return true
  } catch (erro) {
    console.log(`\n✗ Falha ao chamar o Jira: ${erro.message}`)
    return false
  }
}

const github = await testarGitHub()
const jira = await testarJira()
// o processo termina sozinho (process.exit com conexões abertas quebra o Node no Windows)
process.exitCode = github && jira ? 0 : 1
