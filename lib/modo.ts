/**
 * Dois jeitos de rodar o painel:
 *
 * - local: uma pessoa, com GITHUB_TOKEN (e JIRA_*) no .env, senha HTTP Basic
 *   e a coleta salva em data/. É o modo de quem baixa o projeto.
 * - hospedado: GITHUB_CLIENT_ID definido (ex.: na Vercel). Cada pessoa entra
 *   com a conta do GitHub (GitHub App) e, se quiser, conecta o Jira (OAuth da
 *   Atlassian). O servidor não guarda nada: o login fica num cookie
 *   criptografado no navegador dela, e a coleta, só na aba aberta.
 */

export const modoHospedado = () => Boolean(process.env.GITHUB_CLIENT_ID?.trim())

/** O botão "Conectar Jira" só aparece com o app da Atlassian configurado. */
export const jiraOAuthDisponivel = () => Boolean(process.env.ATLASSIAN_CLIENT_ID?.trim() && process.env.ATLASSIAN_CLIENT_SECRET?.trim())

/** O que falta para o modo hospedado funcionar (vazio = tudo certo). */
export function faltandoHospedado() {
  const faltando: string[] = []
  if (!process.env.GITHUB_CLIENT_SECRET?.trim()) faltando.push('GITHUB_CLIENT_SECRET')
  if ((process.env.SESSAO_SEGREDO?.trim().length ?? 0) < 32) faltando.push('SESSAO_SEGREDO (32+ caracteres)')
  return faltando
}
