import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { coletar, coletaVazia, VERSAO_COLETA, type Base, type Coletado, type Fontes, type Progresso } from './coleta'
import { DESDE, githubConfigurado, listarRepos, obterUsuario, paginaHistorico, repoPermitido, tokenLocal, type CommitBase } from './github'
import { buscarIssues, jiraConfigurado } from './jira'

export type { Base, Progresso } from './coleta'

/**
 * Coleta do modo local (GITHUB_TOKEN no .env), fora do caminho das requisições.
 *
 * - As páginas nunca esperam o GitHub: leem o que já está em memória/disco.
 * - Quando os dados passam de PAINEL_INTERVALO, uma atualização começa em
 *   segundo plano (algoritmo em lib/coleta.ts: só relê o que mudou).
 * - A primeira carga (que pode ser grande) salva o progresso a cada poucos
 *   repositórios: o painel vai se preenchendo, e um reinício continua de onde parou.
 */

/** De quanto em quanto tempo (segundos) o painel procura commits novos. */
export const INTERVALO_ATUALIZACAO = Number(process.env.PAINEL_INTERVALO || 300)

/**
 * Cópia persistente da coleta. Contém dados privados: data/ fica fora do git.
 */
const ARQUIVO = join(process.cwd(), 'data', 'ultima-coleta.json')

type Armazenado = Coletado

type Estado = {
  dados: Armazenado | null
  carga: Promise<void> | null
  atualizacao: Promise<void> | null
  progresso: Progresso | null
  erro?: string
  avisoJira?: string
  ultimaTentativa: number
  /** versão dos dados em memória: muda a cada lote salvo (o modelo é remontado) */
  revisao: number
}

// em globalThis: o recarregamento de módulos do `next dev` não pode iniciar uma segunda coleta
const g = globalThis as typeof globalThis & { __painelColeta?: Estado }
const estado: Estado = (g.__painelColeta ??= { dados: null, carga: null, atualizacao: null, progresso: null, ultimaTentativa: 0, revisao: 0 })

const vazio = (): Armazenado => coletaVazia(DESDE)

async function carregarDoDisco() {
  estado.carga ??= readFile(ARQUIVO, 'utf8')
    .then((texto) => {
      const lido = JSON.parse(texto) as Armazenado
      estado.dados = lido.versao === VERSAO_COLETA ? lido : vazio()
    })
    .catch(() => {
      estado.dados ??= vazio()
    })
  await estado.carga
}

// gravações em fila: uma por vez, arquivo temporário + rename para nunca deixar JSON pela metade
let gravacao: Promise<void> = Promise.resolve()
function salvar() {
  const texto = JSON.stringify(estado.dados)
  gravacao = gravacao
    .then(async () => {
      await mkdir(dirname(ARQUIVO), { recursive: true })
      await writeFile(`${ARQUIVO}.tmp`, texto)
      await rename(`${ARQUIVO}.tmp`, ARQUIVO)
    })
    .catch((erro) => console.warn('[painel] não foi possível salvar a coleta:', erro instanceof Error ? erro.message : erro))
  return gravacao
}

/** Começa uma atualização em segundo plano, se não houver outra rodando. */
export function dispararAtualizacao() {
  if (estado.atualizacao || !githubConfigurado()) return
  estado.ultimaTentativa = Date.now()
  estado.atualizacao = atualizar()
    .then(() => {
      estado.erro = undefined
    })
    .catch((erro) => {
      estado.erro = erro instanceof Error ? erro.message : 'erro desconhecido'
      console.error('[painel] atualização falhou:', estado.erro)
    })
    .finally(() => {
      estado.atualizacao = null
      estado.progresso = null
    })
}

async function atualizar() {
  await carregarDoDisco()
  const token = tokenLocal()!
  const fontes: Fontes = {
    usuario: () => obterUsuario(token),
    repos: () => listarRepos(token),
    pagina: (repo, branch, desde, autor, depois) => paginaHistorico(token, { dono: repo.dono, nome: repo.nome, branch, desde, autor, depois }),
    issues: jiraConfigurado() ? (chaves) => buscarIssues(chaves) : null,
  }
  let desdeUltimoSalvo = 0
  await coletar(estado.dados!, fontes, DESDE, {
    progresso: (p) => {
      estado.progresso = p
    },
    repoLido: async (novos) => {
      if (novos) estado.revisao++
      if (++desdeUltimoSalvo >= 5) {
        desdeUltimoSalvo = 0
        await salvar()
      }
    },
    avisoJira: (aviso) => {
      estado.avisoJira = aviso
    },
  })
  estado.revisao++
  await salvar()
}

let filtrados: { revisao: string; commits: CommitBase[] } | null = null

/** Revisão dos dados em memória — chave de memoização do modelo. */
export const revisaoDados = () => `${estado.revisao}:${estado.dados?.atualizadoEm ?? ''}:${estado.dados?.commits.length ?? 0}`

/**
 * Dados para as páginas, sempre na hora: o que já foi coletado. Se estiverem
 * velhos, dispara a atualização em segundo plano (sem esperar por ela).
 */
export async function obterBase(): Promise<Base> {
  await carregarDoDisco()
  const dados = estado.dados!
  const soArquivo = process.env.PAINEL_FONTE === 'arquivo'

  if (!soArquivo && githubConfigurado()) {
    const idade = dados.atualizadoEm ? Date.now() - +new Date(dados.atualizadoEm) : Infinity
    // depois de uma falha, espera um intervalo inteiro antes de tentar de novo
    const desdeTentativa = Date.now() - estado.ultimaTentativa
    if (idade > INTERVALO_ATUALIZACAO * 1000 && desdeTentativa > (estado.erro ? INTERVALO_ATUALIZACAO * 1000 : 0)) dispararAtualizacao()
  }

  // filtros e período valem na leitura: mudar o .env não exige recoletar (refiltra só quando os dados mudam)
  const revisao = revisaoDados()
  if (filtrados?.revisao !== revisao) filtrados = { revisao, commits: dados.commits.filter((c) => c.data >= DESDE && repoPermitido(c.repo)) }
  const commits = filtrados.commits
  const aviso = !githubConfigurado() && !soArquivo ? 'GITHUB_TOKEN não configurado no .env' : (estado.erro ?? estado.avisoJira)
  const fonte: Base['fonte'] = !commits.length
    ? estado.atualizacao
      ? 'coletando'
      : 'vazio'
    : soArquivo || estado.erro || !githubConfigurado()
      ? 'arquivo'
      : 'github'

  return {
    geradoEm: dados.atualizadoEm ?? new Date().toISOString(),
    fonte,
    aviso,
    progresso: estado.atualizacao ? estado.progresso : null,
    usuario: dados.usuario,
    commits,
    jira: dados.jira,
    linguagens: dados.linguagens ?? {},
    privados: dados.privados ?? {},
  }
}

/** "Atualizar agora": ignora o intervalo. Devolve false se já havia uma atualização rodando. */
export async function forcarAtualizacao() {
  await carregarDoDisco()
  const jaRodando = Boolean(estado.atualizacao)
  estado.erro = undefined
  dispararAtualizacao()
  return !jaRodando
}
