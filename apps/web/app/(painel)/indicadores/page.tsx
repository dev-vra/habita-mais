import Link from 'next/link';
import { BarrasHorizontais, Cartao, Destaque, Distribuicao, type Fatia } from '@/components/dataviz/graficos';
import { apiFetch } from '@/lib/api/server';
import { formatarReais } from '@/lib/status';
import { ArvoreCarteira, type ProgramaArvore } from './arvore-carteira';

interface Indicadores {
  resumo: {
    familias: number;
    pessoas: number;
    menores: number;
    rendaPerCapitaMediana: number;
    rendaPerCapitaMedia: number;
    salarioMinimo: number;
    emExtremaPobreza: number;
  };
  faixasRenda: Fatia[];
  vulnerabilidades: Fatia[];
  beneficios: Fatia[];
  composicao: Fatia[];
  risco: { declarado: number; comLaudo: number };
  moradia: Fatia[];
  saneamento: Fatia[];
  escolaridade: Fatia[];
  situacoesFila: Fatia[];
  programas: { id: string; nome: string; slug: string; vagas: number; inscricoes: number }[];
}

/**
 * Painel de indicadores sociais.
 *
 * É a tela que responde ao gestor o que a carteira dele é — e alimenta o PLHIS com número, não com
 * impressão. Cada gráfico responde uma pergunta que a prefeitura precisa levar a reunião: quantos
 * estão em extrema pobreza, quantos moram em lugar sem saneamento, quantos declararam risco sem
 * laudo (esses não pontuam, e é bom que apareça).
 */
export default async function PaginaIndicadores() {
  const [indicadores, arvore] = await Promise.all([
    apiFetch<Indicadores>('/indicadores'),
    apiFetch<ProgramaArvore[]>('/indicadores/arvore'),
  ]);
  const { resumo, risco } = indicadores;

  const proporcaoExtrema =
    resumo.familias > 0 ? Math.round((resumo.emExtremaPobreza / resumo.familias) * 100) : 0;
  const riscoSemLaudo = risco.declarado - risco.comLaudo;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Indicadores</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Indicadores sociais
      </h1>
      <p className="mt-1 text-texto-suave">
        Apurado sobre as fichas vigentes. Salário mínimo de referência:{' '}
        {formatarReais(resumo.salarioMinimo)}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Destaque rotulo="Famílias com ficha" valor={resumo.familias.toLocaleString('pt-BR')} nota={`${resumo.pessoas} pessoas · ${resumo.menores} menores`} />
        <Destaque
          rotulo="Em extrema pobreza"
          valor={`${proporcaoExtrema}%`}
          nota={`${resumo.emExtremaPobreza} famílias até ¼ do salário mínimo`}
          tom="alerta"
        />
        <Destaque
          rotulo="Renda per capita mediana"
          valor={formatarReais(resumo.rendaPerCapitaMediana)}
          nota={`média ${formatarReais(resumo.rendaPerCapitaMedia)}`}
        />
        <Destaque
          rotulo="Risco declarado sem laudo"
          valor={String(riscoSemLaudo)}
          nota={
            riscoSemLaudo > 0
              ? 'não pontuam até a Defesa Civil emitir'
              : `${risco.comLaudo} com laudo`
          }
          tom={riscoSemLaudo > 0 ? 'perigo' : 'institucional'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Cartao
          titulo="Renda per capita"
          descricao="Faixas da régua federal — as mesmas do critério-modelo de pontuação."
        >
          <Distribuicao dados={indicadores.faixasRenda} />
        </Cartao>

        <Cartao titulo="Situação na fila" descricao="Onde estão as inscrições hoje.">
          <BarrasHorizontais dados={indicadores.situacoesFila} />
        </Cartao>

        <Cartao
          titulo="Vulnerabilidades apuradas"
          descricao="Indicadores marcados nas fichas vigentes. Uma família pode ter mais de um."
        >
          <BarrasHorizontais
            dados={indicadores.vulnerabilidades}
            cor="#C0392B"
            vazio="Nenhuma vulnerabilidade marcada ainda — o campo é novo na ficha."
          />
        </Cartao>

        <Cartao titulo="Perfil das famílias" descricao="Recortes que pesam na pontuação.">
          <BarrasHorizontais dados={indicadores.composicao} cor="#0E8A63" />
        </Cartao>

        <Cartao titulo="Moradia atual" descricao="Condição declarada na ficha.">
          <BarrasHorizontais dados={indicadores.moradia} cor="#8E44AD" />
        </Cartao>

        <Cartao titulo="Esgotamento sanitário" descricao="O que o entorno oferece.">
          <BarrasHorizontais dados={indicadores.saneamento} cor="#2980B9" />
        </Cartao>

        <Cartao titulo="Benefícios recebidos" descricao="Declarados na ficha social.">
          <BarrasHorizontais
            dados={indicadores.beneficios}
            cor="#C77D14"
            vazio="Nenhum benefício declarado ainda."
          />
        </Cartao>

        <Cartao titulo="Escolaridade do responsável" descricao="Do responsável familiar.">
          <BarrasHorizontais
            dados={indicadores.escolaridade}
            cor="#0E8A63"
            vazio="Escolaridade ainda não preenchida nas fichas."
          />
        </Cartao>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-institucional">
          Carteira: programa → família → morador
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          A mesma carteira em três níveis. Abra um programa para ver as famílias, e uma família para
          ver quem mora na casa.
        </p>
        <ArvoreCarteira programas={arvore} />
      </section>

      <p className="mt-8 text-sm text-texto-suave">
        Precisa da lista completa?{' '}
        <Link href="/familias" className="font-semibold text-primary hover:underline">
          Ver famílias
        </Link>{' '}
        ou{' '}
        <Link href="/programas" className="font-semibold text-primary hover:underline">
          programas
        </Link>
        .
      </p>
    </div>
  );
}
