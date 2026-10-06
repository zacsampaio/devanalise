import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { Cabecalho } from '@/components/Cabecalho'
import { CabecalhoNoNavegador, RodapeNoNavegador } from '@/components/hospedado/Moldura'
import { ProvedorColeta } from '@/components/hospedado/ProvedorColeta'
import { Rodape } from '@/components/Rodape'
import { jiraOAuthDisponivel, modoHospedado } from '@/lib/modo'
import { abrir, COOKIE_GITHUB, COOKIE_JIRA, type SessaoGithub, type SessaoJira } from '@/lib/sessao'
import { obterPainel } from '@/lib/servidor'
import './globals.css'

/** Texto em IBM Plex Sans; números, rótulos e hashes em JetBrains Mono. */
const texto = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-texto',
  display: 'swap',
})

const codigo = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-codigo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Painel de Entregas', template: '%s | Painel de Entregas' },
  description: 'Dashboard das suas entregas a partir dos commits no GitHub e dos chamados no Jira.',
  // dados privados: fora de buscadores
  robots: { index: false, follow: false },
}

/** Modo local: cabeçalho e rodapé com a coleta do servidor. */
async function MolduraLocal({ children }: { children: ReactNode }) {
  const painel = await obterPainel()
  const { geradoEm, fonte, usuario, progresso } = painel
  return (
    <>
      <Cabecalho atualizadoEm={geradoEm} aoVivo={fonte === 'github'} usuario={usuario ? `@${usuario.login}` : null} progresso={progresso} />
      <main>{children}</main>
      <Rodape dados={painel} />
    </>
  )
}

/**
 * Modo hospedado: com login, a coleta roda no navegador (ProvedorColeta).
 * Sem login só se chega a /entrar (o proxy garante), que tem tela própria.
 */
async function MolduraHospedada({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const sessao = abrir<SessaoGithub>(COOKIE_GITHUB, jar.get(COOKIE_GITHUB)?.value)
  if (!sessao) return <main>{children}</main>
  const jira = abrir<SessaoJira>(COOKIE_JIRA, jar.get(COOKIE_JIRA)?.value)
  return (
    <ProvedorColeta usuario={sessao.usuario} jira={jira ? { site: jira.site.nome, url: jira.site.url } : null} jiraDisponivel={jiraOAuthDisponivel()}>
      <CabecalhoNoNavegador />
      <main>{children}</main>
      <RodapeNoNavegador />
    </ProvedorColeta>
  )
}

export const viewport: Viewport = {
  themeColor: '#0e0c16',
}

export default async function LayoutRaiz({ children }: LayoutProps<'/'>) {
  return (
    // data-scroll-behavior: o Next 16 só desliga o scroll suave do CSS durante a troca de página com este atributo;
    // sem ele, a página nova abre rolada lá embaixo e sobe animando (as âncoras na mesma página continuam suaves)
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${texto.variable} ${codigo.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/*
          Rede de segurança: as seções entram com animação quando o React carrega.
          Se ele não carregar (script bloqueado, rede lenta, servidor de dev por IP),
          em 4 s a página mostra tudo com os números finais — nunca fica vazia.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "setTimeout(function(){var h=document.documentElement;if(!h.hasAttribute('data-hidratado'))h.classList.add('sem-js')},4000)",
          }}
        />
        <noscript>
          <style>{'.reveal{opacity:1!important;transform:none!important}.contador-animado{display:none!important}.contador-final{display:inline!important}'}</style>
        </noscript>
      </head>
      <body className="bg-paper font-sans">
        {modoHospedado() ? <MolduraHospedada>{children}</MolduraHospedada> : <MolduraLocal>{children}</MolduraLocal>}
      </body>
    </html>
  )
}
