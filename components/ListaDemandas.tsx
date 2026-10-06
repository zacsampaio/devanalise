'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ORDEM_TIPOS, TIPOS, type Impacto, type TipoId } from '@/lib/config'
import type { Demanda } from '@/lib/dados'
import { LinhaDemanda } from './Cartoes'
import { BarraLista, SentinelaRolagem, useRolagemInfinita } from './RolagemInfinita'

const PESO_IMPACTO: Record<Impacto, number> = { alto: 3, medio: 2, baixo: 1 }

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ${
        ativo ? 'border-ink-deep bg-ink-deep text-paper' : 'border-line bg-paper text-ink hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  )
}

export type FiltrosIniciais = { tipos?: TipoId[]; sistema?: string; impacto?: Impacto; busca?: string }

/**
 * Lista de demandas com filtros e rolagem infinita de 10 em 10.
 * - `completo`: tipo, busca, sistema, impacto e ordenação (página Demandas, Sistemas)
 * - `nenhum`: sem filtros (listas resumidas, como no Início)
 */
export function ListaDemandas({
  demandas,
  sistemas = [],
  inicial = {},
  filtros = 'completo',
  semFiltroSistema = false,
}: {
  demandas: Demanda[]
  sistemas?: string[]
  inicial?: FiltrosIniciais
  filtros?: 'completo' | 'nenhum'
  semFiltroSistema?: boolean
}) {
  const [tipos, setTipos] = useState<TipoId[]>(inicial.tipos ?? [])
  const [sistema, setSistema] = useState(inicial.sistema ?? '')
  const [impacto, setImpacto] = useState<Impacto | ''>(inicial.impacto ?? '')
  const [busca, setBusca] = useState(inicial.busca ?? '')
  const [ordem, setOrdem] = useState<'recentes' | 'impacto' | 'volume'>('recentes')

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = demandas.filter(
      (d) =>
        (!tipos.length || tipos.includes(d.tipo)) &&
        (!sistema || d.sistemas.includes(sistema)) &&
        (!impacto || d.impacto === impacto) &&
        (!termo || `${d.id} ${d.titulo} ${d.resumo} ${d.sistemas.join(' ')}`.toLowerCase().includes(termo)),
    )
    if (ordem === 'impacto') return [...lista].sort((a, b) => PESO_IMPACTO[b.impacto] - PESO_IMPACTO[a.impacto] || b.fim.localeCompare(a.fim))
    if (ordem === 'volume') return [...lista].sort((a, b) => b.nCommits - a.nCommits)
    return lista
  }, [demandas, tipos, sistema, impacto, busca, ordem])

  // qualquer mudança de filtro ou ordem volta para os 10 primeiros
  const { limite, temMais, carregarMais } = useRolagemInfinita(filtradas.length, JSON.stringify([tipos, sistema, impacto, busca, ordem]))

  const limpar = () => {
    setTipos([])
    setSistema('')
    setImpacto('')
    setBusca('')
  }
  const temFiltro = tipos.length || sistema || impacto || busca
  const contagem = `${filtradas.length} de ${demandas.length} demandas`

  const campo = 'h-10 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-signal'

  return (
    <div>
      {filtros === 'completo' && (
        <>
          {/* filtros: uma linha acima da lista, presos sob o cabeçalho */}
          <div className={`no-print sticky top-16 z-30 -mx-5 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12`}>
            <div className="flex flex-wrap items-center gap-2">
              {ORDEM_TIPOS.map((t) => (
                <Chip key={t} ativo={tipos.includes(t)} onClick={() => setTipos(tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t])}>
                  <span className="h-2 w-2 rounded-full" style={{ background: TIPOS[t].cor }} />
                  {TIPOS[t].rotulo}
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por chamado, sistema ou assunto…" className={`${campo} min-w-0 flex-1 basis-64`} />
              {!semFiltroSistema && sistemas.length > 0 && (
                <select value={sistema} onChange={(e) => setSistema(e.target.value)} className={campo} aria-label="Sistema">
                  <option value="">Todos os sistemas</option>
                  {sistemas.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              <select value={impacto} onChange={(e) => setImpacto(e.target.value as Impacto | '')} className={campo} aria-label="Impacto">
                <option value="">Qualquer impacto</option>
                <option value="alto">Alto impacto</option>
                <option value="medio">Médio impacto</option>
                <option value="baixo">Baixo impacto</option>
              </select>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} className={campo} aria-label="Ordenar">
                <option value="recentes">Mais recentes</option>
                <option value="impacto">Maior impacto</option>
                <option value="volume">Mais commits</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="eyebrow text-subtle">{contagem}</p>
            {temFiltro ? (
              <button type="button" onClick={limpar} className="eyebrow text-accent hover:underline">
                Limpar filtros
              </button>
            ) : null}
          </div>
        </>
      )}

      {filtros === 'nenhum' && <BarraLista contagem={`${demandas.length} demandas`} />}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {filtradas.slice(0, limite).map((d) => (
          <li key={d.id}>
            <LinhaDemanda d={d} />
          </li>
        ))}
      </ul>

      <SentinelaRolagem temMais={temMais} aoAparecer={carregarMais} restantes={filtradas.length - limite} />
      {!filtradas.length && <p className="py-16 text-center text-subtle">Nenhuma demanda com esses filtros.</p>}
    </div>
  )
}
