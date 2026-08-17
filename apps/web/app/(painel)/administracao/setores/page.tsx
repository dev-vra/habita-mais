import { habitacao } from '@habita/shared';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { apiFetch } from '@/lib/api/server';
import { GestaoSetores } from './gestao-setores';

interface Setor {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  secretaria: string | null;
  ativo: boolean;
}

export default async function PaginaSetores() {
  const setores = await apiFetch<Setor[]>('/setores');

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Administração' },
          { rotulo: 'Setores' },
        ]}
        titulo="Secretarias e setores"
        subtitulo="Cada município nomeia como quiser — o tipo é o que permite encaminhar “à Defesa Civil” sem depender do nome local. Setor externo entra pelo encaminhamento e não alcança fila nem ficha social."
      />

      <CorpoTela className="max-w-4xl">
        <GestaoSetores setores={setores} tipos={habitacao.opcoes(habitacao.TIPO_SETOR)} />
      </CorpoTela>
    </>
  );
}
