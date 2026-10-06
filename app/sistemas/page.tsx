import type { Metadata } from 'next'
import { SistemasNoNavegador } from '@/components/hospedado/Paginas'
import { VisaoSistemas } from '@/components/visoes/Sistemas'
import { modoHospedado } from '@/lib/modo'
import { obterPainel } from '@/lib/servidor'

export const metadata: Metadata = { title: 'Sistemas' }

export default async function PaginaSistemas() {
  if (modoHospedado()) return <SistemasNoNavegador />
  return <VisaoSistemas painel={await obterPainel()} />
}
