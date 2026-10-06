import type { Metadata } from 'next'
import { DemandasNoNavegador } from '@/components/hospedado/Paginas'
import { lerFiltros, VisaoDemandas } from '@/components/visoes/Demandas'
import { modoHospedado } from '@/lib/modo'
import { obterPainel } from '@/lib/servidor'

export const metadata: Metadata = { title: 'Demandas' }

export default async function PaginaDemandas({ searchParams }: PageProps<'/demandas'>) {
  const inicial = lerFiltros(await searchParams)
  if (modoHospedado()) return <DemandasNoNavegador inicial={inicial} />
  return <VisaoDemandas painel={await obterPainel()} inicial={inicial} />
}
