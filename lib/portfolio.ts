import { FRENTES, ORDEM_TIPOS, type TipoId } from './config'
import { areaSistema, contarTipos, gradeDeCommits, maisRelevantes, nomeSistema, PESO_IMPACTO, slugRepo, type Demanda, type Modelo, type VisibilidadeId } from './dados'
import type { CommitBase } from './github'

/**
 * Portfólio: os repositórios que melhor contam o trabalho, escolhidos por
 * regras explícitas (nada de IA). Cada critério vira uma nota de 0 a 1,
 * relativa ao melhor repositório naquele critério, e a soma ponderada dá a
 * nota de 0 a 100. A página mostra a conta de cada projeto.
 */

export const CRITERIOS = [
  { id: 'impacto', rotulo: 'Impacto', peso: 35, descricao: 'Soma do impacto das entregas que têm o repositório como principal (alto vale 3, médio 2, baixo 1).' },
  { id: 'esforco', rotulo: 'Esforço', peso: 20, descricao: 'Commits seus no repositório, em escala logarítmica para um projeto enorme não esmagar os outros.' },
  { id: 'continuidade', rotulo: 'Continuidade', peso: 20, descricao: 'Meses diferentes com commits: projetos sustentados ao longo do tempo pesam mais que picos.' },
  { id: 'autoria', rotulo: 'Autoria', peso: 15, descricao: 'Se o sistema foi criado por você (há uma entrega do tipo "Novo sistema").' },
  { id: 'variedade', rotulo: 'Variedade', peso: 10, descricao: 'Quantos tipos de entrega diferentes o projeto reuniu: criação, integrações, correções…' },
] as const

export type CriterioId = (typeof CRITERIOS)[number]['id']

const PLURAIS: Record<TipoId, [string, string]> = {
  'novo-sistema': ['sistema novo', 'sistemas novos'],
  funcionalidade: ['funcionalidade', 'funcionalidades'],
  integracao: ['integração', 'integrações'],
  melhoria: ['melhoria', 'melhorias'],
  correcao: ['correção', 'correções'],
  estrutura: ['entrega de estrutura', 'entregas de estrutura'],
}

const mesAno = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' ')
const chaveMes = (iso: string) => iso.slice(0, 7)
const juntar = (itens: string[]) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? ''))

type Bruto = Record<CriterioId, number>

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** "dono/meu_projeto-v2" → "Meu projeto v2": nome para apresentar, sem o dono. */
export const tituloAmigavel = (repo: string) => capitalizar((repo.split('/')[1] ?? repo).replace(/[-_]+/g, ' ').trim())

/** "[CONEXÃO] [UI] PV-12: modificar tela." → "Modificar tela": título de entrega para apresentar. */
export const tituloLimpo = (titulo: string) =>
  capitalizar(
    titulo
      .replace(/^(\s*\[[^\]]*\]\s*)+/, '')
      .replace(/^[A-Z][A-Z0-9]+-\d+\s*[:\-–]?\s*/, '')
      .trim()
      .replace(/\.$/, ''),
  )

/** Frentes como entram numa frase ("com foco em …"). */
const FRASE_FRENTE: Record<string, string> = {
  automacao: 'automação',
  integracoes: 'integrações',
  ia: 'inteligência artificial',
  qualidade: 'testes automatizados',
  infra: 'infraestrutura',
}

/** Chamada do projeto: como nasceu e no que se concentrou. */
export function chamadaProjeto(p: { criou: boolean; frentes: { id: string; demandas: number }[]; porTipo: Record<TipoId, number> }) {
  const base = p.criou ? 'Sistema criado do zero' : 'Sistema em evolução contínua'
  const frentes = [...p.frentes].sort((a, b) => b.demandas - a.demandas).slice(0, 2).map((f) => FRASE_FRENTE[f.id] ?? f.id)
  if (frentes.length) return `${base}, com foco em ${juntar(frentes)}.`
  // "novo sistema" já está dito no começo da frase ("criado do zero")
  const dominante = ORDEM_TIPOS.filter((t) => t !== 'novo-sistema' && p.porTipo[t] > 0).sort((a, b) => p.porTipo[b] - p.porTipo[a])[0]
  return dominante ? `${base}, com foco em ${PLURAIS[dominante][1]}.` : `${base}.`
}

/** Valores brutos de cada critério para um repositório. */
function brutos(principais: Demanda[], commits: number, meses: number): Bruto {
  return {
    impacto: principais.reduce((s, d) => s + PESO_IMPACTO[d.impacto], 0),
    esforco: Math.log10(1 + commits),
    continuidade: meses,
    autoria: principais.some((d) => d.tipo === 'novo-sistema') ? 1 : 0,
    variedade: new Set(principais.map((d) => d.tipo)).size,
  }
}

/** Frase de abertura do projeto, montada a partir dos números. */
export function resumoProjeto(p: { nome: string; criou: boolean; inicio: string; meses: number; porTipo: Record<TipoId, number>; altoImpacto: number; entregas: number }) {
  const abertura = p.criou ? `Criou o ${p.nome} em ${mesAno(p.inicio)}` : `Trabalhou no ${p.nome} a partir de ${mesAno(p.inicio)}`
  const tempo = p.meses > 1 ? ` e o evoluiu ao longo de ${p.meses} meses` : ''
  const tipos = ORDEM_TIPOS.filter((t) => p.porTipo[t] > 0)
    .sort((a, b) => p.porTipo[b] - p.porTipo[a])
    .slice(0, 3)
    .map((t) => `${p.porTipo[t]} ${PLURAIS[t][p.porTipo[t] === 1 ? 0 : 1]}`)
  const entregas = `${p.entregas} entrega${p.entregas === 1 ? '' : 's'}`
  const detalhe = tipos.length ? `${entregas}, entre elas ${juntar(tipos)}` : entregas
  const alto = p.altoImpacto ? ` ${p.altoImpacto === 1 ? 'Uma delas foi' : `${p.altoImpacto} delas foram`} de alto impacto.` : ''
  return `${abertura}${tempo}: ${detalhe}.${alto}`
}

/** Monta o portfólio sobre o modelo: os `n` repositórios de maior nota. */
export function montarPortfolio(m: Modelo, n = 6) {
  type Acumulado = { commits: number; adicionadas: number; removidas: number; meses: Set<string>; primeiro: string; ultimo: string; porMes: Map<string, number> }
  const porRepo = new Map<string, Acumulado>()
  const commitsPorRepo = new Map<string, CommitBase[]>()
  for (const c of m.commits) {
    const lista = commitsPorRepo.get(c.repo)
    if (lista) lista.push(c)
    else commitsPorRepo.set(c.repo, [c])
    let r = porRepo.get(c.repo)
    if (!r) porRepo.set(c.repo, (r = { commits: 0, adicionadas: 0, removidas: 0, meses: new Set(), primeiro: c.data, ultimo: c.data, porMes: new Map() }))
    r.commits++
    r.adicionadas += c.adicionadas
    r.removidas += c.removidas
    r.meses.add(chaveMes(c.data))
    r.porMes.set(chaveMes(c.data), (r.porMes.get(chaveMes(c.data)) ?? 0) + 1)
    if (c.data < r.primeiro) r.primeiro = c.data
    if (c.data > r.ultimo) r.ultimo = c.data
  }

  const principaisPorRepo = new Map<string, Demanda[]>()
  for (const d of m.demandas) {
    const lista = principaisPorRepo.get(d.repos[0])
    if (lista) lista.push(d)
    else principaisPorRepo.set(d.repos[0], [d])
  }

  const candidatos = [...porRepo.entries()].map(([repo, r]) => {
    const principais = principaisPorRepo.get(repo) ?? []
    return { repo, r, principais, bruto: brutos(principais, r.commits, r.meses.size) }
  })

  // cada critério relativo ao melhor repositório nele
  const maximos = Object.fromEntries(CRITERIOS.map((c) => [c.id, Math.max(0, ...candidatos.map((x) => x.bruto[c.id]))])) as Bruto
  const pontuados = candidatos.map((x) => {
    const notas = CRITERIOS.map((c) => {
      const relativo = maximos[c.id] ? x.bruto[c.id] / maximos[c.id] : 0
      return { id: c.id, rotulo: c.rotulo, peso: c.peso, relativo, pontos: relativo * c.peso }
    })
    return { ...x, notas, nota: Math.round(notas.reduce((s, c) => s + c.pontos, 0)) }
  })
  pontuados.sort((a, b) => b.nota - a.nota || b.r.commits - a.r.commits || a.repo.localeCompare(b.repo))

  // escala de meses comum a todos os projetos (do primeiro ao último commit do período)
  const mesesPeriodo: string[] = []
  if (m.commits.length) {
    const fim = chaveMes(m.commits[0].data)
    for (let d = new Date(`${chaveMes(m.commits.at(-1)!.data)}-01T12:00:00Z`); ; d.setUTCMonth(d.getUTCMonth() + 1)) {
      const k = d.toISOString().slice(0, 7)
      mesesPeriodo.push(k)
      if (k >= fim) break
    }
  }

  const projetos = pontuados.slice(0, n).map((x, i) => {
    const { repo, r, principais } = x
    const porTipo = contarTipos(principais)
    const altoImpacto = principais.filter((d) => d.impacto === 'alto').length
    const criou = x.bruto.autoria === 1
    const nome = nomeSistema(repo)
    const linguagens = m.base.linguagens[repo] ?? []
    const totalBytes = linguagens.reduce((s, l) => s + l.bytes, 0)
    const frentes = FRENTES.map((f) => ({ id: f.id, rotulo: f.rotulo, demandas: principais.filter((d) => f.padrao.test(`${d.titulo} ${d.resumo}`)).length })).filter((f) => f.demandas > 0)
    // entregas com chamado primeiro: o "sem chamado" agrupa sobras e só entra se faltar exemplo
    const ordenadas = [...principais].sort((a, b) => Number(a.id.startsWith('SC:')) - Number(b.id.startsWith('SC:')) || maisRelevantes(a, b))
    return {
      posicao: i + 1,
      repo,
      slug: slugRepo(repo),
      nome,
      titulo: tituloAmigavel(repo),
      chamada: chamadaProjeto({ criou, frentes, porTipo }),
      dono: areaSistema(repo),
      nota: x.nota,
      notas: x.notas,
      criou,
      inicio: r.primeiro,
      fim: r.ultimo,
      mesesAtivos: r.meses.size,
      resumo: resumoProjeto({ nome, criou, inicio: r.primeiro, meses: r.meses.size, porTipo, altoImpacto, entregas: principais.length }),
      numeros: {
        entregas: principais.length,
        chamados: principais.filter((d) => !d.id.startsWith('SC:')).length,
        altoImpacto,
        commits: r.commits,
        adicionadas: r.adicionadas,
        removidas: r.removidas,
      },
      porTipo,
      destaques: ordenadas.slice(0, 4),
      /** três frases curtas para o card: títulos sem etiquetas nem chave de chamado, sem repetir */
      // para vender, o que foi construído vem antes do que foi consertado (sort estável: mantém a relevância dentro de cada grupo)
      vitrine: [...new Set([...ordenadas].filter((d) => !d.id.startsWith('SC:')).sort((a, b) => Number(a.tipo === 'correcao') - Number(b.tipo === 'correcao')).map((d) => tituloLimpo(d.titulo)))].filter(Boolean).slice(0, 3),
      /** todas as entregas, para os detalhes */
      entregas: ordenadas,
      frentes,
      // menos de 1% do código é ruído (um Dockerfile, um script): fica de fora
      linguagens: linguagens.map((l) => ({ ...l, parte: totalBytes ? l.bytes / totalBytes : 0 })).filter((l) => l.parte >= 0.01),
      atividade: mesesPeriodo.map((k) => r.porMes.get(k) ?? 0),
      /** capa do card: as últimas 26 semanas de commits do projeto */
      capa: gradeDeCommits(commitsPorRepo.get(repo) ?? [], r.ultimo, 26),
    }
  })

  // nomes repetidos (o mesmo projeto em contas diferentes) levam o dono para não confundir
  const contagemTitulos = new Map<string, number>()
  for (const p of projetos) contagemTitulos.set(p.titulo, (contagemTitulos.get(p.titulo) ?? 0) + 1)
  for (const p of projetos) if (contagemTitulos.get(p.titulo)! > 1) p.titulo = `${p.titulo} · ${p.dono}`

  // perfil: as frentes mais fortes de todo o trabalho e a stack somada dos projetos mostrados
  const frentesGerais = FRENTES.map((f) => ({ id: f.id, demandas: m.demandas.filter((d) => f.padrao.test(`${d.titulo} ${d.resumo}`)).length }))
    .filter((f) => f.demandas > 0)
    .sort((a, b) => b.demandas - a.demandas)
    .slice(0, 3)
  const bytesPorLinguagem = new Map<string, { nome: string; cor: string; bytes: number }>()
  for (const p of projetos)
    for (const l of p.linguagens) {
      const x = bytesPorLinguagem.get(l.nome)
      if (x) x.bytes += l.bytes
      else bytesPorLinguagem.set(l.nome, { nome: l.nome, cor: l.cor, bytes: l.bytes })
    }
  const perfil = {
    posicionamento: frentesGerais.length
      ? `Desenvolvimento de sistemas com foco em ${juntar(frentesGerais.map((f) => FRASE_FRENTE[f.id] ?? f.id))}.`
      : 'Desenvolvimento de sistemas, do primeiro commit à entrega.',
    stack: [...bytesPorLinguagem.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 8),
    entregas: m.demandas.length,
    sistemas: porRepo.size,
    meses: mesesPeriodo.length,
  }

  return { projetos, avaliados: candidatos.length, perfil }
}

export type Projeto = ReturnType<typeof montarPortfolio>['projetos'][number]

/** `m`: o modelo já recortado por `visibilidade` (lib/dados.ts → recortar). */
export function portfolioDe(m: Modelo, visibilidade: VisibilidadeId = 'todos') {
  return {
    geradoEm: m.base.geradoEm,
    aviso: m.base.aviso,
    progresso: m.base.progresso,
    usuario: m.base.usuario,
    vazio: m.commits.length === 0,
    temLinguagens: Object.keys(m.base.linguagens).length > 0,
    visibilidade,
    temVisibilidade: Object.keys(m.base.privados).length > 0,
    periodo: m.commits.length ? { inicio: m.commits.at(-1)!.data, fim: m.commits[0].data } : null,
    ...montarPortfolio(m),
  }
}
