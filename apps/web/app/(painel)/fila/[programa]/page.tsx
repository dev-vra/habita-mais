import Link from 'next/link';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { apiFetch } from '@/lib/api/server';
import {
  formatarDataHora,
  formatarNota,
  formatarReais,
  situacaoPrograma,
  statusInscricao,
} from '@/lib/status';

interface LinhaDaFila {
  posicao: number;
  inscricaoId: string;
  protocolo: string;
  responsavel: string;
  composicao: { pessoas: number; menores: number };
  rendaPerCapita: number;
  pontuacao: number;
  situacao: string;
  calculadaEm: string | null;
  versaoCriterio: number | null;
}

interface FilaDoPrograma {
  programa: { id: string; nome: string; slug: string; vagas: number; situacao: string };
  versaoVigente: number | null;
  convocacoesForaDeOrdem: number;
  linhas: LinhaDaFila[];
}

/**
 * A tela-âncora do produto. Tudo aqui precisa ser defensável em auditoria: posição, pontuação,
 * quando foi calculada e sob qual versão do critério.
 *
 * A faixa de contexto no topo é a tela inteira em uma frase — sem ela, a mesma tabela vira
 * exatamente a planilha que o produto veio substituir: bonita, mas indefensável.
 */
export default async function PaginaFila({ params }: { params: Promise<{ programa: string }> }) {
  const { programa: slug } = await params;
  const fila = await apiFetch<FilaDoPrograma>(`/programas/${slug}/fila`);
  const ultimoCalculo = fila.linhas.find((linha) => linha.calculadaEm);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Fila › {fila.programa.nome}</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        {fila.programa.nome}
      </h1>
      <p className="mt-1 text-texto-suave">
        {fila.programa.vagas} unidades · {situacaoPrograma(fila.programa.situacao)}
        {fila.versaoVigente !== null && ` · critério v${fila.versaoVigente} vigente`}
      </p>

      {ultimoCalculo?.calculadaEm && (
        <div className="mt-6 rounded-md border border-vinculo-reurb/30 bg-vinculo-reurb/5 px-4 py-3 text-sm text-vinculo-reurb">
          Pontuação calculada em {formatarDataHora(ultimoCalculo.calculadaEm)}, sob o critério v
          {ultimoCalculo.versaoCriterio}. Recálculo não reordena quem já foi convocada — a nota que
          fundamentou a chamada continua valendo.
        </div>
      )}

      {fila.convocacoesForaDeOrdem > 0 && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-text">
          {fila.convocacoesForaDeOrdem}{' '}
          {fila.convocacoesForaDeOrdem === 1
            ? 'convocação fora de ordem foi emitida'
            : 'convocações fora de ordem foram emitidas'}{' '}
          neste programa. Cada uma tem motivo registrado e é publicada junto ao ranking.
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-borda bg-surface">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-borda bg-background text-xs uppercase tracking-wide text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Posição
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Família
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Composição
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Renda per capita
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Pontuação
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Situação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {fila.linhas.map((linha) => {
              const status = statusInscricao(linha.situacao);
              return (
                <tr key={linha.inscricaoId} className="hover:bg-background/60">
                  <td className="tabular px-4 py-3 font-semibold text-texto-suave">
                    {String(linha.posicao).padStart(3, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/inscricoes/${linha.inscricaoId}`}
                      className="font-semibold text-texto hover:underline"
                    >
                      {linha.responsavel}
                    </Link>
                    <span className="tabular block text-xs text-texto-suave">{linha.protocolo}</span>
                  </td>
                  <td className="px-4 py-3 text-texto-suave">
                    {linha.composicao.pessoas} {linha.composicao.pessoas === 1 ? 'pessoa' : 'pessoas'}
                    {linha.composicao.menores > 0 &&
                      ` · ${linha.composicao.menores} ${
                        linha.composicao.menores === 1 ? 'menor' : 'menores'
                      }`}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-texto-suave">
                    {formatarReais(linha.rendaPerCapita)}
                  </td>
                  <td className="tabular px-4 py-3 text-right font-bold text-institucional">
                    {formatarNota(linha.pontuacao)}
                  </td>
                  <td className="px-4 py-3">
                    <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-texto-suave">
        Mostrando {fila.linhas.length}{' '}
        {fila.linhas.length === 1 ? 'família classificada' : 'famílias classificadas'}. Inscrição
        com pendência ou indeferida não ocupa posição.
      </p>
    </div>
  );
}
