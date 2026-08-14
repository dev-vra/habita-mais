import Link from 'next/link';
import { FormularioEmpreendimento } from './formulario-empreendimento';
import { apiFetch } from '@/lib/api/server';

interface ProgramaOpcao {
  id: string;
  nome: string;
}

interface ConvenioOpcao {
  id: string;
  protocolo: string;
  objeto: string;
}

/**
 * Novo empreendimento.
 *
 * Convênio e programa entram como vínculo opcional: nem toda obra vem de repasse, e nem todo
 * conjunto está amarrado a uma fila já aberta. Amarrar depois é possível; travar o cadastro na
 * frente do servidor, não.
 */
export default async function PaginaNovoEmpreendimento() {
  const [programas, convenios] = await Promise.all([
    apiFetch<ProgramaOpcao[]>('/programas'),
    apiFetch<ConvenioOpcao[]>('/producao/convenios'),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-texto-suave">
        <Link href="/producao" className="hover:underline">
          Produção
        </Link>{' '}
        › Novo empreendimento
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Novo empreendimento
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        O conjunto que a prefeitura entrega. A obra e as unidades entram depois, na página dele.
      </p>

      <FormularioEmpreendimento
        programas={programas.map((programa) => ({ id: programa.id, nome: programa.nome }))}
        convenios={convenios.map((convenio) => ({
          id: convenio.id,
          rotulo: `${convenio.protocolo} · ${convenio.objeto}`,
        }))}
      />
    </div>
  );
}
