import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { FormularioConvenio } from './formulario-convenio';

/**
 * Novo convênio.
 *
 * A vigência é o campo que mais dói depois: convênio vencido com obra em andamento trava a
 * prestação de contas, e o aviso só serve se a data estiver no sistema desde o começo.
 */
export default function PaginaNovoConvenio() {
  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Produção', href: '/producao' },
          { rotulo: 'Novo convênio' },
        ]}
        titulo="Registrar convênio"
        subtitulo="De onde vem o recurso do empreendimento — repasse, contrapartida e prazo."
      />

      <CorpoTela className="max-w-3xl">
        <FormularioConvenio />
      </CorpoTela>
    </>
  );
}
