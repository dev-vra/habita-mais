import Link from 'next/link';
import { FormularioFicha } from './formulario-ficha';

/**
 * Reapuração da ficha. Cria ficha nova e aposenta a anterior — nunca edita no lugar, porque
 * snapshot de pontuação antigo aponta para os fatos que valiam.
 */
export default async function PaginaNovaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-texto-suave">
        <Link href={`/familias/${id}`} className="hover:underline">
          Início › Famílias › Família
        </Link>{' '}
        › Nova apuração
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Nova apuração da ficha social
      </h1>
      <p className="mt-1 text-texto-suave">
        A ficha anterior é preservada. A pontuação não muda sozinha: recalcular é ato do gestor,
        com trilha própria.
      </p>

      <FormularioFicha familiaId={id} />
    </div>
  );
}
