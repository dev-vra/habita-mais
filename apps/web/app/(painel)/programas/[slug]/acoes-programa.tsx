'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { criarRascunho, definirSituacao } from '@/app/actions/programas';
import { Aviso } from '@/components/ui/formulario';

/**
 * Ações do programa. Abrir inscrições é o ponto sensível: a API recusa enquanto não houver
 * critério publicado, e o erro volta para a tela com a razão em vez de sumir.
 */
export function AcoesPrograma({
  programaId,
  slug,
  situacao,
  temRascunho,
  versaoPublicadaId,
  salarioMinimo,
}: {
  programaId: string;
  slug: string;
  situacao: string;
  temRascunho: boolean;
  versaoPublicadaId?: string;
  salarioMinimo: number | null;
}) {
  const [erro, setErro] = useState<string | undefined>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const mudarSituacao = (nova: string) =>
    iniciar(async () => {
      const resultado = await definirSituacao(programaId, slug, nova);
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  const novoRascunho = () =>
    iniciar(async () => {
      const resultado = await criarRascunho(programaId, slug, {
        copiarDaVersaoId: versaoPublicadaId,
        salarioMinimo: versaoPublicadaId ? undefined : (salarioMinimo ?? undefined),
      });
      setErro(resultado.erro);
      if (resultado.versaoId) router.push(`/programas/${slug}/criterios/${resultado.versaoId}`);
    });

  const semSalarioMinimo = !versaoPublicadaId && salarioMinimo === null;

  return (
    <div className="mt-6">
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <div className="mt-3 flex flex-wrap gap-3">
        {situacao !== 'INSCRICOES_ABERTAS' && (
          <BotaoAcao onClick={() => mudarSituacao('INSCRICOES_ABERTAS')} pendente={pendente}>
            Abrir inscrições
          </BotaoAcao>
        )}
        {situacao === 'INSCRICOES_ABERTAS' && (
          <BotaoAcao onClick={() => mudarSituacao('INSCRICOES_ENCERRADAS')} pendente={pendente}>
            Encerrar inscrições
          </BotaoAcao>
        )}
        {!temRascunho && (
          <BotaoAcao onClick={novoRascunho} pendente={pendente || semSalarioMinimo}>
            {versaoPublicadaId ? 'Nova versão a partir da vigente' : 'Criar critérios do modelo'}
          </BotaoAcao>
        )}
      </div>

      {semSalarioMinimo && !temRascunho && (
        <p className="mt-2 text-sm text-warning-text">
          Defina o salário mínimo de referência nos parâmetros do município — as faixas de renda do
          modelo dependem dele.
        </p>
      )}
    </div>
  );
}

function BotaoAcao({
  children,
  onClick,
  pendente,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pendente: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendente}
      className="rounded-md border border-borda bg-surface px-4 py-2 font-semibold text-institucional transition hover:bg-background disabled:opacity-60"
    >
      {children}
    </button>
  );
}
