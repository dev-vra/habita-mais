/**
 * Gráficos do painel de indicadores, em SVG puro.
 *
 * Paleta categórica validada para daltonismo e contraste (ΔE CVD ≥ 8, contraste ≥ 3:1 sobre a
 * superfície) — não é escolha estética: é a diferença entre um gestor ler o gráfico e adivinhar.
 * Toda série carrega rótulo direto, então a cor reforça a identidade em vez de carregá-la sozinha.
 */

export const PALETA = ['#0E8A63', '#C77D14', '#8E44AD', '#C0392B', '#2980B9'] as const;

/** Sequencial de um hue só, claro → escuro: usado onde a cor significa magnitude, não identidade. */
const SEQUENCIAL = ['#B7DFD0', '#7CC4AA', '#3FA582', '#0E8A63', '#075F44'] as const;

export interface Fatia {
  chave: string;
  rotulo: string;
  valor: number;
}

const formatar = (valor: number): string => valor.toLocaleString('pt-BR');

export function BarrasHorizontais({
  dados,
  cor,
  sufixo,
  vazio = 'Sem dados apurados.',
}: {
  dados: Fatia[];
  cor?: string;
  sufixo?: string;
  vazio?: string;
}) {
  if (dados.length === 0) return <p className="text-sm text-texto-suave">{vazio}</p>;

  const maximo = Math.max(...dados.map((fatia) => fatia.valor), 1);

  return (
    <ul className="mt-3 space-y-2">
      {dados.map((fatia, indice) => (
        <li key={fatia.chave}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-texto">{fatia.rotulo}</span>
            <span className="tabular font-semibold text-texto">
              {formatar(fatia.valor)}
              {sufixo}
            </span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded bg-background"
            role="img"
            aria-label={`${fatia.rotulo}: ${fatia.valor}`}
          >
            <div
              className="h-full rounded"
              style={{
                width: `${(fatia.valor / maximo) * 100}%`,
                backgroundColor: cor ?? PALETA[indice % PALETA.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Distribuição por faixa: a cor cresce com a faixa (sequencial), porque aqui ela significa
 * intensidade — quanto mais escuro, maior a renda. Identidade não está em jogo.
 */
export function Distribuicao({ dados }: { dados: Fatia[] }) {
  const total = dados.reduce((soma, fatia) => soma + fatia.valor, 0);
  if (total === 0) return <p className="text-sm text-texto-suave">Sem fichas apuradas.</p>;

  return (
    <div className="mt-3">
      <div className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md">
        {dados.map((fatia, indice) => {
          const proporcao = fatia.valor / total;
          if (proporcao === 0) return null;
          return (
            <div
              key={fatia.chave}
              title={`${fatia.rotulo}: ${formatar(fatia.valor)}`}
              style={{
                width: `${proporcao * 100}%`,
                backgroundColor: SEQUENCIAL[indice % SEQUENCIAL.length],
              }}
            />
          );
        })}
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {dados.map((fatia, indice) => (
          <li key={fatia.chave} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-texto">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: SEQUENCIAL[indice % SEQUENCIAL.length] }}
              />
              {fatia.rotulo}
            </span>
            <span className="tabular font-semibold">
              {formatar(fatia.valor)}
              <span className="ml-1 font-normal text-texto-suave">
                {Math.round((fatia.valor / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Número-herói: quando o dado é um só, um gráfico seria enfeite em volta de um número. */
export function Destaque({
  rotulo,
  valor,
  nota,
  tom = 'institucional',
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: 'institucional' | 'alerta' | 'perigo';
}) {
  const cores = {
    institucional: 'text-institucional',
    alerta: 'text-warning-text',
    perigo: 'text-danger',
  } as const;

  return (
    <div className="rounded-lg border border-borda bg-surface p-5">
      <p className="text-sm text-texto-suave">{rotulo}</p>
      <p className={`tabular mt-1 font-display text-3xl font-extrabold ${cores[tom]}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-texto-suave">{nota}</p>}
    </div>
  );
}

export function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-institucional">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-xs text-texto-suave">{descricao}</p>}
      {children}
    </section>
  );
}
