import { FRENTES, ORDEM_TIPOS, type Impacto, type TipoId } from './config'
import type { Base } from './fonte'
import type { CommitBase } from './github'
import type { IssueJira } from './jira'

/*
 * Funções puras sobre os dados coletados: rodam no servidor (modo local,
 * lib/servidor.ts) e no navegador (modo hospedado, a coleta fica na aba).
 * Nada aqui pode ler arquivo, .env ou cookie.
 */

type Analise = { titulo: string; tipo: TipoId; impacto: Impacto; resumo: string }

export type CommitResumo = { hash: string; data: string; assunto: string; repo: string; url: string }

export type CommitDetalhe = CommitResumo & { corpo: string; arquivos: number; adicionadas: number; removidas: number }

export type Demanda = {
  id: string
  slug: string
  /** "ABC-134" ou "Sem chamado" */
  rotulo: string
  titulo: string
  tipo: TipoId
  impacto: Impacto
  resumo: string
  /** true quando tipo ou impacto vieram das regras automáticas (sem dado do Jira) */
  automatica: boolean
  jira: Pick<IssueJira, 'status' | 'categoria' | 'tipo' | 'prioridade' | 'url'> | null
  /** sistema principal primeiro */
  repos: string[]
  sistemas: string[]
  inicio: string
  fim: string
  nCommits: number
}

/**
 * Nomes de repositório que aparecem com mais de um dono nos dados (ex.:
 * "empresa/api" e "voce/api"). Atualizado a cada montagem do modelo.
 */
let nomesRepetidos = new Set<string>()

/** "dono/nome" → nome (ou "dono/nome" quando outro dono tem um repositório com o mesmo nome); o dono vira a "área". */
export const nomeSistema = (repo: string) => {
  const nome = repo.split('/')[1] ?? repo
  return nomesRepetidos.has(nome.toLowerCase()) ? repo : nome
}
export const areaSistema = (repo: string) => (repo.includes('/') ? repo.split('/')[0] : 'Outros')
export const slugRepo = (repo: string) => repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const slugDemanda = (id: string) => (id.startsWith('SC:') ? `sem-chamado-${slugRepo(id.slice(3))}` : id.toLowerCase())

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Tira prefixos de chamado/convenção e a frase de versão, que não dizem o que foi feito. */
export function limparAssunto(assunto: string) {
  return assunto
    .replace(/^\s*\[?[A-Z][A-Z0-9]+-\d+\]?\s*[:\-–]*\s*/i, '')
    .replace(/^(feat|fix|refactor|chore|docs|style|test|perf|build|ci)(\([^)]*\))?!?\s*:+\s*/i, '')
    .replace(/^Atualiza(r)? (a )?vers[ãa]o d[oa] (aplicativo|sistema) para [\d.]+[.,]?\s*(e\s+)?/i, '')
    .replace(/^\s*[-:]+\s*/, '')
    .trim()
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Mensagens que não dizem o que foi feito: criação do repositório, README, versão… */
const GENERICA = /^(initial commit|first (upload|commit)|comit inicial|commit inicial|inicial|iniciar|init\b.*|inicializa[çc][ãa]o( do projeto)?|iniciando projeto|update readme.*|add readme|readme|gitignore.*|teste?|wip|ajustes?|debug.*|vers[ãa]o|merge.*)\.?$/i
const INICIAL = /\b(initial commit|first upload|first commit|comit inicial|commit inicial|inicializa|iniciando projeto|estrutura inicial|initialize project|^inicial$|^iniciar$)/i

const cortar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 3).replace(/\s+\S*$/, '')}…` : t)

/**
 * Classificação simples a partir dos commits: regras por palavra-chave nas
 * mensagens e volume de trabalho para o impacto.
 */
export function analiseAutomatica(id: string, commits: CommitBase[]): Analise {
  const repo = commits[0].repo
  const cronologicos = [...commits].reverse()
  const textos = [...new Set(cronologicos.map((c) => limparAssunto(c.assunto)).filter((t) => t && !GENERICA.test(t)))]
  const tudo = commits.map((c) => `${c.assunto} ${c.corpo}`).join(' ').toLowerCase()
  const adicionadas = commits.reduce((s, c) => s + c.adicionadas, 0)
  const arquivos = commits.reduce((s, c) => s + c.arquivos, 0)

  const conta = (re: RegExp) => commits.filter((c) => re.test(c.assunto.toLowerCase())).length
  const correcoes = conta(/\b(fix|corrig|correç|correc|bug|hotfix)/)
  const novidades = conta(/\b(feat|implementa|adiciona|cria|nova|novo|desenvolvimento|add|create|implement)/)
  const estrutura = conta(/\b(refator|refactor|log|readme|document|docs|gitignore|auditoria|test|chore|ci)/)
  const integra = /\b(api|integraç|integrac|integrat|webhook|openai|\bia\b|\bai\b|llm|robo|robô|rpa|bot)/.test(tudo)
  const criacao = INICIAL.test(limparAssunto(cronologicos[0].assunto)) || INICIAL.test(cronologicos[0].assunto)

  let tipo: TipoId = 'melhoria'
  if (criacao && adicionadas > 500) tipo = 'novo-sistema'
  else if (correcoes > novidades && correcoes >= estrutura) tipo = 'correcao'
  else if (novidades >= estrutura && novidades > 0) tipo = integra ? 'integracao' : 'funcionalidade'
  else if (estrutura > 0 || criacao) tipo = 'estrutura'

  const impacto: Impacto = tipo === 'novo-sistema' || commits.length >= 15 || adicionadas >= 3000 ? 'medio' : 'baixo'

  const sistema = nomeSistema(repo)
  const titulo = criacao ? `Criação do ${sistema}` : capitalizar(textos[0] ?? `Ajustes em ${sistema}`).replace(/\.$/, '')

  const partes: string[] = []
  if (criacao) partes.push(`Primeira versão do ${sistema}: ${arquivos.toLocaleString('pt-BR')} arquivos e ${adicionadas.toLocaleString('pt-BR')} linhas.`)
  // sem criação, o primeiro texto já virou o título (capitalizado: comparar strings não o acharia)
  const detalhes = (criacao ? textos : textos.slice(1)).slice(0, 3)
  if (detalhes.length) partes.push(`${capitalizar(detalhes.map((t) => t.replace(/\.$/, '')).join('; '))}.`)
  if (!partes.length) partes.push(`${commits.length} commit${commits.length > 1 ? 's' : ''} em ${sistema}${id.startsWith('SC:') ? ' sem chamado no Jira' : ''}.`)

  return { titulo: cortar(titulo, 90), tipo, impacto, resumo: cortar(partes.join(' '), 300) }
}

/** Tipo de issue do Jira → tipo de entrega. Tarefas genéricas ficam com a regra automática. */
export function tipoDoJira(nome: string): TipoId | null {
  const n = nome.toLowerCase()
  if (/bug|defeito|erro|incident/.test(n)) return 'correcao'
  if (/epic|[ée]pico|initiative|iniciativa/.test(n)) return 'novo-sistema'
  if (/story|hist[óo]ria|feature|funcionalidade|requisito/.test(n)) return 'funcionalidade'
  if (/improvement|melhoria|aprimoramento/.test(n)) return 'melhoria'
  if (/spike|d[ée]bito|tech debt|documenta|refator/.test(n)) return 'estrutura'
  return null
}

/** Prioridade do Jira → impacto. */
export function impactoDoJira(prioridade: string | null): Impacto | null {
  if (!prioridade) return null
  const p = prioridade.toLowerCase()
  if (/high|blocker|critical|cr[íi]tic|alt[ao]|alt[íi]ssima|urgente|major/.test(p)) return 'alto'
  if (/medium|m[ée]dia|normal/.test(p)) return 'medio'
  if (/low|baixa|minor|trivial/.test(p)) return 'baixo'
  return null
}

/** Chamado que agrupa o commit: o primeiro que o Jira confirma (ou o primeiro citado, sem Jira). */
const chaveDemanda = (c: CommitBase, jira: Base['jira']) => (jira ? c.chamados.find((k) => jira[k]) : c.chamados[0]) ?? `SC:${c.repo}`

const chaveCommit = (c: { repo: string; hash: string }) => `${c.repo}@${c.hash}`

/** Contagens de um mês, calculadas numa passada só (os indicadores leem daqui). */
export type Mes = { commits: number; comChamado: number; repos: Set<string>; concluidas: number; altoImpacto: number; porTipo: Record<TipoId, number> }

export type Modelo = {
  base: Base
  demandas: Demanda[]
  /** mais recente primeiro */
  commits: CommitBase[]
  grupos: Map<string, CommitBase[]>
  /** "repo@hash" → demanda, para ligar commits às demandas sem varrer a lista */
  demandaPorCommit: Map<string, Demanda>
  /** "AAAA-MM" → contagens do mês */
  mensal: Map<string, Mes>
}

const tiposZerados = () => Object.fromEntries(ORDEM_TIPOS.map((t) => [t, 0])) as Record<TipoId, number>

/**
 * `todosCommits`: base para os nomes homônimos. Num modelo filtrado (só
 * públicos, só privados) os nomes seguem os de todos os repositórios, para o
 * mesmo sistema não mudar de nome conforme o filtro.
 */
export function montarModelo(base: Base, todosCommits: CommitBase[] = base.commits): Modelo {
  // antes de qualquer nomeSistema(): repositórios homônimos de donos diferentes viram "dono/nome"
  const donosPorNome = new Map<string, Set<string>>()
  for (const c of todosCommits) {
    const [dono = '', nome = ''] = c.repo.toLowerCase().split('/')
    const donos = donosPorNome.get(nome)
    if (donos) donos.add(dono)
    else donosPorNome.set(nome, new Set([dono]))
  }
  nomesRepetidos = new Set([...donosPorNome].filter(([, donos]) => donos.size > 1).map(([nome]) => nome))

  const grupos = new Map<string, CommitBase[]>()
  for (const c of base.commits) {
    const chave = chaveDemanda(c, base.jira)
    const lista = grupos.get(chave)
    if (lista) lista.push(c)
    else grupos.set(chave, [c])
  }

  const demandas: Demanda[] = []
  const demandaPorCommit = new Map<string, Demanda>()
  for (const [id, commits] of grupos) {
    const auto = analiseAutomatica(id, commits)
    const issue = base.jira?.[id]
    const tipoJira = issue && tipoDoJira(issue.tipo)
    const impactoJira = issue && impactoDoJira(issue.prioridade)
    const contagemRepo = new Map<string, number>()
    for (const c of commits) contagemRepo.set(c.repo, (contagemRepo.get(c.repo) ?? 0) + 1)
    const repos = [...contagemRepo.entries()].sort((x, y) => y[1] - x[1]).map(([r]) => r)
    const d: Demanda = {
      id,
      slug: slugDemanda(id),
      rotulo: id.startsWith('SC:') ? 'Sem chamado' : id,
      titulo: issue ? cortar(issue.titulo, 120) : auto.titulo,
      tipo: tipoJira ?? auto.tipo,
      impacto: impactoJira ?? auto.impacto,
      resumo: auto.resumo,
      automatica: !tipoJira || !impactoJira,
      jira: issue ? { status: issue.status, categoria: issue.categoria, tipo: issue.tipo, prioridade: issue.prioridade, url: issue.url } : null,
      repos,
      sistemas: repos.map(nomeSistema),
      inicio: commits.at(-1)!.data,
      fim: commits[0].data,
      nCommits: commits.length,
    }
    demandas.push(d)
    for (const c of commits) demandaPorCommit.set(chaveCommit(c), d)
  }
  // mais recente primeiro — é a leitura natural num acompanhamento
  demandas.sort((a, b) => b.fim.localeCompare(a.fim))

  const mensal = new Map<string, Mes>()
  const mes = (chave: string) => {
    let x = mensal.get(chave)
    if (!x) mensal.set(chave, (x = { commits: 0, comChamado: 0, repos: new Set(), concluidas: 0, altoImpacto: 0, porTipo: tiposZerados() }))
    return x
  }
  for (const c of base.commits) {
    const x = mes(c.data.slice(0, 7))
    x.commits++
    x.repos.add(c.repo)
    if (!demandaPorCommit.get(chaveCommit(c))!.id.startsWith('SC:')) x.comChamado++
  }
  for (const d of demandas) {
    const x = mes(d.fim.slice(0, 7))
    x.concluidas++
    x.porTipo[d.tipo]++
    if (d.impacto === 'alto') x.altoImpacto++
  }

  return { base, demandas, commits: base.commits, grupos, demandaPorCommit, mensal }
}

export const demandaDoCommit = (m: Modelo, c: { repo: string; hash: string }) => m.demandaPorCommit.get(chaveCommit(c)) ?? null

/** Recorte por visibilidade do repositório (filtro do dashboard e do portfólio). */
export const VISIBILIDADES = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'privados', rotulo: 'Privados' },
  { id: 'publicos', rotulo: 'Públicos' },
] as const

export type VisibilidadeId = (typeof VISIBILIDADES)[number]['id']

/** Valor do parâmetro `?repos=` da URL; qualquer outra coisa vale "todos". */
export function lerVisibilidade(valor: string | string[] | undefined): VisibilidadeId {
  const v = Array.isArray(valor) ? valor[0] : valor
  return VISIBILIDADES.some((x) => x.id === v) ? (v as VisibilidadeId) : 'todos'
}

/**
 * Commits do recorte. Repositório sem visibilidade conhecida (coletado antes
 * desse dado existir) só aparece em "todos".
 */
export function filtrarPorVisibilidade<T extends { repo: string }>(commits: T[], privados: Record<string, boolean>, visibilidade: VisibilidadeId) {
  if (visibilidade === 'todos') return commits
  const querPrivado = visibilidade === 'privados'
  return commits.filter((c) => privados[c.repo] === querPrivado)
}

// o modelo só é remontado quando os dados mudam (lote novo da coleta, Jira); um por recorte
const memos = new Map<VisibilidadeId, { chave: string; modelo: Modelo }>()

/**
 * Modelo do recorte, memorizado. `chave` muda quando os dados mudam (no
 * servidor, a revisão da coleta; no navegador, a versão da coleta da aba).
 */
export function recortar(base: Base, visibilidade: VisibilidadeId = 'todos', chave = ''): Modelo {
  const completa = `${chave}:${base.usuario?.id ?? ''}:${base.commits.length}:${base.jira ? Object.keys(base.jira).length : -1}:${Object.keys(base.privados).length}`
  let memo = memos.get(visibilidade)
  if (memo?.chave !== completa) {
    const commits = filtrarPorVisibilidade(base.commits, base.privados, visibilidade)
    memo = { chave: completa, modelo: montarModelo({ ...base, commits }, base.commits) }
    memos.set(visibilidade, memo)
  }
  // os dados vêm do modelo memorizado; fonte, aviso e progresso, sempre da leitura atual
  return { ...memo.modelo, base: { ...base, commits: memo.modelo.commits } }
}

/** Meses do primeiro ao último commit (lista vazia sem commits). */
function meses(commits: CommitBase[]) {
  const lista: { chave: string; rotulo: string }[] = []
  if (!commits.length) return lista
  const primeiro = new Date(commits.at(-1)!.data)
  const ultimo = new Date(commits[0].data)
  for (let d = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1); d <= ultimo; d.setMonth(d.getMonth() + 1)) {
    lista.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: MESES[d.getMonth()] })
  }
  return lista
}

/** Commits e demandas concluídas por mês, na escala de meses do modelo inteiro. */
function contarMeses(m: Modelo, commits: CommitBase[], lista: Demanda[]) {
  const r = meses(m.commits).map((x) => ({ ...x, commits: 0, demandas: 0 }))
  const porChave = new Map(r.map((x) => [x.chave, x]))
  for (const c of commits) {
    const x = porChave.get(c.data.slice(0, 7))
    if (x) x.commits++
  }
  for (const d of lista) {
    const x = porChave.get(d.fim.slice(0, 7))
    if (x) x.demandas++
  }
  return r
}

export const contarTipos = (lista: Demanda[]) => {
  const r = tiposZerados()
  for (const d of lista) r[d.tipo]++
  return r
}

function resumoSistemas(m: Modelo) {
  const porRepo = new Map<string, { commits: number; demandas: Set<string>; ultimo: string; primeiro: string }>()
  for (const c of m.commits) {
    const r = porRepo.get(c.repo) ?? { commits: 0, demandas: new Set(), ultimo: '', primeiro: '9999' }
    r.commits++
    r.demandas.add(demandaDoCommit(m, c)!.id)
    if (c.data > r.ultimo) r.ultimo = c.data
    if (c.data < r.primeiro) r.primeiro = c.data
    porRepo.set(c.repo, r)
  }
  return [...porRepo.entries()]
    .map(([repo, r]) => ({
      repo,
      slug: slugRepo(repo),
      nome: nomeSistema(repo),
      area: areaSistema(repo),
      commits: r.commits,
      demandas: r.demandas.size,
      ultimo: r.ultimo,
      primeiro: r.primeiro,
    }))
    .sort((a, b) => b.commits - a.commits)
}

export const PESO_IMPACTO: Record<Impacto, number> = { alto: 3, medio: 2, baixo: 1 }
export const maisRelevantes = (a: Demanda, b: Demanda) => PESO_IMPACTO[b.impacto] - PESO_IMPACTO[a.impacto] || b.nCommits - a.nCommits

/** Entregas por mês (data de conclusão), empilhadas por tipo. */
function entregasPorMes(m: Modelo) {
  return meses(m.commits).map(({ chave, rotulo }) => {
    const x = m.mensal.get(chave)
    return { chave, rotulo, valores: x ? { ...x.porTipo } : tiposZerados(), altoImpacto: x?.altoImpacto ?? 0, commits: x?.commits ?? 0 }
  })
}

/** Frentes: quantas demandas tocaram cada tema e os melhores exemplos. */
function resumoFrentes(m: Modelo) {
  return FRENTES.map((f) => {
    // só o título e o resumo: as mensagens de commit citam logs e testes o tempo todo e inflariam as frentes
    const lista = m.demandas.filter((d) => f.padrao.test(`${d.titulo} ${d.resumo}`))
    return {
      id: f.id,
      rotulo: f.rotulo,
      descricao: f.descricao,
      demandas: lista.length,
      altoImpacto: lista.filter((d) => d.impacto === 'alto').length,
      sistemas: new Set(lista.flatMap((d) => d.repos)).size,
      exemplos: [...lista].sort(maisRelevantes).slice(0, 3).map((d) => ({ slug: d.slug, rotulo: d.rotulo, titulo: d.titulo })),
    }
  })
}

/** Resultado por dono dos repositórios (conta pessoal ou organização). */
function resumoAreas(m: Modelo) {
  const porArea = new Map<string, Demanda[]>()
  for (const d of m.demandas) {
    const area = areaSistema(d.repos[0])
    const lista = porArea.get(area)
    if (lista) lista.push(d)
    else porArea.set(area, [d])
  }
  return [...porArea.entries()]
    .map(([area, lista]) => ({
      area,
      demandas: lista.length,
      altoImpacto: lista.filter((d) => d.impacto === 'alto').length,
      novos: lista.filter((d) => d.tipo === 'novo-sistema').length,
      sistemas: [...new Set(lista.map((d) => d.repos[0]))].map((r) => ({ slug: slugRepo(r), nome: nomeSistema(r) })),
      porTipo: contarTipos(lista),
      principais: [...lista].sort(maisRelevantes).slice(0, 2).map((d) => ({ slug: d.slug, rotulo: d.rotulo, titulo: d.titulo })),
    }))
    .sort((a, b) => b.demandas - a.demandas)
}

/** "AAAA-MM-DD" na hora local (o mesmo critério do mapa de calor). */
const diaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export type DiaGrade = { data: string; commits: number }

/**
 * Grade de commits por dia, no formato do gráfico de contribuições: uma coluna
 * por semana (segunda a domingo), terminando na semana de `fim`. Dias depois
 * de `fim` ficam null.
 */
export function gradeDeCommits(commits: { data: string }[], fim: string, nSemanas = 53) {
  const porDia = new Map<string, number>()
  for (const c of commits) {
    const k = diaLocal(new Date(c.data))
    porDia.set(k, (porDia.get(k) ?? 0) + 1)
  }
  const final = new Date(fim)
  const ultimoDia = diaLocal(final)
  const inicio = new Date(final.getFullYear(), final.getMonth(), final.getDate())
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7) - (nSemanas - 1) * 7)

  const semanas: (DiaGrade | null)[][] = []
  let max = 0
  for (let s = 0; s < nSemanas; s++) {
    const semana: (DiaGrade | null)[] = []
    for (let d = 0; d < 7; d++) {
      const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + s * 7 + d)
      const data = diaLocal(dia)
      if (data > ultimoDia) {
        semana.push(null)
        continue
      }
      const n = porDia.get(data) ?? 0
      if (n > max) max = n
      semana.push({ data, commits: n })
    }
    semanas.push(semana)
  }
  const diasAtivos = semanas.flat().filter((d) => d && d.commits > 0).length
  return { semanas, max, diasAtivos }
}

function calcularPainel(m: Modelo) {
  const sistemas = resumoSistemas(m)
  const porTipo = contarTipos(m.demandas)
  return {
    periodo: m.commits.length ? { inicio: m.commits.at(-1)!.data, fim: m.commits[0].data } : null,
    kpis: {
      demandas: m.demandas.length,
      chamados: m.demandas.filter((d) => !d.id.startsWith('SC:')).length,
      novosSistemas: porTipo['novo-sistema'],
      altoImpacto: m.demandas.filter((d) => d.impacto === 'alto').length,
      sistemas: sistemas.length,
      commits: m.commits.length,
      automaticas: m.demandas.filter((d) => d.automatica).length,
    },
    porTipo,
    meses: contarMeses(m, m.commits, m.demandas),
    entregasMes: entregasPorMes(m),
    frentes: resumoFrentes(m),
    areas: resumoAreas(m),
    sistemas,
    grade: gradeDeCommits(m.commits, m.base.geradoEm),
  }
}

/** Resumo do painel, memorizado com o modelo: o layout, o rodapé e a página pedem o mesmo. */
let memoPainel: { demandas: Demanda[]; painel: ReturnType<typeof calcularPainel> } | null = null

export function painelDe(m: Modelo) {
  if (memoPainel?.demandas !== m.demandas) memoPainel = { demandas: m.demandas, painel: calcularPainel(m) }
  return {
    geradoEm: m.base.geradoEm,
    fonte: m.base.fonte,
    aviso: m.base.aviso,
    progresso: m.base.progresso,
    usuario: m.base.usuario,
    jiraAtivo: m.base.jira !== null,
    vazio: m.commits.length === 0,
    ...memoPainel.painel,
    demandas: m.demandas,
  }
}

export type Painel = ReturnType<typeof painelDe>

/** Demanda completa: commits com mensagem inteira e totais de linhas. */
export function demandaDe(m: Modelo, slug: string) {
  const i = m.demandas.findIndex((d) => d.slug === slug)
  if (i < 0) return null
  const d = m.demandas[i]
  const brutos = m.grupos.get(d.id)!

  const relacionadas = m.demandas
    .filter((x) => x.id !== d.id && x.repos[0] === d.repos[0])
    .sort((a, b) => Math.abs(+new Date(a.fim) - +new Date(d.fim)) - Math.abs(+new Date(b.fim) - +new Date(d.fim)))
    .slice(0, 3)
  return {
    demanda: d,
    commits: brutos.map<CommitDetalhe>((c) => ({
      hash: c.hash.slice(0, 7),
      data: c.data,
      repo: c.repo,
      url: c.url,
      assunto: c.assunto,
      corpo: c.corpo,
      arquivos: c.arquivos,
      adicionadas: c.adicionadas,
      removidas: c.removidas,
    })),
    adicionadas: brutos.reduce((s, c) => s + c.adicionadas, 0),
    removidas: brutos.reduce((s, c) => s + c.removidas, 0),
    arquivosTocados: brutos.reduce((s, c) => s + c.arquivos, 0),
    relacionadas,
    // a lista é da mais recente para a mais antiga
    anterior: m.demandas[i + 1] ?? null,
    proxima: m.demandas[i - 1] ?? null,
  }
}

/** Os 20 commits mais recentes da demanda bastam para apontar onde o trabalho se concentrou. */
export const commitsParaArquivos = (m: Modelo, id: string) => (m.grupos.get(id) ?? []).slice(0, 20).map((c) => ({ repo: c.repo, hash: c.hash }))

/** Os 8 arquivos mais alterados, somando as mudanças de cada commit. */
export function arquivosMaisAlterados(listas: { arquivo: string; mudancas: number }[][]) {
  const arquivos = new Map<string, number>()
  for (const lista of listas) for (const { arquivo, mudancas } of lista) arquivos.set(arquivo, (arquivos.get(arquivo) ?? 0) + mudancas)
  return [...arquivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a]) => a)
}

export function sistemaDe(m: Modelo, slug: string) {
  const s = resumoSistemas(m).find((x) => x.slug === slug)
  if (!s) return null
  const lista = m.demandas.filter((d) => d.repos.includes(s.repo))
  return {
    sistema: s,
    demandas: lista,
    porTipo: contarTipos(lista),
    meses: contarMeses(
      m,
      m.commits.filter((c) => c.repo === s.repo),
      lista.filter((d) => d.repos[0] === s.repo),
    ),
  }
}
