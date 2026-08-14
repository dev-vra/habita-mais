import Link from 'next/link';
import { FormularioConvenio } from './formulario-convenio';

/**
 * Novo convênio.
 *
 * A vigência é o campo que mais dói depois: convênio vencido com obra em andamento trava a
 * prestação de contas, e o aviso só serve se a data estiver no sistema desde o começo.
 */
export default function PaginaNovoConvenio() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-texto-suave">
        <Link href="/producao" className="hover:underline">
          Produção
        </Link>{' '}
        › Novo convênio
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Registrar convênio
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        De onde vem o recurso do empreendimento — repasse, contrapartida e prazo.
      </p>

      <FormularioConvenio />
    </div>
  );
}
