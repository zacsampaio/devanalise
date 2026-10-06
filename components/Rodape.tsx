import Link from 'next/link'
import { IMPACTOS } from '@/lib/config'
import type { Painel } from '@/lib/dados'
import { dataLonga } from './Selos'
import { Logotipo } from './Estrutura'

export type DadosRodape = Pick<Painel, 'kpis' | 'periodo' | 'usuario' | 'jiraAtivo'>

export function Rodape({ dados }: { dados: DadosRodape }) {
  const { kpis, periodo, usuario, jiraAtivo } = dados
  return (
    <footer className="bg-ink-deep py-16 text-paper" style={{ backgroundColor: '#0e0c16' }}>
      <div className="shell grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logotipo />
          <p className="mt-4 text-sm text-paper/55">Painel de entregas a partir dos seus commits no GitHub e dos chamados no Jira.</p>
          <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-paper/70">
            <Link href="/" className="hover:text-paper">Início</Link>
            <Link href="/dashboard" className="hover:text-paper">Dashboard</Link>
            <Link href="/demandas" className="hover:text-paper">Demandas</Link>
            <Link href="/sistemas" className="hover:text-paper">Sistemas</Link>
            <Link href="/portfolio" className="hover:text-paper">Portfólio</Link>
          </nav>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-paper/65 lg:col-span-8">
          <p className="eyebrow text-signal-light">Como ler este painel</p>
          <p>
            <b className="font-medium text-paper">Fonte:</b> commits {usuario ? <>de <b className="font-medium text-paper">@{usuario.login}</b></> : 'da conta do token'} em {kpis.sistemas}{' '}
            repositórios do GitHub
            {periodo && (
              <>
                , de {dataLonga(periodo.inicio)} a {dataLonga(periodo.fim)}
              </>
            )}
            . Commits de merge ficam de fora.
          </p>
          <p>
            <b className="font-medium text-paper">Demanda:</b> commits agrupados pelo chamado do Jira citado na mensagem (ex.: ABC-123). Commits sem chamado viram uma frente por
            repositório.{' '}
            {jiraAtivo
              ? 'Título, tipo, prioridade e status vêm do Jira; o impacto segue a prioridade.'
              : 'Sem o Jira conectado, título, tipo e impacto vêm de regras sobre as mensagens dos commits.'}{' '}
            Impacto: {Object.values(IMPACTOS).join(', ').toLowerCase()}.
          </p>
          <p>
            <b className="font-medium text-paper">Commits</b> contam registros de código, não horas trabalhadas: um commit grande e um pequeno pesam igual. Por isso o painel
            destaca demandas e impacto, não volume.
          </p>
        </div>
      </div>
    </footer>
  )
}
