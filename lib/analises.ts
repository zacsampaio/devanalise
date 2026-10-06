import { FRENTES, ORDEM_TIPOS, type Impacto } from './config'
import { areaSistema, contarTipos, demandaDoCommit, MESES, nomeSistema, slugRepo, type Demanda, type Mes, type Modelo, type VisibilidadeId } from './dados'

/**
 * Análises do painel de acompanhamento (/dashboard). Tudo é calculado sobre o
 * mesmo modelo do resto do site, recortado pelo período escolhido.
 */

export const PERIODOS = [
  { id: '30d', rotulo: '30 dias', dias: 30 },
  { id: '90d', rotulo: '90 dias', dias: 90 },
  { id: 'tudo', rotulo: 'Tudo', dias: null },
] as const

export type PeriodoId = (typeof PERIODOS)[number]['id']

const DIA = 86_400_000
const ORDEM_IMPACTO: Impacto[] = ['alto', 'medio', 'baixo']

const duracaoDias = (d: Demanda) => Math.max(1, Math.round((+new Date(d.fim) - +new Date(d.inicio)) / DIA) + 1)
const mediana = (v: number[]) => {
  if (!v.length) return 0
  const o = [...v].sort((a, b) => a - b)
  const meio = Math.floor(o.length / 2)
  return o.length % 2 ? o[meio] : (o[meio - 1] + o[meio]) / 2
}
const variacao = (atual: number, anterior: number) => (anterior ? Math.round(((atual - anterior) / anterior) * 100) : null)

/** Segunda-feira 00:00 da semana da data. */
function inicioSemana(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7))
  return r
}

const ROTULOS_STATUS = { done: 'Concluído', indeterminate: 'Em andamento', new: 'A fazer' } as const

/** `m`: o modelo já recortado por `visibilidade` (lib/dados.ts → recortar). */
export function dashboardDe(m: Modelo, periodoId: PeriodoId = 'tudo', visibilidade: VisibilidadeId = 'todos') {
  const periodo = PERIODOS.find((p) => p.id === periodoId) ?? PERIODOS[2]
  const agora = new Date(m.base.geradoEm)
  const desde = periodo.dias ? new Date(+agora - periodo.dias * DIA) : m.commits.length ? new Date(m.commits.at(-1)!.data) : agora

  const noPeriodo = (iso: string) => new Date(iso) >= desde
  const commits = m.commits.filter((c) => noPeriodo(c.data))
  const demandas = m.demandas.filter((d) => noPeriodo(d.fim))

  // ── indicadores: janela atual × janela anterior do mesmo tamanho ──
  const janela = periodo.dias ?? Math.max(30, Math.round((+agora - +desde) / DIA))
  const inicioAnterior = new Date(+desde - janela * DIA)
  const naJanelaAnterior = (iso: string) => {
    const t = new Date(iso)
    return t >= inicioAnterior && t < desde
  }
  const demandasAnteriores = m.demandas.filter((d) => naJanelaAnterior(d.fim))
  const commitsAnteriores = m.commits.filter((c) => naJanelaAnterior(c.data))
  const ativos30 = new Set(m.commits.filter((c) => +new Date(c.data) >= +agora - 30 * DIA).map((c) => c.repo)).size
  // commit rastreável = agrupado num chamado (confirmado pelo Jira, quando ele está configurado)
  const temChamado = (c: { repo: string; hash: string }) => demandaDoCommit(m, c)?.id.startsWith('SC:') === false
  const comChamado = commits.filter(temChamado).length

  // ── série semanal de commits ──
  const semanas: { chave: string; rotulo: string; valores: { commits: number } }[] = []
  for (let s = inicioSemana(desde); s <= agora; s = new Date(+s + 7 * DIA)) {
    semanas.push({ chave: s.toISOString().slice(0, 10), rotulo: `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}`, valores: { commits: 0 } })
  }
  const porSemana = new Map(semanas.map((s) => [s.chave, s]))
  for (const c of commits) {
    const s = porSemana.get(inicioSemana(new Date(c.data)).toISOString().slice(0, 10))
    if (s) s.valores.commits++
  }

  // ── meses do período ──
  const meses: { chave: string; rotulo: string }[] = []
  for (let d = new Date(desde.getFullYear(), desde.getMonth(), 1); d <= agora; d.setMonth(d.getMonth() + 1)) {
    meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: MESES[d.getMonth()] })
  }
  // uma passada só sobre demandas e commits do período (com décadas de histórico, filtrar por mês custaria caro)
  const demandasPorMes = new Map<string, Demanda[]>()
  for (const d of demandas) {
    const k = d.fim.slice(0, 7)
    const lista = demandasPorMes.get(k)
    if (lista) lista.push(d)
    else demandasPorMes.set(k, [d])
  }
  const commitsPorMes = new Map<string, number>()
  for (const c of commits) commitsPorMes.set(c.data.slice(0, 7), (commitsPorMes.get(c.data.slice(0, 7)) ?? 0) + 1)
  const entregasMes = meses.map(({ chave, rotulo }) => {
    const doMes = demandasPorMes.get(chave) ?? []
    return {
      chave,
      rotulo,
      valores: contarTipos(doMes),
      altoImpacto: doMes.filter((d) => d.impacto === 'alto').length,
      commits: commitsPorMes.get(chave) ?? 0,
    }
  })
  let acumulado = 0
  const acumuladas = entregasMes.map((x) => {
    acumulado += Object.values(x.valores).reduce((s, v) => s + v, 0)
    return { chave: x.chave, rotulo: x.rotulo, valores: { total: acumulado } }
  })

  // ── mapa de calor: dia da semana × faixa de horário ──
  const FAIXAS = ['0–6h', '6–8h', '8–10h', '10–12h', '12–14h', '14–16h', '16–18h', '18–20h', '20–24h']
  const faixaDe = (h: number) => (h < 6 ? 0 : h < 8 ? 1 : h < 10 ? 2 : h < 12 ? 3 : h < 14 ? 4 : h < 16 ? 5 : h < 18 ? 6 : h < 20 ? 7 : 8)
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const calor = DIAS.map(() => FAIXAS.map(() => 0))
  for (const c of commits) {
    const t = new Date(c.data)
    calor[(t.getDay() + 6) % 7][faixaDe(t.getHours())]++
  }

  // ── tempo de entrega (dias entre o primeiro e o último commit da demanda) ──
  const FAIXAS_DURACAO = [
    { rotulo: '1 dia', ate: 1 },
    { rotulo: '2–7 dias', ate: 7 },
    { rotulo: '8–15 dias', ate: 15 },
    { rotulo: '16–30 dias', ate: 30 },
    { rotulo: '31–60 dias', ate: 60 },
    { rotulo: 'Mais de 60', ate: Infinity },
  ]
  const duracoes = demandas.map(duracaoDias)
  const duracaoAnterior = mediana(demandasAnteriores.map(duracaoDias))
  const distribuicaoDuracao = FAIXAS_DURACAO.map((f, i) => ({
    rotulo: f.rotulo,
    valor: duracoes.filter((d) => d <= f.ate && d > (i ? FAIXAS_DURACAO[i - 1].ate : 0)).length,
  }))

  // ── por dono dos repositórios × impacto ──
  const areas = [...new Set(demandas.map((d) => areaSistema(d.repos[0])))]
    .map((area) => {
      const lista = demandas.filter((d) => areaSistema(d.repos[0]) === area)
      return { rotulo: area, valores: Object.fromEntries(ORDEM_IMPACTO.map((i) => [i, lista.filter((d) => d.impacto === i).length])) as Record<Impacto, number>, total: lista.length }
    })
    .sort((a, b) => b.total - a.total)

  // ── sistemas mais trabalhados ──
  const porRepo = new Map<string, number>()
  for (const c of commits) porRepo.set(c.repo, (porRepo.get(c.repo) ?? 0) + 1)
  const sistemas = [...porRepo.entries()]
    .map(([repo, total]) => ({ rotulo: nomeSistema(repo), href: `/sistemas/${slugRepo(repo)}`, valores: { commits: total }, total }))
    .sort((a, b) => b.total - a.total)

  // ── frentes ──
  const frentes = FRENTES.map((f) => ({ rotulo: f.rotulo, valor: demandas.filter((d) => f.padrao.test(`${d.titulo} ${d.resumo}`)).length }))

  // ── status no Jira das demandas do período ──
  const statusJira = m.base.jira
    ? (['done', 'indeterminate', 'new'] as const).map((k) => ({ id: k, rotulo: ROTULOS_STATUS[k], valor: demandas.filter((d) => d.jira?.categoria === k).length }))
    : null

  const porTipo = ORDEM_TIPOS.map((t) => ({ id: t, valor: demandas.filter((d) => d.tipo === t).length }))

  // mini-séries mensais para os indicadores: os últimos 24 meses com atividade dão contexto à tendência
  const mesesTodos = [...m.mensal.keys()].sort().slice(-24)
  const serie = (f: (x: Mes) => number) => mesesTodos.map((k) => f(m.mensal.get(k)!))

  return {
    geradoEm: m.base.geradoEm,
    fonte: m.base.fonte,
    aviso: m.base.aviso,
    progresso: m.base.progresso,
    vazio: m.commits.length === 0,
    visibilidade,
    /** a coleta já trouxe se cada repositório é público ou privado */
    temVisibilidade: Object.keys(m.base.privados).length > 0,
    periodo: { id: periodo.id, rotulo: periodo.rotulo, desde: desde.toISOString(), ate: agora.toISOString(), janelaDias: janela },
    indicadores: {
      demandas: { valor: demandas.length, variacao: variacao(demandas.length, demandasAnteriores.length), serie: serie((x) => x.concluidas) },
      commits: { valor: commits.length, variacao: variacao(commits.length, commitsAnteriores.length), serie: serie((x) => x.commits) },
      altoImpacto: {
        valor: demandas.filter((d) => d.impacto === 'alto').length,
        variacao: variacao(demandas.filter((d) => d.impacto === 'alto').length, demandasAnteriores.filter((d) => d.impacto === 'alto').length),
        serie: serie((x) => x.altoImpacto),
      },
      sistemasAtivos: { valor: ativos30, serie: serie((x) => x.repos.size) },
      duracaoMediana: { valor: mediana(duracoes), media: duracoes.length ? duracoes.reduce((s, v) => s + v, 0) / duracoes.length : 0, anterior: duracaoAnterior },
      rastreabilidade: {
        valor: commits.length ? Math.round((comChamado / commits.length) * 100) : 0,
        serie: serie((x) => (x.commits ? Math.round((x.comChamado / x.commits) * 100) : 0)),
      },
    },
    semanas,
    entregasMes,
    acumuladas,
    porTipo,
    areas,
    distribuicaoDuracao,
    calor: { dias: DIAS, faixas: FAIXAS, valores: calor },
    sistemas: sistemas.slice(0, 10),
    frentes,
    statusJira,
    ultimosCommits: commits.slice(0, 200).map((c) => {
      const d = demandaDoCommit(m, c)
      return { hash: c.hash.slice(0, 7), data: c.data, assunto: c.assunto, url: c.url, sistema: nomeSistema(c.repo), demanda: d ? { slug: d.slug, rotulo: d.rotulo } : null }
    }),
  }
}

export type Dashboard = ReturnType<typeof dashboardDe>
