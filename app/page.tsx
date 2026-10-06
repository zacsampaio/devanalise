import { InicioNoNavegador } from '@/components/hospedado/Paginas'
import { VisaoInicio } from '@/components/visoes/Inicio'
import { modoHospedado } from '@/lib/modo'
import { obterPainel } from '@/lib/servidor'

export default async function Inicio() {
  if (modoHospedado()) return <InicioNoNavegador />
  return <VisaoInicio painel={await obterPainel()} />
}
