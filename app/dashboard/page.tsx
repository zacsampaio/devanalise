import type { Metadata } from 'next'
import { DashboardNoNavegador } from '@/components/hospedado/Paginas'
import { lerPeriodo, VisaoDashboard } from '@/components/visoes/Dashboard'
import { lerVisibilidade } from '@/lib/dados'
import { modoHospedado } from '@/lib/modo'
import { obterDashboard } from '@/lib/servidor'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function PaginaDashboard({ searchParams }: PageProps<'/dashboard'>) {
  const q = await searchParams
  const periodoId = lerPeriodo(q.periodo)
  const visibilidade = lerVisibilidade(q.repos)
  if (modoHospedado()) return <DashboardNoNavegador periodoId={periodoId} visibilidade={visibilidade} />
  return <VisaoDashboard d={await obterDashboard(periodoId, visibilidade)} periodoId={periodoId} visibilidade={visibilidade} />
}
