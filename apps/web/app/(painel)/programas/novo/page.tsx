import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { FormularioPrograma } from './formulario-programa';

export default function PaginaNovoPrograma() {
  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Programas', href: '/programas' },
          { rotulo: 'Novo programa' },
        ]}
        titulo="Novo programa habitacional"
        subtitulo="O programa nasce em rascunho. As inscrições só abrem depois que uma versão de critério for publicada — o critério é público antes de a fila existir."
      />

      <CorpoTela className="max-w-3xl">
        <FormularioPrograma />
      </CorpoTela>
    </>
  );
}
