import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
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
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Administração' },
          { rotulo: 'Usuários' },
        ]}
        titulo="Usuários e capacidades"
        subtitulo="O perfil dá as ações do dia a dia. As quatro ações sensíveis — recalcular em lote, convocar fora de ordem, cortar auxílio e transferir titularidade — só existem com concessão explícita, nominal e justificada."
      />

      <CorpoTela className="max-w-5xl">
        <GestaoUsuarios usuarios={usuarios} />
      </CorpoTela>
    </>
  );
}
