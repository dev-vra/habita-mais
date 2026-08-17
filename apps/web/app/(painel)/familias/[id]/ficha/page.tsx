import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { FormularioFicha } from './formulario-ficha';

/**
 * Reapuração da ficha. Cria ficha nova e aposenta a anterior — nunca edita no lugar, porque
 * snapshot de pontuação antigo aponta para os fatos que valiam.
 */
export default async function PaginaNovaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Famílias', href: '/familias' },
          { rotulo: 'Família', href: `/familias/${id}` },
          { rotulo: 'Nova apuração' },
        ]}
        titulo="Nova apuração da ficha social"
        subtitulo="A ficha anterior é preservada. A pontuação não muda sozinha: recalcular é ato do gestor, com trilha própria."
      />

      <CorpoTela className="max-w-4xl">
        <FormularioFicha familiaId={id} />
      </CorpoTela>
    </>
  );
}
