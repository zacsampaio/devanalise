'use client'

import { useEffect, useRef, useState } from 'react'

const suavizar = (t: number) => 1 - Math.pow(1 - t, 3)

/** Conta de 0 até `ate` quando entra na viewport. */
export function ContadorAnimado({ ate, atraso = 0, duracao = 1600, className }: { ate: number; atraso?: number; duracao?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [valor, setValor] = useState(0)
  const [iniciado, setIniciado] = useState(false)

  useEffect(() => {
    const no = ref.current
    if (!no) return
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIniciado(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(no)
    return () => observer.disconnect()
  }, [ate])

  useEffect(() => {
    if (!iniciado) return
    let quadro = 0
    let inicio = 0
    const total = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : duracao
    const passo = (agora: number) => {
      if (!inicio) inicio = agora
      const p = Math.min(1, (agora - inicio) / total)
      setValor(Math.round(suavizar(p) * ate))
      if (p < 1) quadro = requestAnimationFrame(passo)
    }
    const espera = setTimeout(() => (quadro = requestAnimationFrame(passo)), atraso)
    return () => {
      clearTimeout(espera)
      cancelAnimationFrame(quadro)
    }
  }, [iniciado, ate, duracao, atraso])

  return (
    <span ref={ref} aria-label={String(ate)} className={`tabular-nums ${className ?? ''}`}>
      <span className="contador-animado print:hidden">{valor.toLocaleString('pt-BR')}</span>
      {/* na impressão/PDF, ou se o React não carregar, o número aparece completo */}
      <span className="contador-final hidden print:inline">{ate.toLocaleString('pt-BR')}</span>
    </span>
  )
}
