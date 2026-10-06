/**
 * Vocabulário do dashboard: o que significa cada tipo de entrega, cada nível
 * de impacto e os temas que atravessam os repositórios. A cor dos tipos é a
 * paleta categórica validada (dataviz), em ordem fixa.
 */

export type TipoId = 'novo-sistema' | 'funcionalidade' | 'integracao' | 'melhoria' | 'correcao' | 'estrutura'

export const TIPOS: Record<TipoId, { rotulo: string; descricao: string; cor: string }> = {
  'novo-sistema': { rotulo: 'Novo sistema', descricao: 'Sistema, módulo ou rotina criado do zero', cor: '#2a78d6' },
  funcionalidade: { rotulo: 'Funcionalidade', descricao: 'Nova capacidade em um sistema existente', cor: '#eb6834' },
  integracao: { rotulo: 'Integração & IA', descricao: 'Conexão com APIs externas, robôs e inteligência artificial', cor: '#1baf7a' },
  melhoria: { rotulo: 'Melhoria', descricao: 'Usabilidade, desempenho e ajustes de processo', cor: '#eda100' },
  correcao: { rotulo: 'Correção', descricao: 'Erro corrigido', cor: '#e87ba4' },
  estrutura: { rotulo: 'Estrutura', descricao: 'Logs, testes, refatoração e documentação', cor: '#4a3aa7' },
}

export const ORDEM_TIPOS: TipoId[] = ['novo-sistema', 'funcionalidade', 'integracao', 'melhoria', 'correcao', 'estrutura']

export type Impacto = 'alto' | 'medio' | 'baixo'

export const IMPACTOS: Record<Impacto, string> = { alto: 'Alto impacto', medio: 'Médio impacto', baixo: 'Baixo impacto' }

/** Cor única da série de commits (quando não há divisão por tipo). */
export const COR_COMMITS = '#5b45e0'

/**
 * Frentes: temas que atravessam os repositórios. Uma demanda entra na frente
 * quando o título ou o resumo mencionam o tema. A ordem aqui é a ordem de
 * exibição — as duas primeiras ganham destaque no início.
 */
export const FRENTES = [
  {
    id: 'automacao',
    rotulo: 'Automação',
    descricao: 'Rotinas, robôs e scripts que fazem sozinhos o que antes era manual',
    padrao: /\b(rotinas?|rob[ôo]s?|rpa|bots?|cron|agendad|autom[áa]tic|automa[çc]|automat)/i,
  },
  {
    id: 'integracoes',
    rotulo: 'Integrações',
    descricao: 'APIs, webhooks e serviços externos conectados aos sistemas',
    padrao: /(\bapis?\b|integra[çc]|integrat|webhook|\bsdk\b|\bgraphql\b|\brest\b|oauth)/i,
  },
  {
    id: 'ia',
    rotulo: 'Inteligência artificial',
    descricao: 'Modelos de linguagem, visão computacional e leitura automática de documentos',
    padrao: /(\bIA\b|\bAI\b|\bLLM|openai|anthropic|claude|gpt|intelig[êe]ncia artificial|\bprompt|\bocr\b|opencv|machine learning)/i,
  },
  {
    id: 'qualidade',
    rotulo: 'Qualidade e testes',
    descricao: 'Testes automatizados, CI, lint e correções que dão segurança às mudanças',
    padrao: /(\btest|\bteste|\bci\b|pipeline|lint|cobertura|coverage|qualidade)/i,
  },
  {
    id: 'infra',
    rotulo: 'Infraestrutura e segurança',
    descricao: 'Deploy, containers, observabilidade, autenticação e auditoria',
    padrao: /(docker|kubernetes|\bk8s\b|deploy|terraform|infra|observab|monitor|\blogs?\b|auditoria|seguran[çc]a|security|autentica|\bauth)/i,
  },
] as const

export type FrenteId = (typeof FRENTES)[number]['id']
