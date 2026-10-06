import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logotipo } from '@/components/Estrutura'

/**
 * Política de privacidade. Pública no modo hospedado (proxy.ts), para servir
 * de link no app OAuth da Atlassian ("Distribution → Sharing") e no GitHub App.
 * O texto descreve o modo hospedado: é nele que outras pessoas entram.
 */

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Que dados o Painel de Entregas acessa no GitHub e no Jira, onde eles ficam e como apagá-los.',
  robots: { index: true, follow: false },
}

const ATUALIZADA_EM = '6 de outubro de 2026'

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-line pt-10">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">{titulo}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-subtle [&_b]:font-medium [&_b]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div>
    </section>
  )
}

const Codigo = ({ children }: { children: ReactNode }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-ink">{children}</code>

const Externo = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">
    {children}
  </a>
)

export default function Privacidade() {
  const contato = process.env.PAINEL_CONTATO?.trim()

  return (
    <>
      <header className="grain relative overflow-hidden bg-ink-deep py-16 text-paper sm:py-20" style={{ backgroundColor: '#0e0c16' }}>
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-accent/25 blur-[140px]" />
        <div className="shell relative max-w-3xl">
          <Link href="/" aria-label="Painel de Entregas">
            <Logotipo />
          </Link>
          <p className="eyebrow mt-10 text-signal-light">Privacidade</p>
          <h1 className="mt-4 text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.05] tracking-[-0.035em]">Política de privacidade</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper/75">
            O Painel de Entregas lê seus commits no GitHub e, se você conectar, os chamados do Jira citados neles, para montar um painel só seu. Ele só lê, não grava nada no
            servidor e não compartilha seus dados com ninguém.
          </p>
          <p className="eyebrow mt-8 text-paper/45">Atualizada em {ATUALIZADA_EM}</p>
        </div>
      </header>

      <article className="shell max-w-3xl space-y-12 py-16">
        <Secao id="dados" titulo="1. Dados que acessamos">
          <p>Ao entrar com o GitHub, você autoriza o app a ler, só para você:</p>
          <ul>
            <li>
              <b>Seu perfil público do GitHub:</b> identificador, login, nome e foto.
            </li>
            <li>
              <b>Repositórios onde o app está instalado:</b> nome, dono e data do último push.
            </li>
            <li>
              <b>Seus commits nesses repositórios:</b> mensagem, data, identificador (hash), repositório e os nomes e contagens de linhas dos arquivos alterados. Só entram
              commits de que você é autor.
            </li>
          </ul>
          <p>Se você conectar o Jira, o app também lê:</p>
          <ul>
            <li>
              <b>O site do Jira escolhido:</b> nome e endereço.
            </li>
            <li>
              <b>Os chamados citados nas mensagens dos seus commits</b> (ex.: <Codigo>ABC-123</Codigo>): título, tipo, prioridade e status. Só os que a sua conta já pode
              abrir no Jira.
            </li>
          </ul>
          <p>Não acessamos o conteúdo do código, comentários, anexos, e-mails, senhas nem dados de outras pessoas.</p>
        </Secao>

        <Secao id="permissoes" titulo="2. Permissões pedidas">
          <ul>
            <li>
              <b>GitHub App:</b> <Codigo>Contents</Codigo> e <Codigo>Metadata</Codigo>, ambas só leitura. O token vence em 8 horas.
            </li>
            <li>
              <b>Atlassian (Jira):</b> <Codigo>read:jira-work</Codigo>, só leitura, e <Codigo>offline_access</Codigo>, para renovar o acesso sem pedir login de novo durante
              a sessão.
            </li>
          </ul>
          <p>O app nunca cria, altera ou apaga nada no GitHub ou no Jira.</p>
        </Secao>

        <Secao id="uso" titulo="3. Para que usamos">
          <p>
            Só para mostrar a você o painel das suas entregas: agrupar os commits por chamado, classificar as demandas e montar os números e gráficos. Não usamos os dados
            para publicidade, perfil de comportamento, treino de modelos de IA ou qualquer outro fim.
          </p>
        </Secao>

        <Secao id="armazenamento" titulo="4. Onde os dados ficam">
          <ul>
            <li>
              <b>Login:</b> os tokens do GitHub e do Jira ficam em cookies do seu navegador, criptografados (AES-256-GCM) e marcados como <Codigo>httpOnly</Codigo>,{' '}
              <Codigo>Secure</Codigo> e <Codigo>SameSite=Lax</Codigo>. O JavaScript da página não consegue lê-los. Eles valem no máximo 8 horas.
            </li>
            <li>
              <b>Commits e chamados coletados:</b> ficam só na memória e no <Codigo>sessionStorage</Codigo> da aba aberta. Fechar a aba ou clicar em <b>Sair</b> apaga tudo.
            </li>
            <li>
              <b>Servidor:</b> não tem banco de dados e não grava seus dados. Ele só repassa as consultas ao GitHub e ao Jira com o seu token e devolve a resposta, com{' '}
              <Codigo>Cache-Control: no-store</Codigo>.
            </li>
          </ul>
        </Secao>

        <Secao id="cookies" titulo="5. Cookies">
          <p>Usamos apenas cookies necessários ao login. Não há cookies de análise, publicidade ou de terceiros.</p>
          <ul>
            <li>
              <Codigo>painel_gh</Codigo>: sessão do GitHub, até 8 horas.
            </li>
            <li>
              <Codigo>painel_jira</Codigo>: conexão com o Jira, até 8 horas.
            </li>
            <li>
              <Codigo>painel_oauth</Codigo> e <Codigo>painel_jira_sites</Codigo>: login em andamento e escolha do site do Jira, 10 minutos.
            </li>
          </ul>
        </Secao>

        <Secao id="compartilhamento" titulo="6. Compartilhamento">
          <p>
            Não vendemos, alugamos nem compartilhamos seus dados. Eles só trafegam entre o seu navegador, o servidor do painel e as APIs do GitHub e da Atlassian, sempre por
            HTTPS.
          </p>
          <p>
            O provedor que hospeda o painel pode manter registros técnicos de acesso, como endereço IP, horário e endereço da página pedida, conforme a política de privacidade
            dele. Esses registros não incluem seus tokens nem o conteúdo coletado.
          </p>
        </Secao>

        <Secao id="controle" titulo="7. Como apagar e revogar o acesso">
          <ul>
            <li>
              <b>Sair</b> no painel apaga os cookies de login e os dados da aba.
            </li>
            <li>
              <b>GitHub:</b> em{' '}
              <Externo href="https://github.com/settings/apps/authorizations">Settings → Applications → Authorized GitHub Apps</Externo>, revogue o Painel de Entregas. Para
              tirar o acesso a repositórios, desinstale o app em{' '}
              <Externo href="https://github.com/settings/installations">Installed GitHub Apps</Externo>.
            </li>
            <li>
              <b>Atlassian:</b> em <Externo href="https://id.atlassian.com/manage-profile/apps">Perfil → Apps conectados</Externo>, remova o acesso do painel.
            </li>
          </ul>
          <p>
            Como não guardamos seus dados, não há cópia para apagar do nosso lado. Você pode exercer os direitos previstos na Lei Geral de Proteção de Dados (LGPD, Lei nº
            13.709/2018), como confirmação, acesso e eliminação, pelo contato abaixo.
          </p>
        </Secao>

        <Secao id="alteracoes" titulo="8. Alterações e contato">
          <p>Se esta política mudar, a data no topo da página será atualizada. Mudanças no que é acessado também passam por uma nova autorização no GitHub ou na Atlassian.</p>
          <p>
            Dúvidas ou pedidos sobre privacidade:{' '}
            {contato ? (
              <a href={contato.includes('@') ? `mailto:${contato}` : contato} className="text-accent underline underline-offset-2 hover:no-underline">
                {contato}
              </a>
            ) : (
              'fale com o responsável pela publicação deste painel.'
            )}
          </p>
        </Secao>
      </article>
    </>
  )
}
