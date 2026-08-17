import { cn } from '@/lib/cn';

/**
 * Contador de topo de tela. Mantém a leitura do `Contador` antigo (rótulo, valor, nota) e ganha a
 * barra de 3px no rodapé: o número diz quanto, a barra diz quanto disso é o todo. Âmbar-claro
 * quando o número é alerta — convocação fora de ordem e ficha vencida não podem parecer rotina.
 */
export function CartaoKpi({
  rotulo,
  valor,
  nota,
  proporcao,
  alerta = false,
  indice = 0,
}: {
  rotulo: string;
  valor: number | string;
  nota?: string;
  /** 0 a 1. Sem proporção a barra fica cheia, só como assinatura do cartão. */
  proporcao?: number;
  alerta?: boolean;
  /** Posição na grade — atrasa a entrada em 50ms por cartão. */
  indice?: number;
}) {
  const largura = proporcao === undefined ? 1 : Math.min(Math.max(proporcao, 0), 1);

  return (
    <div
      className={cn(
        'animate-subir overflow-hidden rounded-lg border border-borda bg-surface pt-[15px]',
        'transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(28,50,42,0.05)]',
      )}
      style={{ animationDelay: `${indice * 50}ms` }}
    >
      <div className="px-4 pb-4">
        <p className="text-[12.5px] text-texto-suave">{rotulo}</p>
        <p
          className={cn(
            'tabular mt-0.5 font-display text-[29px] font-extrabold leading-none',
            alerta ? 'text-warning-text' : 'text-institucional',
          )}
        >
          {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
        </p>
        {nota && <p className="mt-1.5 text-[11.5px] text-texto-suave">{nota}</p>}
      </div>

      <div aria-hidden className="h-[3px] w-full bg-background">
        <div
          className={cn(
            'animate-crescer h-full origin-left',
            alerta ? 'bg-primary-claro' : 'bg-institucional-claro',
          )}
          style={{ width: `${largura * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Grade padrão de KPI: cabe de 2 a 4 por linha sem cartão órfão. */
export function GradeKpi({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
      {children}
    </div>
  );
}
