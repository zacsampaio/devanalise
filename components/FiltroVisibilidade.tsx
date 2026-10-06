import Link from 'next/link'
import { VISIBILIDADES, type VisibilidadeId } from '@/lib/dados'

/** Seletor Todos · Privados · Públicos; cada opção é um link que mantém o resto da URL (montado por `href`). */
export function FiltroVisibilidade({ atual, href, escuro = false }: { atual: VisibilidadeId; href: (v: VisibilidadeId) => string; escuro?: boolean }) {
  return (
    <nav
      aria-label="Repositórios"
      className={`no-print inline-flex items-center rounded-full border p-1 ${escuro ? 'border-white/15 bg-white/[0.04]' : 'border-line bg-paper'}`}
    >
      {VISIBILIDADES.map((v) => {
        const ativo = v.id === atual
        return (
          <Link
            key={v.id}
            href={href(v.id)}
            scroll={false}
            aria-current={ativo ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              ativo ? (escuro ? 'bg-paper text-ink-deep' : 'bg-ink-deep text-paper') : escuro ? 'text-paper/65 hover:text-paper' : 'text-subtle hover:text-ink-deep'
            }`}
          >
            {v.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}

/** Explica um recorte vazio: ainda sem o dado de visibilidade, ou sem repositórios daquele tipo. */
export function RecorteVazio({ visibilidade, temVisibilidade, escuro = false }: { visibilidade: VisibilidadeId; temVisibilidade: boolean; escuro?: boolean }) {
  const tipo = visibilidade === 'privados' ? 'privado' : 'público'
  return (
    <div className={`rounded-xl border px-6 py-10 text-center ${escuro ? 'border-white/10 text-paper/70' : 'border-line bg-paper text-subtle'}`}>
      {temVisibilidade ? (
        <p>Nenhum repositório {tipo} com commits seus no período.</p>
      ) : (
        <p>
          Ainda não se sabe quais repositórios são públicos ou privados: essa informação chega na próxima atualização dos dados (botão de atualizar no topo da página).
        </p>
      )}
    </div>
  )
}
