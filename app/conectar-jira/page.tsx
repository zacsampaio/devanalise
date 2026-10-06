import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { modoHospedado } from '@/lib/modo'
import { abrir, COOKIE_JIRA_SITES, type SitesPendentes } from '@/lib/sessao'

export const metadata: Metadata = { title: 'Conectar Jira' }

/** A conta Atlassian tem mais de um site: a pessoa escolhe qual usar (os tokens esperam 10 minutos no cookie). */
export default async function ConectarJira() {
  if (!modoHospedado()) notFound()
  const pendentes = abrir<SitesPendentes>(COOKIE_JIRA_SITES, (await cookies()).get(COOKIE_JIRA_SITES)?.value)
  if (!pendentes) redirect('/?jira=erro')

  return (
    <section className="pb-24 pt-36">
      <div className="shell max-w-2xl">
        <p className="eyebrow text-accent">Conectar Jira</p>
        <h1 className="mt-5 text-title font-medium text-ink-deep">Qual site do Jira usar?</h1>
        <p className="mt-4 leading-relaxed text-subtle">Sua conta Atlassian tem acesso a mais de um site. Os chamados citados nos commits serão buscados no site escolhido.</p>
        <form method="post" action="/api/auth/atlassian/site" className="mt-10 grid gap-3">
          {pendentes.sites.map((s) => (
            <button
              key={s.id}
              type="submit"
              name="site"
              value={s.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-paper px-5 py-4 text-left transition-colors hover:border-accent"
            >
              <span>
                <span className="block font-medium text-ink-deep">{s.nome}</span>
                <span className="block font-mono text-xs text-subtle">{s.url.replace(/^https:\/\//, '')}</span>
              </span>
              <span aria-hidden className="text-accent">→</span>
            </button>
          ))}
        </form>
      </div>
    </section>
  )
}
