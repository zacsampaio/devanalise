import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DemandaNoNavegador } from '@/components/hospedado/Paginas'
import { EsperaArquivos, ListaArquivos, tituloDemanda, VisaoDemanda } from '@/components/visoes/Demanda'
import { modoHospedado } from '@/lib/modo'
import { arquivosDaDemanda, obterDemanda } from '@/lib/servidor'

export async function generateMetadata({ params }: PageProps<'/demandas/[slug]'>): Promise<Metadata> {
  // no modo hospedado os dados só existem no navegador: o título vem genérico
  if (modoHospedado()) return { title: 'Demanda' }
  return { title: tituloDemanda(await obterDemanda((await params).slug)) }
}

async function ArquivosMaisAlterados({ id }: { id: string }) {
  return <ListaArquivos arquivos={await arquivosDaDemanda(id)} />
}

export default async function PaginaDemanda({ params }: PageProps<'/demandas/[slug]'>) {
  const { slug } = await params
  if (modoHospedado()) return <DemandaNoNavegador slug={slug} />
  const dados = await obterDemanda(slug)
  if (!dados) notFound()
  return (
    <VisaoDemanda
      dados={dados}
      arquivos={
        <Suspense fallback={<EsperaArquivos />}>
          <ArquivosMaisAlterados id={dados.demanda.id} />
        </Suspense>
      }
    />
  )
}
