import { MESES, type DiaGrade } from '@/lib/dados'

/** Rampa sequencial violeta para fundo escuro: vazio → mais commits. */
const NIVEIS = ['rgba(255,255,255,0.05)', '#382c80', '#5442b8', '#7b66e8', '#b3a7ff']
/** No celular cabem as últimas semanas; o ano inteiro aparece a partir do md. */
const SEMANAS_CELULAR = 22

const nivel = (n: number, max: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
const rotuloDia = (d: DiaGrade) =>
  `${d.commits} commit${d.commits === 1 ? '' : 's'} em ${new Date(`${d.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`

/** Commits por dia, uma coluna por semana (segunda a domingo), como o gráfico de contribuições do GitHub. */
export function GradeCommits({ semanas, max, diasAtivos, total }: { semanas: (DiaGrade | null)[][]; max: number; diasAtivos: number; total: number }) {
  const primeiraNoCelular = semanas.length - SEMANAS_CELULAR
  return (
    <figure>
      <div className="flex gap-[3px]" role="img" aria-label={`Commits por dia nas últimas ${semanas.length} semanas: ${total} commits em ${diasAtivos} dias com atividade.`}>
        {semanas.map((semana, i) => {
          const primeiro = semana[0]
          // rótulo do mês na primeira semana que começa nele
          const mes = primeiro && Number(primeiro.data.slice(8, 10)) <= 7 ? MESES[Number(primeiro.data.slice(5, 7)) - 1] : null
          return (
            <div key={i} className={`min-w-0 flex-1 flex-col gap-[3px] ${i < primeiraNoCelular ? 'hidden md:flex' : 'flex'}`}>
              <span aria-hidden className="h-4 overflow-visible whitespace-nowrap font-mono text-[10px] leading-none text-paper/45">
                {mes}
              </span>
              {semana.map((d, j) =>
                d ? (
                  <span key={j} title={rotuloDia(d)} className="aspect-square rounded-[2px]" style={{ background: NIVEIS[nivel(d.commits, max)] }} />
                ) : (
                  <span key={j} aria-hidden className="aspect-square" />
                ),
              )}
            </div>
          )
        })}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-paper/55">
        <span>
          {total.toLocaleString('pt-BR')} commits em {diasAtivos} dias com atividade
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          menos
          {NIVEIS.map((cor) => (
            <span key={cor} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
          ))}
          mais
        </span>
      </figcaption>
    </figure>
  )
}
