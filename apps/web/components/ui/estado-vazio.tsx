import { cn } from '@/lib/cn';

/**
 * O que aparece quando a lista não tem linha. Lista vazia sem explicação faz o servidor achar que
 * o sistema quebrou; aqui a tela diz o que houve e oferece a saída (limpar busca, cadastrar).
 */
export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: React.ReactNode;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'animate-surgir flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {icone && (
        <span
          aria-hidden
          className="mb-4 flex size-10 items-center justify-center rounded-lg bg-background text-texto-suave"
        >
          {icone}
        </span>
      )}
      <p className="text-sm font-bold text-texto">{titulo}</p>
      {descricao && (
        <p className="mt-1.5 max-w-[40ch] text-[12.5px] leading-relaxed text-texto-suave">
          {descricao}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
