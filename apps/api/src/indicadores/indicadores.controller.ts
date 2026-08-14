import { Controller, Get, Injectable } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { PrismaService } from '../prisma/prisma.service';

const SALARIO_MINIMO_PADRAO = 1600;

export interface Fatia {
  chave: string;
  rotulo: string;
  valor: number;
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Indicadores sociais do município, apurados sobre as fichas vigentes.
   *
   * A agregação roda em memória de propósito nesta fase: o volume é de milhares de fichas por
   * município, e escrever SQL de agregação para array de enum (vulnerabilidades, benefícios)
   * custaria mais em complexidade do que ganha em tempo. Quando passar de ~50 mil fichas, isto
   * vira view materializada — e o contrato da resposta não muda.
   */
  async painel() {
    const [fichas, inscricoes, programas, tenant] = await Promise.all([
      this.prisma.tx.fichaSocial.findMany({
        where: { vigente: true, deletedAt: null },
        select: {
          rendaPerCapita: true,
          rendaFamiliar: true,
          quantidadePessoas: true,
          quantidadeMenores: true,
          temIdoso: true,
          temPessoaComDeficiencia: true,
          mulherChefeFamilia: true,
          moradiaInadequada: true,
          situacaoRisco: true,
          laudoRiscoKey: true,
          tipoMoradia: true,
          saneamento: true,
          vulnerabilidades: true,
          beneficios: true,
          nivelVulnerabilidade: true,
          familia: { select: { responsavel: { select: { escolaridade: true } } } },
        },
      }),
      this.prisma.tx.inscricaoFila.groupBy({
        by: ['situacao'],
        _count: true,
        where: { deletedAt: null },
      }),
      this.prisma.tx.programaHabitacional.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          nome: true,
          slug: true,
          vagas: true,
          situacao: true,
          _count: { select: { inscricoes: true } },
        },
      }),
      this.prisma.tx.tenant.findFirst({ select: { parametros: true } }),
    ]);

    const salarioMinimo =
      ((tenant?.parametros ?? {}) as { salarioMinimo?: number }).salarioMinimo ??
      SALARIO_MINIMO_PADRAO;

    const rendas = fichas.map((ficha) => Number(ficha.rendaPerCapita)).sort((a, b) => a - b);
    const pessoas = fichas.reduce((soma, ficha) => soma + ficha.quantidadePessoas, 0);
    const menores = fichas.reduce((soma, ficha) => soma + ficha.quantidadeMenores, 0);

    return {
      resumo: {
        familias: fichas.length,
        pessoas,
        menores,
        rendaPerCapitaMediana: mediana(rendas),
        rendaPerCapitaMedia: media(rendas),
        salarioMinimo,
        // Extrema pobreza pela régua federal: até ¼ do salário mínimo per capita.
        emExtremaPobreza: rendas.filter((renda) => renda <= salarioMinimo / 4).length,
      },
      faixasRenda: faixasDeRenda(rendas, salarioMinimo),
      vulnerabilidades: contarLista(
        fichas.flatMap((ficha) => ficha.vulnerabilidades),
        habitacao.rotuloVulnerabilidade,
      ),
      beneficios: contarLista(
        fichas.flatMap((ficha) => ficha.beneficios),
        habitacao.rotuloBeneficio,
      ),
      composicao: [
        fatia('MENORES', 'Com menores no domicílio', fichas.filter((f) => f.quantidadeMenores > 0).length),
        fatia('IDOSO', 'Com idoso', fichas.filter((f) => f.temIdoso).length),
        fatia('PCD', 'Com pessoa com deficiência', fichas.filter((f) => f.temPessoaComDeficiencia).length),
        fatia('MULHER_CHEFE', 'Mulher chefe de família', fichas.filter((f) => f.mulherChefeFamilia).length),
        fatia('MORADIA_INADEQUADA', 'Moradia inadequada', fichas.filter((f) => f.moradiaInadequada).length),
      ].sort((a, b) => b.valor - a.valor),
      risco: {
        declarado: fichas.filter((ficha) => ficha.situacaoRisco).length,
        comLaudo: fichas.filter((ficha) => ficha.situacaoRisco && ficha.laudoRiscoKey).length,
      },
      moradia: contarLista(
        fichas.map((ficha) => ficha.tipoMoradia),
        habitacao.rotuloTipoMoradia,
      ),
      saneamento: contarLista(
        fichas.map((ficha) => ficha.saneamento),
        habitacao.rotuloSaneamento,
      ),
      escolaridade: contarLista(
        fichas.map((ficha) => ficha.familia.responsavel.escolaridade).filter(Boolean) as string[],
        habitacao.rotuloEscolaridade,
      ),
      situacoesFila: inscricoes
        .map((linha) => fatia(linha.situacao, rotuloSituacao(linha.situacao), linha._count))
        .sort((a, b) => b.valor - a.valor),
      programas: programas.map((programa) => ({
        id: programa.id,
        nome: programa.nome,
        slug: programa.slug,
        vagas: programa.vagas,
        situacao: programa.situacao,
        inscricoes: programa._count.inscricoes,
      })),
    };
  }

  /**
   * Árvore Programa → Família → Morador.
   *
   * Serve para enxergar a carteira de uma vez: quantas famílias em cada programa e quem são as
   * pessoas por trás do número. O nome aparece porque quem abre isto é servidor da Habitação; a
   * central do munícipe nunca chega aqui.
   */
  async arvore() {
    const programas = await this.prisma.tx.programaHabitacional.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        slug: true,
        vagas: true,
        inscricoes: {
          where: { deletedAt: null },
          select: {
            id: true,
            protocolo: true,
            situacao: true,
            familia: {
              select: {
                id: true,
                codigo: true,
                responsavel: { select: { nome: true } },
                fichas: {
                  where: { vigente: true },
                  take: 1,
                  select: {
                    quantidadePessoas: true,
                    rendaPerCapita: true,
                    quantidadeMenores: true,
                    nivelVulnerabilidade: true,
                  },
                },
                membros: {
                  where: { saiuEm: null },
                  select: {
                    id: true,
                    parentesco: true,
                    pessoa: { select: { nome: true, nascimento: true, deficiencia: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return programas.map((programa) => ({
      id: programa.id,
      nome: programa.nome,
      slug: programa.slug,
      vagas: programa.vagas,
      familias: programa.inscricoes.map((inscricao) => {
        const ficha = inscricao.familia.fichas[0];
        return {
          inscricaoId: inscricao.id,
          familiaId: inscricao.familia.id,
          protocolo: inscricao.protocolo,
          situacao: inscricao.situacao,
          responsavel: inscricao.familia.responsavel.nome,
          pessoas: ficha?.quantidadePessoas ?? 0,
          menores: ficha?.quantidadeMenores ?? 0,
          rendaPerCapita: ficha ? Number(ficha.rendaPerCapita) : null,
          nivelVulnerabilidade: ficha?.nivelVulnerabilidade ?? null,
          moradores: inscricao.familia.membros.map((membro) => ({
            id: membro.id,
            nome: membro.pessoa.nome,
            parentesco: membro.parentesco,
            idade: idadeEm(membro.pessoa.nascimento),
            deficiencia: membro.pessoa.deficiencia,
          })),
        };
      }),
    }));
  }
}

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get()
  painel() {
    return this.indicadores.painel();
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('arvore')
  arvore() {
    return this.indicadores.arvore();
  }
}

const fatia = (chave: string, rotulo: string, valor: number): Fatia => ({ chave, rotulo, valor });

function contarLista(valores: string[], rotular: (v: string) => string): Fatia[] {
  const contagem = new Map<string, number>();
  for (const valor of valores) {
    contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([chave, valor]) => fatia(chave, rotular(chave), valor))
    .sort((a, b) => b.valor - a.valor);
}

/** Faixas da régua federal de renda per capita — as mesmas que o critério-modelo usa. */
function faixasDeRenda(rendas: number[], salarioMinimo: number): Fatia[] {
  const limites = [
    { chave: 'ATE_1_4', rotulo: 'Até ¼ do salário mínimo', ate: salarioMinimo / 4 },
    { chave: 'ATE_1_2', rotulo: 'De ¼ a ½ salário mínimo', ate: salarioMinimo / 2 },
    { chave: 'ATE_1', rotulo: 'De ½ a 1 salário mínimo', ate: salarioMinimo },
    { chave: 'ACIMA_1', rotulo: 'Acima de 1 salário mínimo', ate: Number.POSITIVE_INFINITY },
  ];

  let anterior = -1;
  return limites.map((limite) => {
    const valor = rendas.filter((renda) => renda > anterior && renda <= limite.ate).length;
    anterior = limite.ate;
    return fatia(limite.chave, limite.rotulo, valor);
  });
}

function mediana(ordenados: number[]): number {
  if (ordenados.length === 0) return 0;
  const meio = Math.floor(ordenados.length / 2);
  const valor =
    ordenados.length % 2 === 0 ? ((ordenados[meio - 1] ?? 0) + (ordenados[meio] ?? 0)) / 2 : (ordenados[meio] ?? 0);
  return Number(valor.toFixed(2));
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Number((valores.reduce((soma, v) => soma + v, 0) / valores.length).toFixed(2));
}

function idadeEm(nascimento: Date | null): number | null {
  if (!nascimento) return null;
  const hoje = new Date();
  const anos = hoje.getFullYear() - nascimento.getFullYear();
  const antesDoAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  return antesDoAniversario ? anos - 1 : anos;
}

const SITUACOES: Record<string, string> = {
  EM_ANALISE: 'Em análise',
  PENDENTE: 'Com pendência',
  APTA: 'Apta',
  EM_RECURSO: 'Em recurso',
  CONVOCADA: 'Convocada',
  CONTEMPLADA: 'Contemplada',
  INDEFERIDA: 'Indeferida',
  INELEGIVEL: 'Inelegível',
  DESISTENTE: 'Desistiu',
  CANCELADA: 'Cancelada',
};

const rotuloSituacao = (situacao: string): string => SITUACOES[situacao] ?? situacao;
