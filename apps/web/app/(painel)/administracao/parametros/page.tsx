import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { apiFetch } from '@/lib/api/server';
import { FormularioParametros } from './formulario-parametros';

interface Signatario {
  id: string;
  nome: string;
  papel: string;
  cargo: string;
  ativo: boolean;
}

export default async function PaginaParametros() {
  const [parametros, signatarios] = await Promise.all([
    apiFetch<{ salarioMinimo?: number }>('/administracao/parametros'),
    apiFetch<Signatario[]>('/administracao/signatarios'),
  ]);

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Administração' },
          { rotulo: 'Parâmetros' },
        ]}
        titulo="Parâmetros do município"
        subtitulo="O que muda de prefeitura para prefeitura e não pode virar constante no código."
      />

      <CorpoTela className="max-w-3xl">
        <FormularioParametros
          salarioMinimo={parametros.salarioMinimo ?? null}
          signatarios={signatarios}
        />
      </CorpoTela>
    </>
  );
}
