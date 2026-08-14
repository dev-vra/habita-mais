import Link from 'next/link';

export interface ItemDiagnostico {
  codigo: string;
  severidade: 'BLOQUEIO' | 'ATENCAO' | 'PROXIMO_PASSO' | 'OK';
  titulo: string;
  detalhe: string;
  acao?: string;
}

const ESTILOS = {
  BLOQUEIO: {
    caixa: 'border-danger/40 bg-danger/5',
    texto: 'text-danger',
    marca: 'Bloqueio',
    simbolo: '!',
  },
  PROXIMO_PASSO: {
    caixa: 'border-primary/40 bg-primary/5',
    texto: 'text-primary',
    marca: 'Próximo passo',
    simbolo: '→',
  },
  ATENCAO: {
    caixa: 'border-warning/40 bg-warning/10',
    texto: 'text-warning-text',
    marca: 'Atenção',
    simbolo: '•',
  },
  OK: {
    caixa: 'border-success/30 bg-success/5',
    texto: 'text-success',
    marca: 'Tudo certo',
    simbolo: '✓',
  },
} as const;

/**
 * O que falta, o que trava e o que fazer agora.
 *
 * Cor sozinha não carrega o recado: cada item traz símbolo e a palavra ("Bloqueio", "Atenção"),
 * porque quem não distingue vermelho de âmbar precisa da mesma informação — e porque isso é
 * impresso e fotocopiado em prefeitura.
 */
export function PainelDiagnostico({
  itens,
  acoes = {},
}: {
  itens: ItemDiagnostico[];
  acoes?: Record<string, string>;
}) {
  if (itens.length === 0) return null;

  const bloqueios = itens.filter((item) => item.severidade === 'BLOQUEIO').length;

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-institucional">Situação do cadastro</h2>
        <p className="text-sm text-texto-suave">
          {bloqueios > 0
            ? `${bloqueios} ${bloqueios === 1 ? 'item impede' : 'itens impedem'} o andamento`
            : 'Nada impede o andamento'}
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {itens.map((item) => {
          const estilo = ESTILOS[item.severidade];
          const destino = acoes[item.codigo];

          return (
            <li key={item.codigo} className={`rounded-md border px-4 py-3 ${estilo.caixa}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${estilo.texto}`}>
                    <span aria-hidden className="mr-1.5 font-bold">
                      {estilo.simbolo}
                    </span>
                    <span className="sr-only">{estilo.marca}: </span>
                    {item.titulo}
                  </p>
                  <p className="mt-0.5 text-sm text-texto-suave">{item.detalhe}</p>
                </div>

                {item.acao && destino && (
                  <Link
                    href={destino}
                    className={`shrink-0 rounded-md border border-current px-3 py-1 text-xs font-semibold ${estilo.texto}`}
                  >
                    {item.acao}
                  </Link>
                )}
                {item.acao && !destino && (
                  <span className={`shrink-0 text-xs font-semibold ${estilo.texto}`}>
                    {item.acao}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
