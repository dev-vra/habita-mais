import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
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
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Produção', href: '/producao' },
          { rotulo: 'Novo empreendimento' },
        ]}
        titulo="Novo empreendimento"
        subtitulo="O conjunto que a prefeitura entrega. A obra e as unidades entram depois, na página dele."
      />

      <CorpoTela className="max-w-3xl">
        <FormularioEmpreendimento
          programas={programas.map((programa) => ({ id: programa.id, nome: programa.nome }))}
          convenios={convenios.map((convenio) => ({
            id: convenio.id,
            rotulo: `${convenio.protocolo} · ${convenio.objeto}`,
          }))}
        />
      </CorpoTela>
    </>
  );
}
