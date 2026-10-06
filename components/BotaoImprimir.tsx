'use client'

/** Abre a impressão do navegador, onde dá para salvar a página em PDF. */
export function BotaoImprimir({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:border-white/40 hover:bg-white/5"
    >
      {children}
    </button>
  )
}
