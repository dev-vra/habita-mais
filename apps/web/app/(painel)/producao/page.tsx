import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { BarraProgresso } from '@/components/domain/barra-progresso';
import { apiFetch } from '@/lib/api/server';
import { moeda } from '@/lib/formato';

interface EmpreendimentoLista {
  id: string;
  protocolo: string;
  nome: string;
  slug: string;
  bairro: string;
  situacao: string;
  unidadesPrevistas: number;
  unidadesCadastradas: number;
  unidadesEntregues: number;
  previsaoEntrega: string | null;
  programa: { id: string; nome: string; slug: string } | null;
  convenio: { id: string; protocolo: string; objeto: string } | null;
  percentualObras: number;
  obrasParalisadas: number;
}

interface ConvenioLista {
  id: string;
  protocolo: string;
  numeroExterno: string | null;
  objeto: string;
  origem: string;
  orgaoRepassador: string;
  valorRepasse: number;
  valorContrapartida: number;
  vigenciaFim: string;
  situacao: string;
  empreendimentos: number;
  vigenciaVencida: boolean;
}

/**
 * Produção habitacional.
 *
 * A ordem da página é a da pergunta que o gestor faz: *o que está sendo construído e em que pé
 * está?* O convênio vem depois porque é meio, não fim — mas vem, porque é dele que sai o prazo que
 * ninguém pode perder.
 */
export default async function PaginaProducao() {
  const [empreendimentos, convenios] = await Promise.all([
    apiFetch<EmpreendimentoLista[]>('/producao/empreendimentos'),
    apiFetch<ConvenioLista[]>('/producao/convenios'),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-texto-suave">Início › Produção</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
            Produção habitacional
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            Convênio, obra, medição e unidade — do repasse à entrega da chave.
          </p>
        </div>
        <Link
          href="/producao/novo"
          className="rounded-md bg-primary px-4 py-2.5 font-semibold text-surface transition hover:bg-primary/90"
        >
          Novo empreendimento
        </Link>
      </div>

      {empreendimentos.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-borda bg-surface p-8 text-center text-sm text-texto-suave">
          Nenhum empreendimento cadastrado. Comece pelo convênio que financia a obra — ou cadastre o
          conjunto direto, se o recurso for próprio.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {empreendimentos.map((empreendimento) => (
            <li
              key={empreendimento.id}
              className="rounded-lg border border-borda bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/producao/${empreendimento.slug}`}
                    className="font-display text-lg font-bold text-institucional hover:underline"
                  >
                    {empreendimento.nome}
                  </Link>
                  <p className="tabular text-xs text-texto-suave">
                    {empreendimento.protocolo} · {empreendimento.bairro}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-texto-suave">
                  {habitacao.rotuloSituacaoEmpreendimento(empreendimento.situacao)}
                </span>
              </div>

              <div className="mt-4">
                <BarraProgresso
                  rotulo="Execução das obras"
                  percentual={empreendimento.percentualObras}
                />
              </div>

              <dl className="tabular mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-texto-suave">Previstas</dt>
                  <dd className="font-semibold">{empreendimento.unidadesPrevistas}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-suave">Cadastradas</dt>
                  <dd className="font-semibold">{empreendimento.unidadesCadastradas}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-suave">Entregues</dt>
                  <dd className="font-semibold text-success">{empreendimento.unidadesEntregues}</dd>
                </div>
              </dl>

              {empreendimento.obrasParalisadas > 0 && (
                <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                  {empreendimento.obrasParalisadas} obra(s) paralisada(s)
                </p>
              )}

              {empreendimento.programa && (
                <p className="mt-3 text-xs text-texto-suave">
                  Fila:{' '}
                  <Link
                    href={`/fila/${empreendimento.programa.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {empreendimento.programa.nome}
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-institucional">Convênios e recursos</h2>
          <Link
            href="/producao/convenios/novo"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Registrar convênio
          </Link>
        </div>

        {convenios.length === 0 ? (
          <p className="mt-3 text-sm text-texto-suave">Nenhum convênio registrado.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-borda bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
                <tr>
                  <th className="px-4 py-3 font-semibold">Convênio</th>
                  <th className="px-4 py-3 font-semibold">Origem</th>
                  <th className="px-4 py-3 text-right font-semibold">Repasse</th>
                  <th className="px-4 py-3 font-semibold">Vigência</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {convenios.map((convenio) => (
                  <tr key={convenio.id} className="border-b border-borda last:border-0">
                    <td className="px-4 py-3">
                      <p className="tabular text-xs font-semibold text-institucional">
                        {convenio.protocolo}
                        {convenio.numeroExterno && ` · ${convenio.numeroExterno}`}
                      </p>
                      <p className="text-texto-suave">{convenio.objeto}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{habitacao.rotuloOrigemRecurso(convenio.origem)}</p>
                      <p className="text-xs text-texto-suave">{convenio.orgaoRepassador}</p>
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      {moeda(convenio.valorRepasse)}
                      {convenio.valorContrapartida > 0 && (
                        <span className="block text-xs font-normal text-texto-suave">
                          + {moeda(convenio.valorContrapartida)} de contrapartida
                        </span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3">
                      {new Date(convenio.vigenciaFim).toLocaleDateString('pt-BR')}
                      {convenio.vigenciaVencida && (
                        <span className="block text-xs font-semibold text-danger">Vencida</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {habitacao.rotuloSituacaoConvenio(convenio.situacao)}
                      <span className="block text-xs text-texto-suave">
                        {convenio.empreendimentos} empreendimento(s)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
