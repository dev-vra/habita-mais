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
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-texto-suave">Início › Administração › Parâmetros</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Parâmetros do município
      </h1>

      <FormularioParametros
        salarioMinimo={parametros.salarioMinimo ?? null}
        signatarios={signatarios}
      />
    </div>
  );
}
