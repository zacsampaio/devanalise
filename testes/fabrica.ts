import type { Base } from '@/lib/fonte'
import type { CommitBase } from '@/lib/github'
import type { IssueJira } from '@/lib/jira'

let sequencia = 0

/** Commit de teste: só o que importa para o caso é informado. */
export function commit(dados: Partial<CommitBase> = {}): CommitBase {
  sequencia++
  return {
    repo: 'empresa/api',
    hash: sequencia.toString(16).padStart(40, '0'),
    data: '2026-09-01T12:00:00Z',
    assunto: 'Ajusta tela',
    corpo: '',
    chamados: [],
    arquivos: 1,
    adicionadas: 10,
    removidas: 2,
    url: `https://github.com/empresa/api/commit/${sequencia}`,
    ...dados,
  }
}

export function issue(chave: string, dados: Partial<IssueJira> = {}): IssueJira {
  return {
    chave,
    titulo: `Chamado ${chave}`,
    tipo: 'Tarefa',
    prioridade: null,
    status: 'Concluído',
    categoria: 'done',
    url: `https://empresa.atlassian.net/browse/${chave}`,
    ...dados,
  }
}

/** Base como a coleta entrega: commits do mais recente para o mais antigo. */
export function base(commits: CommitBase[], jira: Base['jira'] = null, geradoEm = '2026-10-01T12:00:00Z'): Base {
  return {
    geradoEm,
    fonte: 'arquivo',
    progresso: null,
    usuario: null,
    commits: [...commits].sort((a, b) => b.data.localeCompare(a.data)),
    jira,
    linguagens: {},
    privados: {},
  }
}
