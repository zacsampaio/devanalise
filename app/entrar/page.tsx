import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Logotipo } from '@/components/Estrutura'
import { modoHospedado } from '@/lib/modo'

export const metadata: Metadata = { title: 'Entrar' }

/** Códigos de erro que as rotas de login devolvem em `?erro=`. */
const ERROS: Record<string, string> = {
  negado: 'O acesso não foi autorizado no GitHub.',
  estado: 'O login expirou ou não começou aqui. Tente de novo.',
  github: 'O GitHub não confirmou o login. Tente de novo em instantes.',
  config: 'O painel ainda não está configurado para login. Fale com quem o publicou.',
}

export default async function Entrar({ searchParams }: PageProps<'/entrar'>) {
  if (!modoHospedado()) notFound()
  const codigo = (await searchParams).erro
  const erro = typeof codigo === 'string' ? (ERROS[codigo] ?? null) : null

  return (
    <section className="grain relative flex min-h-screen items-center overflow-hidden bg-ink-deep py-24 text-paper" style={{ backgroundColor: '#0e0c16' }}>
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/25 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-signal/15 blur-[120px]" />

      <div className="shell relative max-w-2xl">
        <Logotipo />
        <h1 className="mt-10 text-[clamp(2.2rem,5vw,3.6rem)] font-medium leading-[1.05] tracking-[-0.035em]">
          Suas entregas, <span className="text-paper/55">contadas pelos seus commits.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/75">
          Entre com o GitHub para ver o que você entregou nos últimos 12 meses. Depois, se quiser, conecte o Jira para trazer título, tipo e status dos chamados.
        </p>

        {erro && <p className="mt-8 rounded-md border border-[#eda100]/40 bg-[#eda100]/10 px-4 py-3 text-sm text-[#f5c96a]">{erro}</p>}

        <a
          href="/api/auth/github"
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-paper px-6 py-3.5 text-[15px] font-medium text-ink-deep transition-colors hover:bg-white"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-5 w-5" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Entrar com GitHub
        </a>

        <ul className="mt-14 grid gap-6 border-t border-white/10 pt-8 text-sm leading-relaxed text-paper/60 sm:grid-cols-3">
          <li>
            <b className="block font-medium text-paper">Só leitura</b>O GitHub pede acesso aos repositórios para o painel ler seus commits. Ele nunca escreve nada.
          </li>
          <li>
            <b className="block font-medium text-paper">Nada guardado</b>Seus commits ficam só nesta aba do navegador. O servidor não salva nada.
          </li>
          <li>
            <b className="block font-medium text-paper">Sai quando quiser</b>Sair apaga o login e os dados. O acesso também vence sozinho em 8 horas.
          </li>
        </ul>
        <p className="mt-8 text-xs leading-relaxed text-paper/45">
          Organizações que restringem apps de terceiros mostram um botão “Request” na autorização: um owner aprova uma vez e os repositórios dela passam a aparecer.{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-paper">Política de privacidade</Link>.
        </p>
      </div>
    </section>
  )
}
