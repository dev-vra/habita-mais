import { cn } from '@/lib/cn';

/** Primitivos de formulário sobre a fundação gov.br. Sem MUI, sem hex solto: só tokens. */

export function CampoTexto({
  nome,
  rotulo,
  tipo = 'text',
  placeholder,
  autoComplete,
  obrigatorio = false,
  ajuda,
}: {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
  obrigatorio?: boolean;
  ajuda?: string;
}) {
  const idAjuda = ajuda ? `${nome}-ajuda` : undefined;

  return (
    <div>
      <label htmlFor={nome} className="block text-sm font-semibold text-texto">
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={obrigatorio}
        aria-describedby={idAjuda}
        className={cn(
          'mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2.5 text-base',
          'outline-none transition focus:border-institucional focus:ring-2 focus:ring-institucional/30',
        )}
      />
      {ajuda && (
        <p id={idAjuda} className="mt-1.5 text-xs text-texto-suave">
          {ajuda}
        </p>
      )}
    </div>
  );
}

export function Botao({
  children,
  tipo = 'button',
  variante = 'primario',
  carregando = false,
  className,
}: {
  children: React.ReactNode;
  tipo?: 'button' | 'submit';
  variante?: 'primario' | 'secundario';
  carregando?: boolean;
  className?: string;
}) {
  return (
    <button
      type={tipo}
      disabled={carregando}
      className={cn(
        'w-full rounded-md px-4 py-2.5 text-base font-semibold transition',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60',
        // Âmbar é ação: se está âmbar, é clicável (Identidade §2).
        variante === 'primario'
          ? 'bg-primary text-surface hover:bg-primary/90 focus:ring-primary'
          : 'border border-borda bg-surface text-institucional hover:bg-background focus:ring-institucional',
        className,
      )}
    >
      {carregando ? 'Aguarde…' : children}
    </button>
  );
}

export function Aviso({
  children,
  tom = 'info',
}: {
  children: React.ReactNode;
  tom?: 'info' | 'danger' | 'warning' | 'reurb';
}) {
  const tons = {
    info: 'border-institucional/30 bg-institucional/5 text-institucional',
    danger: 'border-danger/30 bg-danger/5 text-danger',
    warning: 'border-warning/40 bg-warning/10 text-warning-text',
    // Azul só para o que vem do Regulariza+ — nunca para ação própria.
    reurb: 'border-vinculo-reurb/30 bg-vinculo-reurb/5 text-vinculo-reurb',
  } as const;

  return (
    <div role="alert" className={cn('rounded-md border px-4 py-3 text-sm', tons[tom])}>
      {children}
    </div>
  );
}
