/* Visão pura: recebe os dados prontos. A página escolhe de onde vêm (servidor no modo local, navegador no hospedado). */
import Link from 'next/link'
import { GraficoEntregas } from '@/components/GraficoEntregas'
import { BarrasHorizontais, Colunas, MapaCalor } from '@/components/painel/Barras'
import { Cartao, Indicador } from '@/components/painel/Cartao'
import { GraficoLinhas } from '@/components/painel/GraficoLinhas'
import { EstadoVazio } from '@/components/Estrutura'
import { FiltroVisibilidade, RecorteVazio } from '@/components/FiltroVisibilidade'
import { FeedCommits } from '@/components/ListasCommits'
import { COR_COMMITS, ORDEM_TIPOS, TIPOS } from '@/lib/config'
import { PERIODOS, type Dashboard, type PeriodoId } from '@/lib/analises'
import type { VisibilidadeId } from '@/lib/dados'

/** Impacto é ordinal: um tom só, do claro (baixo) ao escuro (alto). */
const CORES_IMPACTO = { alto: '#3f2f97', medio: '#7360df', baixo: '#b7acf2' }

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
const fmtNumero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/** URL do dashboard com o período e o recorte (os padrões ficam fora da URL). */
function urlDashboard(periodo: PeriodoId, visibilidade: VisibilidadeId) {
  const p = new URLSearchParams()
  if (periodo !== 'tudo') p.set('periodo', periodo)
  if (visibilidade !== 'todos') p.set('repos', visibilidade)
  const q = p.toString()
  return q ? `/dashboard?${q}` : '/dashboard'
}

/** Período pedido na URL (`?periodo=30d`); qualquer outra coisa vale "tudo". */
export function lerPeriodo(valor: string | string[] | undefined): PeriodoId {
  const pedido = Array.isArray(valor) ? valor[0] : valor
  return PERIODOS.some((p) => p.id === pedido) ? (pedido as PeriodoId) : 'tudo'
}

export function VisaoDashboard({ d, periodoId, visibilidade, hospedado = false }: { d: Dashboard; periodoId: PeriodoId; visibilidade: VisibilidadeId; hospedado?: boolean }) {
  // sem dado nenhum: explica a configuração; recorte vazio é tratado abaixo, com os filtros à vista
  if (d.vazio && visibilidade === 'todos') return <div className="pt-16"><EstadoVazio aviso={d.aviso} progresso={d.progresso} hospedado={hospedado} /></div>
  const ind = d.indicadores
  const tudo = d.periodo.id === 'tudo'
  // no histórico todo não há período anterior com dados para comparar
  const comparacao = tudo ? 'histórico completo' : `vs. ${d.periodo.janelaDias} dias anteriores`
  const v = (x: number | null) => (tudo ? null : x)
  const duracaoVariacao = ind.duracaoMediana.anterior ? Math.round(((ind.duracaoMediana.valor - ind.duracaoMediana.anterior) / ind.duracaoMediana.anterior) * 100) : null

  return (
    <div className="min-h-screen bg-muted pb-20 pt-24">
      <div className="shell">
        {/* barra do painel: título, período e recorte */}
        <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-accent">Painel de acompanhamento</p>
            <h1 className="mt-3 text-[clamp(1.6rem,2.6vw,2.2rem)] font-medium leading-tight tracking-[-0.03em] text-ink-deep">Suas entregas</h1>
            <p className="mt-1.5 text-sm text-subtle">
              {fmtData(d.periodo.desde)} a {fmtData(d.periodo.ate)} · {d.fonte === 'github' ? 'dados ao vivo do GitHub' : 'arquivo local'}, lidos às{' '}
              {new Date(d.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 self-start md:self-auto">
            <FiltroVisibilidade atual={visibilidade} href={(v) => urlDashboard(periodoId, v)} />
            <nav aria-label="Período" className="inline-flex rounded-full border border-line bg-paper p-1">
              {PERIODOS.map((p) => (
                <Link
                  key={p.id}
                  href={urlDashboard(p.id, visibilidade)}
                  aria-current={p.id === periodoId ? 'page' : undefined}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${p.id === periodoId ? 'bg-ink-deep text-paper' : 'text-subtle hover:text-ink-deep'}`}
                >
                  {p.rotulo}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {d.vazio ? (
          <div className="mt-8">
            <RecorteVazio visibilidade={visibilidade} temVisibilidade={d.temVisibilidade} />
          </div>
        ) : (
          <>
            {/* indicadores */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <Indicador rotulo="Demandas concluídas" valor={ind.demandas.valor} variacao={v(ind.demandas.variacao)} nota={comparacao} serie={ind.demandas.serie} />
              <Indicador rotulo="Alto impacto" valor={ind.altoImpacto.valor} variacao={v(ind.altoImpacto.variacao)} nota={comparacao} serie={ind.altoImpacto.serie} />
              <Indicador rotulo="Commits" valor={fmtNumero(ind.commits.valor)} variacao={v(ind.commits.variacao)} nota={comparacao} serie={ind.commits.serie} />
              <Indicador rotulo="Repositórios ativos" valor={ind.sistemasAtivos.valor} nota="com commits nos últimos 30 dias" serie={ind.sistemasAtivos.serie} />
              <Indicador
                rotulo="Tempo de entrega"
                valor={fmtNumero(ind.duracaoMediana.valor)}
                unidade={ind.duracaoMediana.valor === 1 ? 'dia' : 'dias'}
                variacao={v(duracaoVariacao)}
                inverter
                nota={`mediana · média de ${fmtNumero(ind.duracaoMediana.media)} dias`}
              />
              <Indicador rotulo="Rastreabilidade" valor={ind.rastreabilidade.valor} unidade="%" nota="dos commits ligados a um chamado do Jira" serie={ind.rastreabilidade.serie} />
            </div>

            {/* entregas e tipos */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Cartao className="lg:col-span-8" titulo="Demandas concluídas por mês" subtitulo="Pela data do último commit da demanda, por tipo de entrega." acao={{ href: '/demandas', rotulo: 'Demandas' }}>
                <GraficoEntregas meses={d.entregasMes} />
              </Cartao>
              <Cartao className="lg:col-span-4" titulo="Por tipo de entrega" subtitulo="Demandas concluídas no período.">
                <BarrasHorizontais
                  linhas={d.porTipo.map((t) => ({ rotulo: TIPOS[t.id].rotulo, valores: { [t.id]: t.valor }, href: `/demandas?tipo=${t.id}` }))}
                  series={ORDEM_TIPOS.map((t) => ({ id: t, rotulo: TIPOS[t].rotulo, cor: TIPOS[t].cor }))}
                  mostrarLegenda={false}
                />
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-xs text-subtle">Entregas acumuladas no período</p>
                  <div className="mt-2">
                    <GraficoLinhas pontos={d.acumuladas} series={[{ id: 'total', rotulo: 'Demandas acumuladas', cor: COR_COMMITS }]} altura={130} area />
                  </div>
                </div>
              </Cartao>
            </div>

            {/* atividade */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Cartao className="lg:col-span-8" titulo="Commits por semana" subtitulo="Ritmo de trabalho, semana a semana.">
                <GraficoLinhas pontos={d.semanas} series={[{ id: 'commits', rotulo: 'Commits', cor: COR_COMMITS }]} altura={240} area />
              </Cartao>
              <Cartao className="lg:col-span-4" titulo="Tempo de entrega" subtitulo="Quantos dias cada demanda levou, do primeiro ao último commit.">
                <Colunas itens={d.distribuicaoDuracao} cor="#5b45e0" altura={150} />
              </Cartao>
            </div>

            {/* áreas, sistemas, calor */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Cartao className="lg:col-span-6" titulo="Impacto por conta ou organização" subtitulo="Demandas concluídas, pelo dono do repositório principal." acao={{ href: '/sistemas', rotulo: 'Sistemas' }}>
                <BarrasHorizontais
                  linhas={d.areas.map((a) => ({ rotulo: a.rotulo, valores: a.valores }))}
                  series={[
                    { id: 'alto', rotulo: 'Alto impacto', cor: CORES_IMPACTO.alto },
                    { id: 'medio', rotulo: 'Médio impacto', cor: CORES_IMPACTO.medio },
                    { id: 'baixo', rotulo: 'Baixo impacto', cor: CORES_IMPACTO.baixo },
                  ]}
                />
              </Cartao>
              <Cartao className="lg:col-span-6" titulo="Repositórios mais trabalhados" subtitulo="Os 10 repositórios com mais commits no período.">
                <BarrasHorizontais
                  linhas={d.sistemas.map((s) => ({ rotulo: s.rotulo, valores: s.valores, href: s.href }))}
                  series={[{ id: 'commits', rotulo: 'Commits', cor: COR_COMMITS }]}
                />
              </Cartao>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Cartao className={d.statusJira ? 'lg:col-span-5' : 'lg:col-span-7'} titulo="Quando você commita" subtitulo="Commits por dia da semana e faixa de horário.">
                <MapaCalor linhas={d.calor.dias} colunas={d.calor.faixas} valores={d.calor.valores} />
              </Cartao>
              <Cartao className={d.statusJira ? 'lg:col-span-4' : 'lg:col-span-5'} titulo="Frentes" subtitulo="Demandas que contribuíram para cada tema (uma pode estar em mais de um).">
                <BarrasHorizontais linhas={d.frentes.map((f) => ({ rotulo: f.rotulo, valores: { v: f.valor } }))} series={[{ id: 'v', rotulo: 'Demandas', cor: '#5b45e0' }]} />
              </Cartao>
              {d.statusJira && (
                <Cartao className="lg:col-span-3" titulo="Status no Jira" subtitulo="Situação atual dos chamados com commits no período.">
                  <BarrasHorizontais
                    linhas={d.statusJira.map((s) => ({ rotulo: s.rotulo, valores: { [s.id]: s.valor } }))}
                    series={[
                      { id: 'done', rotulo: 'Concluído', cor: '#2bb37f' },
                      { id: 'indeterminate', rotulo: 'Em andamento', cor: '#7b66f5' },
                      { id: 'new', rotulo: 'A fazer', cor: '#8a8699' },
                    ]}
                    mostrarLegenda={false}
                  />
                </Cartao>
              )}
            </div>

            {/* feed */}
            <div className="mt-4">
              <Cartao titulo="Últimos commits" subtitulo="O que entrou no código mais recentemente, dos mais novos aos mais antigos." acao={{ href: '/demandas', rotulo: 'Todas as demandas' }}>
                <FeedCommits commits={d.ultimosCommits} />
              </Cartao>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
