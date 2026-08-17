import Link from 'next/link';
import type { habitacao } from '@habita/shared';

export interface ConferenciaFicha {
  temFicha: boolean;
  inconsistencias: habitacao.Inconsistencia[];
  resumo: { total: number; altas: number; afetamPontuacao: number };
}

const TOM: Record<habitacao.SeveridadeInconsistencia, string> = {
  ALTA: 'border-danger/40 bg-danger/5',
  MEDIA: 'border-warning/40 bg-warning/10',
  BAIXA: 'border-borda bg-background',
};

const ETIQUETA: Record<habitacao.SeveridadeInconsistencia, string> = {
  ALTA: 'bg-danger/10 text-danger',
  MEDIA: 'bg-warning/15 text-warning-text',
  BAIXA: 'bg-background text-texto-suave',
};

/**
 * Conferência automática da ficha.
 *
 * Nenhum destes apontamentos vem de IA: são comparações de números que a máquina faz melhor e
 * sempre igual. O que afeta a pontuação aparece primeiro e leva o selo — é a diferença entre um
 * cadastro desarrumado e uma família no lugar errado da fila.
 */
export function PainelConferencia({
  conferencia,
  hrefFicha,
}: {
  conferencia: ConferenciaFicha;
  hrefFicha: string;
}) {
  if (!conferencia.temFicha || conferencia.inconsistencias.length === 0) return null;

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-institucional">
          Conferência da ficha
        </h2>
        <p className="text-sm text-texto-suave">
          {conferencia.resumo.total} ponto(s) a conferir
          {conferencia.resumo.afetamPontuacao > 0 &&
            ` · ${conferencia.resumo.afetamPontuacao} afeta(m) a pontuação`}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {conferencia.inconsistencias.map((item) => (
          <li key={item.codigo} className={`rounded-md border p-3 ${TOM[item.severidade]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-texto">{item.titulo}</p>
              <div className="flex shrink-0 gap-1.5">
                {item.afetaPontuacao && (
                  <span className="rounded-full bg-institucional/10 px-2 py-0.5 text-xs font-semibold text-institucional">
                    afeta a pontuação
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ETIQUETA[item.severidade]}`}
                >
                  {item.severidade.toLowerCase()}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-texto-suave">{item.detalhe}</p>
            <p className="mt-1 text-xs text-texto-suave">
              <strong>O que conferir:</strong> {item.oQueConferir}
            </p>
          </li>
        ))}
      </ul>

      <Link
        href={hrefFicha}
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        Abrir a ficha para corrigir
      </Link>
    </section>
  );
}
