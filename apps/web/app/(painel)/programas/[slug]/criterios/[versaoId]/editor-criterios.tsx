'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { publicarCriterios, salvarCriterios, type Criterio } from '@/app/actions/programas';
import { Aviso } from '@/components/ui/formulario';

const FATOS = [
  { valor: 'rendaPerCapita', rotulo: 'Renda per capita', numerico: true },
  { valor: 'mesesResidenciaMunicipio', rotulo: 'Meses de residência', numerico: true },
  { valor: 'mesesInscricao', rotulo: 'Meses de inscrição', numerico: true },
  { valor: 'quantidadeMenores', rotulo: 'Menores no domicílio', numerico: true },
  { valor: 'mulherChefeFamilia', rotulo: 'Mulher chefe de família', numerico: false },
  { valor: 'temPessoaComDeficiencia', rotulo: 'PCD no domicílio', numerico: false },
  { valor: 'temIdoso', rotulo: 'Idoso no domicílio', numerico: false },
  { valor: 'moradiaInadequada', rotulo: 'Moradia inadequada', numerico: false },
  { valor: 'situacaoRisco', rotulo: 'Situação de risco', numerico: false },
];

const CRITERIO_NOVO: Criterio = {
  codigo: 'NOVO_CRITERIO',
  rotulo: 'Novo critério',
  tipo: 'FLAG',
  peso: 5,
  fonte: 'mulherChefeFamilia',
};

/**
 * Editor da versão em rascunho.
 *
 * Salvar devolve avisos em vez de bloquear — o gestor monta a regra aos poucos. O portão é a
 * publicação, que recusa versão inconsistente. O total de pontos aparece o tempo todo porque é a
 * primeira coisa que o regulamento precisa declarar.
 */
export function EditorCriterios({
  versaoId,
  slug,
  criteriosIniciais,
}: {
  versaoId: string;
  slug: string;
  criteriosIniciais: Criterio[];
}) {
  const [criterios, setCriterios] = useState<Criterio[]>(criteriosIniciais);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | undefined>();
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const total = criterios.reduce((soma, criterio) => soma + Number(criterio.peso || 0), 0);

  const alterar = (indice: number, mudanca: Partial<Criterio>) => {
    setSalvo(false);
    setCriterios((atual) =>
      atual.map((criterio, i) => (i === indice ? { ...criterio, ...mudanca } : criterio)),
    );
  };

  const salvar = () =>
    iniciar(async () => {
      const resultado = await salvarCriterios(versaoId, criterios);
      setErro(resultado.erro);
      setAvisos(resultado.avisos ?? []);
      setSalvo(!resultado.erro);
    });

  const publicar = () =>
    iniciar(async () => {
      const salvamento = await salvarCriterios(versaoId, criterios);
      if (salvamento.erro) {
        setErro(salvamento.erro);
        return;
      }

      const resultado = await publicarCriterios(versaoId, slug);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      router.push(`/programas/${slug}`);
    });

  return (
    <div className="mt-8">
      {erro && <Aviso tom="danger">{erro}</Aviso>}
      {avisos.length > 0 && (
        <Aviso tom="warning">
          <p className="font-semibold">Pendências antes de publicar:</p>
          <ul className="mt-1 list-disc pl-5">
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Aviso>
      )}
      {salvo && avisos.length === 0 && <Aviso tom="info">Rascunho salvo e consistente.</Aviso>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda bg-surface px-5 py-3">
        <p className="text-sm text-texto-suave">
          Total da versão:{' '}
          <span className="tabular font-bold text-institucional">{total} pontos</span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCriterios((atual) => [...atual, { ...CRITERIO_NOVO }])}
            className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background"
          >
            Adicionar critério
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente}
            className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background disabled:opacity-60"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={publicar}
            disabled={pendente}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
          >
            Publicar versão
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {criterios.map((criterio, indice) => (
          <li key={indice} className="rounded-lg border border-borda bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Campo rotulo="Rótulo">
                <input
                  value={criterio.rotulo}
                  onChange={(e) => alterar(indice, { rotulo: e.target.value })}
                  className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                />
              </Campo>
              <Campo rotulo="Código">
                <input
                  value={criterio.codigo}
                  onChange={(e) => alterar(indice, { codigo: e.target.value.toUpperCase() })}
                  className="tabular w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                />
              </Campo>
              <Campo rotulo="Peso">
                <input
                  type="number"
                  min={0}
                  value={criterio.peso}
                  onChange={(e) => alterar(indice, { peso: Number(e.target.value) })}
                  className="tabular w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                />
              </Campo>
              <button
                type="button"
                onClick={() => setCriterios((atual) => atual.filter((_, i) => i !== indice))}
                className="self-end rounded-md border border-borda px-2.5 py-1.5 text-sm text-danger hover:bg-danger/5"
              >
                Remover
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Campo rotulo="Tipo">
                <select
                  value={criterio.tipo}
                  onChange={(e) => alterar(indice, { tipo: e.target.value as Criterio['tipo'] })}
                  className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                >
                  <option value="FLAG">Sim ou não</option>
                  <option value="FAIXA">Faixa de valor</option>
                  <option value="PROGRESSIVO">Progressivo</option>
                </select>
              </Campo>
              <Campo rotulo="Fato da ficha">
                <select
                  value={criterio.fonte}
                  onChange={(e) => alterar(indice, { fonte: e.target.value })}
                  className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                >
                  {FATOS.map((fato) => (
                    <option key={fato.valor} value={fato.valor}>
                      {fato.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Exige evidência">
                <select
                  value={criterio.evidencia ?? ''}
                  onChange={(e) => alterar(indice, { evidencia: e.target.value || undefined })}
                  className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                >
                  <option value="">Não exige</option>
                  <option value="laudoRiscoRegistrado">Laudo de risco anexado</option>
                </select>
              </Campo>
            </div>

            {criterio.tipo === 'FAIXA' && (
              <Campo rotulo="Faixas (limite:pontos, a última sem limite)">
                <input
                  defaultValue={formatarFaixas(criterio.faixas)}
                  onBlur={(e) => alterar(indice, { faixas: lerFaixas(e.target.value) })}
                  placeholder="400:30, 800:20, :0"
                  className="tabular mt-3 w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                />
              </Campo>
            )}

            {criterio.tipo === 'PROGRESSIVO' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Pontos por unidade">
                  <input
                    type="number"
                    step="0.01"
                    value={criterio.pontosPorUnidade ?? 0}
                    onChange={(e) => alterar(indice, { pontosPorUnidade: Number(e.target.value) })}
                    className="tabular w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                  />
                </Campo>
                <Campo rotulo="Teto de unidades">
                  <input
                    type="number"
                    value={criterio.unidadeMaxima ?? 0}
                    onChange={(e) => alterar(indice, { unidadeMaxima: Number(e.target.value) })}
                    className="tabular w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
                  />
                </Campo>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-texto-suave">
      {rotulo}
      <div className="mt-1 font-normal text-texto">{children}</div>
    </label>
  );
}

const formatarFaixas = (faixas?: { ate: number | null; pontos: number }[]): string =>
  (faixas ?? []).map((faixa) => `${faixa.ate ?? ''}:${faixa.pontos}`).join(', ');

/** "400:30, :0" → faixas ordenadas. Entrada livre porque regulamento se escreve em texto. */
function lerFaixas(texto: string): { ate: number | null; pontos: number }[] {
  return texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const [ate, pontos] = parte.split(':');
      return {
        ate: ate?.trim() ? Number(ate) : null,
        pontos: Number(pontos ?? 0),
      };
    });
}
