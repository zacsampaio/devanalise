'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export const PASSO = 10

/**
 * Paginação infinita: mostra `PASSO` itens e carrega mais quando a sentinela
 * (fim da lista) chega perto da tela. `chave` muda quando os filtros mudam,
 * e aí a contagem volta para a primeira página.
 */
export function useRolagemInfinita(total: number, chave: string) {
  const [estado, setEstado] = useState({ chave, limite: PASSO })
  // filtro novo → recomeça do início (ajuste de estado durante o render, sem effect)
  const limite = estado.chave === chave ? estado.limite : PASSO
  if (estado.chave !== chave) setEstado({ chave, limite: PASSO })

  const carregarMais = useCallback(() => setEstado((e) => ({ chave: e.chave, limite: e.limite + PASSO })), [])
  return { limite: Math.min(limite, total), temMais: limite < total, carregarMais }
}

/** Fim da lista: carrega a próxima página ao aparecer; o botão é a reserva (teclado, impressão, sem JS). */
export function SentinelaRolagem({ temMais, aoAparecer, restantes }: { temMais: boolean; aoAparecer: () => void; restantes: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // recria o observador a cada página carregada (`restantes` muda): ele só avisa quando a
  // visibilidade muda, então sem isso a lista empacava se o fim continuasse à vista
  useEffect(() => {
    const no = ref.current
    if (!no || !temMais) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && aoAparecer(), { rootMargin: '400px 0px' })
    obs.observe(no)
    return () => obs.disconnect()
  }, [temMais, aoAparecer, restantes])

  if (!temMais) return null
  return (
    <div ref={ref} className="no-print flex justify-center py-8">
      <button
        type="button"
        onClick={aoAparecer}
        className="flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2 text-xs text-subtle transition-colors hover:border-ink/30 hover:text-ink-deep"
      >
        <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-signal" />
        Carregando mais · faltam {restantes}
      </button>
    </div>
  )
}

/** Cabeçalho de lista simples: filtro à esquerda, contagem à direita. */
export function BarraLista({ filtro, contagem }: { filtro?: ReactNode; contagem: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {filtro ?? <span />}
      <p className="eyebrow text-subtle">{contagem}</p>
    </div>
  )
}
