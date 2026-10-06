import type { Metadata } from 'next'
import { PortfolioNoNavegador } from '@/components/hospedado/Paginas'
import { VisaoPortfolio } from '@/components/visoes/Portfolio'
import { lerVisibilidade } from '@/lib/dados'
import { modoHospedado } from '@/lib/modo'
import { obterPortfolio } from '@/lib/servidor'

export const metadata: Metadata = { title: 'Portfólio' }

export default async function Portfolio({ searchParams }: PageProps<'/portfolio'>) {
  const visibilidade = lerVisibilidade((await searchParams).repos)
  if (modoHospedado()) return <PortfolioNoNavegador visibilidade={visibilidade} />
  return <VisaoPortfolio dados={await obterPortfolio(visibilidade)} visibilidade={visibilidade} />
}
