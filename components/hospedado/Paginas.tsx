'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { EstadoVazio } from '@/components/Estrutura'
import type { FiltrosIniciais } from '@/components/ListaDemandas'
import { VisaoDashboard } from '@/components/visoes/Dashboard'
import { EsperaArquivos, ListaArquivos, tituloDemanda, VisaoDemanda } from '@/components/visoes/Demanda'
import { VisaoDemandas } from '@/components/visoes/Demandas'
import { VisaoInicio } from '@/components/visoes/Inicio'
import { VisaoPortfolio } from '@/components/visoes/Portfolio'
import { VisaoSistema } from '@/components/visoes/Sistema'
import { VisaoSistemas } from '@/components/visoes/Sistemas'
import { dashboardDe, type PeriodoId } from '@/lib/analises'
import { pedirArquivos } from '@/lib/coletaNavegador'
import { commitsParaArquivos, demandaDe, painelDe, recortar, sistemaDe, type VisibilidadeId } from '@/lib/dados'
import { portfolioDe } from '@/lib/portfolio'
import { useColeta } from './ProvedorColeta'

/**
 * As páginas no modo hospedado: as mesmas visões do modo local, alimentadas
 * pela coleta que está nesta aba (ProvedorColeta) em vez do servidor.
 */

function useModelo(visibilidade: VisibilidadeId = 'todos') {
  const { base, versao } = useColeta()
  return useMemo(() => recortar(base, visibilidade, versao), [base, visibilidade, versao])
}

/** Título da aba (no modo hospedado o servidor não sabe o nome da demanda ou do sistema). */
function useTitulo(titulo: string | null) {
  useEffect(() => {
    if (titulo) document.title = `${titulo} | Painel de Entregas`
  }, [titulo])
}

/** Endereço que não existe nesta coleta (ou ainda não chegou nela). */
function NaoEncontrado({ oQue, voltar }: { oQue: string; voltar: { href: string; rotulo: string } }) {
  const { base } = useColeta()
  if (base.progresso) return <div className="pt-16"><EstadoVazio progresso={base.progresso} hospedado /></div>
  return (
    <section className="py-32">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-accent">Não encontrado</p>
        <h1 className="mt-5 text-title font-medium text-ink-deep">{oQue} não está nos seus commits do período.</h1>
        <Link href={voltar.href} className="mt-8 inline-block text-accent underline-offset-4 hover:underline">
          {voltar.rotulo}
        </Link>
      </div>
    </section>
  )
}

export function InicioNoNavegador() {
  return <VisaoInicio painel={painelDe(useModelo())} hospedado />
}

export function DashboardNoNavegador({ periodoId, visibilidade }: { periodoId: PeriodoId; visibilidade: VisibilidadeId }) {
  const m = useModelo(visibilidade)
  return <VisaoDashboard d={dashboardDe(m, periodoId, visibilidade)} periodoId={periodoId} visibilidade={visibilidade} hospedado />
}

export function DemandasNoNavegador({ inicial }: { inicial: FiltrosIniciais }) {
  return <VisaoDemandas painel={painelDe(useModelo())} inicial={inicial} hospedado />
}

export function SistemasNoNavegador() {
  return <VisaoSistemas painel={painelDe(useModelo())} hospedado />
}

export function PortfolioNoNavegador({ visibilidade }: { visibilidade: VisibilidadeId }) {
  return <VisaoPortfolio dados={portfolioDe(useModelo(visibilidade), visibilidade)} visibilidade={visibilidade} hospedado />
}

export function SistemaNoNavegador({ slug }: { slug: string }) {
  const dados = sistemaDe(useModelo(), slug)
  useTitulo(dados?.sistema.nome ?? null)
  if (!dados) return <NaoEncontrado oQue="Este sistema" voltar={{ href: '/sistemas', rotulo: 'Ver todos os sistemas' }} />
  return <VisaoSistema dados={dados} />
}

export function DemandaNoNavegador({ slug }: { slug: string }) {
  const m = useModelo()
  const dados = demandaDe(m, slug)
  useTitulo(dados ? tituloDemanda(dados) : null)
  if (!dados) return <NaoEncontrado oQue="Esta demanda" voltar={{ href: '/demandas', rotulo: 'Ver todas as demandas' }} />
  return <VisaoDemanda dados={dados} arquivos={<ArquivosNoNavegador commits={commitsParaArquivos(m, dados.demanda.id)} />} />
}

/** Arquivos mais alterados, pedidos ao GitHub pela rota do painel depois que a página aparece. */
function ArquivosNoNavegador({ commits }: { commits: { repo: string; hash: string }[] }) {
  const chave = commits.map((c) => c.hash).join(',')
  const [resultado, setResultado] = useState<{ chave: string; arquivos: string[] } | null>(null)
  useEffect(() => {
    let ativo = true
    pedirArquivos(commits)
      .catch(() => [])
      .then((arquivos) => ativo && setResultado({ chave, arquivos }))
    return () => {
      ativo = false
    }
    // `chave` resume `commits` (um array novo a cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  if (resultado?.chave !== chave) return <EsperaArquivos />
  return <ListaArquivos arquivos={resultado.arquivos} />
}
