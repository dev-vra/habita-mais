import { habitacao } from '@habita/shared';
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
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-texto-suave">Início › Administração › Setores</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Secretarias e setores
      </h1>
      <p className="mt-1 text-texto-suave">
        Cada município nomeia como quiser — o <strong>tipo</strong> é o que permite encaminhar "à
        Defesa Civil" sem depender do nome local. Setor externo entra pelo encaminhamento e não
        alcança fila nem ficha social.
      </p>

      <GestaoSetores setores={setores} tipos={habitacao.opcoes(habitacao.TIPO_SETOR)} />
    </div>
  );
}
