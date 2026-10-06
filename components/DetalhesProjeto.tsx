'use client'

import { useRef, type ReactNode } from 'react'

/** Botão "Ver detalhes" que abre o conteúdo numa janela (dialog nativo: Esc fecha, foco fica preso dentro). */
export function DetalhesProjeto({ titulo, children, escuro = false }: { titulo: string; children: ReactNode; escuro?: boolean }) {
  const janela = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => janela.current?.showModal()}
        className={`no-print rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
          escuro ? 'bg-paper text-ink-deep hover:bg-white' : 'bg-ink-deep text-paper hover:bg-ink'
        }`}
      >
        Ver detalhes
      </button>
      <dialog
        ref={janela}
        aria-label={`Detalhes de ${titulo}`}
        // clique no fundo (fora do conteúdo) fecha
        onClick={(e) => e.target === janela.current && janela.current.close()}
        className="m-auto max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink-deep/70 backdrop:backdrop-blur-sm"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-paper/95 px-6 py-4 backdrop-blur sm:px-8">
          <p className="text-lg font-medium text-ink-deep">{titulo}</p>
          <button
            type="button"
            onClick={() => janela.current?.close()}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-subtle transition-colors hover:text-ink-deep"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
      </dialog>
    </>
  )
}
