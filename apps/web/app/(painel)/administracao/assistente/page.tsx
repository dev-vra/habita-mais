import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { apiFetch } from '@/lib/api/server';

interface EstadoAssistente {
  disponivel: boolean;
  usos: { uso: string; rotulo: string; produz: string; revisadoPor: string }[];
  proibidos: string[];
  aviso: { titulo: string; texto: string };
}

/**
 * O que a IA faz aqui — e, principalmente, o que ela não faz.
 *
 * A página existe para ser mostrada: quando o controle interno ou a Câmara perguntar se o sistema
 * "decide por algoritmo", a resposta é esta tela, com a lista de proibições escrita no código e o
 * nome de quem revisa cada rascunho.
 */
export default async function PaginaAssistente() {
  const estado = await apiFetch<EstadoAssistente>('/assistente/estado');

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Administração' },
          { rotulo: 'Assistente de IA' },
        ]}
        titulo="Assistente de IA"
        subtitulo="A regra é uma só: a IA propõe, a pessoa assina, e o sistema registra quem assinou. Toda sugestão fica guardada com o que foi enviado, o que voltou e o que o servidor fez com o texto."
      />

      <CorpoTela className="max-w-4xl">
      <div
        className={`mt-6 rounded-lg border p-4 ${
          estado.disponivel ? 'border-success/40 bg-success/5' : 'border-borda bg-background'
        }`}
      >
        <p className="text-sm font-bold text-texto">
          {estado.disponivel ? 'Assistente ativo nesta prefeitura' : 'Assistente não configurado'}
        </p>
        <p className="mt-1 text-sm text-texto-suave">
          {estado.disponivel
            ? 'Os rascunhos estão disponíveis nas telas indicadas abaixo.'
            : 'Sem chave de API configurada. Nada deixa de funcionar — só o atalho do rascunho não aparece, e os textos são escritos normalmente.'}
        </p>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Onde a IA entra</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Só onde o custo do erro é baixo e a revisão é natural. A lista é fechada no código —
          ligar um uso novo é mudança revisada, não um campo de configuração.
        </p>

        <ul className="mt-4 space-y-2">
          {estado.usos.map((uso) => (
            <li key={uso.uso} className="rounded-lg border border-borda bg-surface p-4">
              <p className="text-sm font-semibold text-texto">{uso.rotulo}</p>
              <p className="mt-1 text-sm text-texto-suave">{uso.produz}</p>
              <p className="mt-1 text-xs text-texto-suave">
                <strong>Quem revisa:</strong> {uso.revisadoPor}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Onde a IA nunca entra</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Um número que muda a vida de uma família não sai de um modelo que ninguém consegue
          reproduzir dois anos depois, na auditoria. Estas continuam determinísticas e auditáveis:
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {estado.proibidos.map((proibido) => (
            <li
              key={proibido}
              className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-texto"
            >
              {proibido}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-lg border border-borda bg-surface p-5">
        <h2 className="text-sm font-bold text-texto">O que sai do produto</h2>
        <p className="mt-2 text-sm text-texto-suave">
          Antes de qualquer envio, o texto passa por máscara: CPF, CNPJ, NIS, CEP, telefone e
          e-mail são substituídos, e o nome da família vira iniciais. O modelo recebe a situação —
          composição, renda, condição da moradia — sem receber a identidade de quem vive nela.
        </p>
        <p className="mt-2 text-sm text-texto-suave">
          A conferência da ficha (renda per capita, composição, benefício × faixa de renda) não usa
          IA: é comparação de números, feita no próprio sistema, com o mesmo resultado sempre.
        </p>
      </section>
      </CorpoTela>
    </>
  );
}
