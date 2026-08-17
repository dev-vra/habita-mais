import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { ApiError, apiFetch } from '@/lib/api/server';
import { FormularioFamilia } from './formulario-familia';

/**
 * O salário mínimo é parâmetro da prefeitura: é ele que define as faixas do enquadramento. Se a
 * leitura falhar, o cadastro segue com um valor de referência — travar o balcão por causa de um
 * parâmetro de configuração seria pior do que exibir a faixa aproximada.
 */
async function salarioMinimoDoMunicipio(): Promise<number | null> {
  try {
    const parametros = await apiFetch<{ salarioMinimo?: number }>('/administracao/parametros');
    return parametros.salarioMinimo ?? null;
  } catch (erro) {
    if (erro instanceof ApiError) return null;
    throw erro;
  }
}

export default async function PaginaNovaFamilia() {
  const salarioMinimo = await salarioMinimoDoMunicipio();

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Famílias', href: '/familias' },
          { rotulo: 'Cadastrar' },
        ]}
        titulo="Cadastrar família"
        subtitulo="A família nasce com ficha social: sem ela não há fatos, e sem fatos não há pontuação defensável."
      />

      <div className="mx-auto max-w-[820px] px-5 pb-12 pt-5 lg:px-7">
        <FormularioFamilia salarioMinimo={salarioMinimo} />
      </div>
    </>
  );
}
