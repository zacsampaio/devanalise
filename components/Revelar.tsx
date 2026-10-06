'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/** Scroll reveal com IntersectionObserver — mesmo comportamento do site. */
export function Revelar({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
}: {
  as?: ElementType
  delay?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    // avisa a rede de segurança do layout que o React carregou
    document.documentElement.setAttribute('data-hidratado', '')
    const no = ref.current
    if (!no) return
    // com movimento reduzido o CSS já mostra o conteúdo sem transição
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.observe(no)
    return () => observer.disconnect()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Componente = Tag as any
  return (
    <Componente ref={ref} data-visible={visivel} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${className}`}>
      {children}
    </Componente>
  )
}
