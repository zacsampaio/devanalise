import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SistemaNoNavegador } from '@/components/hospedado/Paginas'
import { VisaoSistema } from '@/components/visoes/Sistema'
import { modoHospedado } from '@/lib/modo'
import { obterSistema } from '@/lib/servidor'

export async function generateMetadata({ params }: PageProps<'/sistemas/[slug]'>): Promise<Metadata> {
  // no modo hospedado os dados só existem no navegador: o título vem genérico
  if (modoHospedado()) return { title: 'Sistema' }
  return { title: (await obterSistema((await params).slug))?.sistema.nome ?? 'Sistema' }
}

export default async function PaginaSistema({ params }: PageProps<'/sistemas/[slug]'>) {
  const { slug } = await params
  if (modoHospedado()) return <SistemaNoNavegador slug={slug} />
  const dados = await obterSistema(slug)
  if (!dados) notFound()
  return <VisaoSistema dados={dados} />
}
