import { apiFetch } from '@/lib/api/server';
import { GestaoUsuarios } from './gestao-usuarios';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string | null;
  status: string;
  ultimoAcessoEm: string | null;
  capacidadesConcedidas: string[];
  capacidadesRevogadas: string[];
}

export default async function PaginaUsuarios() {
  const usuarios = await apiFetch<Usuario[]>('/administracao/usuarios');

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">Início › Administração › Usuários</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Usuários e capacidades
      </h1>
      <p className="mt-1 text-texto-suave">
        O perfil dá as ações do dia a dia. As quatro ações sensíveis — recalcular em lote, convocar
        fora de ordem, cortar auxílio e transferir titularidade — só existem com concessão
        explícita, nominal e justificada.
      </p>

      <GestaoUsuarios usuarios={usuarios} />
    </div>
  );
}
