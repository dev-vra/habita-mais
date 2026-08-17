// Conferência automática da ficha social.
//
// Aqui NÃO entra modelo de linguagem, e a escolha é deliberada: quase toda inconsistência de
// cadastro é comparação de números — renda dividida por pessoas, idade contra "tem idoso",
// benefício contra faixa de renda. Regra determinística é reproduzível dois anos depois, na
// auditoria; a mesma pergunta feita a um modelo pode dar outra resposta na segunda vez.
//
// O que sai daqui nunca corrige nada sozinho: aponta o que não fecha e diz o que conferir. Quem
// muda a ficha é quem visitou a família.

export type SeveridadeInconsistencia = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface Inconsistencia {
  codigo: string;
  severidade: SeveridadeInconsistencia;
  titulo: string;
  /** O que não fecha, com os números do caso. */
  detalhe: string;
  /** O que a pessoa deve fazer para resolver. */
  oQueConferir: string;
  /** Afeta a pontuação da família na fila? É o que separa erro de cadastro de erro de resultado. */
  afetaPontuacao: boolean;
}

export interface MembroParaConferencia {
  parentesco: string;
  nascimento?: string | null;
  temDeficiencia?: boolean;
}

export interface RetratoFicha {
  rendaFamiliar: number;
  rendaPerCapita: number;
  quantidadePessoas: number;
  beneficios: readonly string[];
  inscritoCadUnico: boolean;
  nis?: string | null;
  nisVerificado: boolean;
  temIdoso: boolean;
  temPessoaComDeficiencia: boolean;
  quantidadeMenores: number;
  mulherChefeFamilia: boolean;
  situacaoRisco: boolean;
  temLaudoRisco: boolean;
  possuiOutroImovel: boolean;
  responsavelSexo?: string | null;
  membros: readonly MembroParaConferencia[];
  /** Salário mínimo vigente na prefeitura — base das faixas de benefício. */
  salarioMinimo: number;
}

/** Tolerância no arredondamento da renda per capita (centavos). */
const TOLERANCIA_CENTAVOS = 0.02;
/** Renda per capita máxima do BPC: 1/4 do salário mínimo (Lei 8.742/93, art. 20 §3º). */
const FRACAO_BPC = 0.25;
/** Teto de renda per capita do Bolsa Família (Lei 14.601/2023). */
const TETO_BOLSA_FAMILIA = 218;
const IDADE_IDOSO = 60;
const IDADE_MAIORIDADE = 18;

/**
 * Confere a ficha contra ela mesma.
 *
 * A ordem importa: o que afeta a pontuação vem primeiro, porque é o que muda o lugar da família na
 * fila. Uma divergência de composição é chata; uma renda per capita errada tira alguém da casa.
 */
export function conferirFicha(retrato: RetratoFicha, agora: Date): Inconsistencia[] {
  const achados: Inconsistencia[] = [];
  const idades = retrato.membros.map((membro) => idadeEm(membro.nascimento, agora));

  const perCapitaEsperada =
    retrato.quantidadePessoas > 0 ? retrato.rendaFamiliar / retrato.quantidadePessoas : 0;

  if (Math.abs(perCapitaEsperada - retrato.rendaPerCapita) > TOLERANCIA_CENTAVOS) {
    achados.push({
      codigo: 'PER_CAPITA_DIVERGENTE',
      severidade: 'ALTA',
      titulo: 'Renda per capita não bate com a conta',
      detalhe: `${dinheiro(retrato.rendaFamiliar)} dividido por ${retrato.quantidadePessoas} pessoa(s) dá ${dinheiro(perCapitaEsperada)}, mas a ficha registra ${dinheiro(retrato.rendaPerCapita)}.`,
      oQueConferir: 'Recalcule a ficha. A per capita é o critério de maior peso na pontuação.',
      afetaPontuacao: true,
    });
  }

  const cadastrados = retrato.membros.length;
  if (cadastrados > 0 && cadastrados !== retrato.quantidadePessoas) {
    achados.push({
      codigo: 'COMPOSICAO_DIVERGENTE',
      severidade: 'ALTA',
      titulo: 'Composição apurada difere dos membros cadastrados',
      detalhe: `A ficha declara ${retrato.quantidadePessoas} pessoa(s) no grupo familiar e há ${cadastrados} membro(s) cadastrado(s).`,
      oQueConferir:
        'Confira quem falta cadastrar — ou corrija a composição. A renda per capita depende deste número.',
      afetaPontuacao: true,
    });
  }

  const idosos = idades.filter((idade) => idade !== null && idade >= IDADE_IDOSO).length;
  if (retrato.temIdoso && idosos === 0 && cadastrados > 0) {
    achados.push({
      codigo: 'IDOSO_SEM_MEMBRO',
      severidade: 'MEDIA',
      titulo: 'Marcado "tem idoso", mas nenhum membro tem 60 anos ou mais',
      detalhe: `Nenhum dos ${cadastrados} membro(s) cadastrado(s) alcança ${IDADE_IDOSO} anos.`,
      oQueConferir: 'Confira a data de nascimento dos membros ou desmarque o indicador.',
      afetaPontuacao: true,
    });
  }
  if (!retrato.temIdoso && idosos > 0) {
    achados.push({
      codigo: 'IDOSO_NAO_MARCADO',
      severidade: 'MEDIA',
      titulo: 'Há idoso na família e o indicador está desmarcado',
      detalhe: `${idosos} membro(s) com ${IDADE_IDOSO} anos ou mais.`,
      oQueConferir: 'Marque o indicador — ele pontua, e a família está perdendo posição na fila.',
      afetaPontuacao: true,
    });
  }

  const menores = idades.filter((idade) => idade !== null && idade < IDADE_MAIORIDADE).length;
  if (cadastrados > 0 && menores !== retrato.quantidadeMenores) {
    achados.push({
      codigo: 'MENORES_DIVERGENTE',
      severidade: 'MEDIA',
      titulo: 'Quantidade de menores não confere',
      detalhe: `A ficha registra ${retrato.quantidadeMenores} menor(es) e há ${menores} membro(s) com menos de ${IDADE_MAIORIDADE} anos.`,
      oQueConferir: 'Confira as datas de nascimento ou ajuste o campo.',
      afetaPontuacao: true,
    });
  }

  const comDeficiencia = retrato.membros.filter((membro) => membro.temDeficiencia).length;
  if (retrato.temPessoaComDeficiencia && comDeficiencia === 0 && cadastrados > 0) {
    achados.push({
      codigo: 'DEFICIENCIA_SEM_MEMBRO',
      severidade: 'MEDIA',
      titulo: 'Marcado "pessoa com deficiência", mas nenhum membro registra deficiência',
      detalhe: 'O indicador está marcado e nenhum membro cadastrado tem deficiência informada.',
      oQueConferir: 'Registre a deficiência no membro ou desmarque o indicador.',
      afetaPontuacao: true,
    });
  }

  if (retrato.situacaoRisco && !retrato.temLaudoRisco) {
    achados.push({
      codigo: 'RISCO_SEM_LAUDO',
      severidade: 'ALTA',
      titulo: 'Situação de risco sem laudo da Defesa Civil',
      detalhe: 'Risco marcado na ficha, sem laudo anexado.',
      oQueConferir:
        'Encaminhe à Defesa Civil. Sem laudo o critério de risco não pontua — risco é evidência de terceiro, não marcação do servidor.',
      afetaPontuacao: true,
    });
  }

  // ── Benefício contra faixa de renda ────────────────────────────────────────
  const tetoBpc = retrato.salarioMinimo * FRACAO_BPC;

  if (retrato.beneficios.includes('BPC') && retrato.rendaPerCapita > tetoBpc) {
    achados.push({
      codigo: 'BPC_ACIMA_DA_FAIXA',
      severidade: 'MEDIA',
      titulo: 'BPC declarado com renda acima da faixa do benefício',
      detalhe: `O BPC exige renda per capita de até ${dinheiro(tetoBpc)} (1/4 do salário mínimo) e a ficha registra ${dinheiro(retrato.rendaPerCapita)}.`,
      oQueConferir:
        'Confira se a renda inclui o próprio BPC ou se o benefício foi cessado. Um dos dois números está errado.',
      afetaPontuacao: false,
    });
  }

  if (
    retrato.beneficios.includes('BOLSA_FAMILIA') &&
    retrato.rendaPerCapita > TETO_BOLSA_FAMILIA
  ) {
    achados.push({
      codigo: 'BOLSA_FAMILIA_ACIMA_DA_FAIXA',
      severidade: 'MEDIA',
      titulo: 'Bolsa Família declarado com renda acima do teto do programa',
      detalhe: `O teto é ${dinheiro(TETO_BOLSA_FAMILIA)} por pessoa e a ficha registra ${dinheiro(retrato.rendaPerCapita)}.`,
      oQueConferir: 'Confira se o benefício continua ativo e se a renda declarada já o inclui.',
      afetaPontuacao: false,
    });
  }

  if (retrato.beneficios.length > 0 && !retrato.inscritoCadUnico) {
    achados.push({
      codigo: 'BENEFICIO_SEM_CADUNICO',
      severidade: 'BAIXA',
      titulo: 'Recebe benefício e não consta como inscrita no CadÚnico',
      detalhe: 'Os benefícios declarados exigem inscrição no Cadastro Único.',
      oQueConferir: 'Confirme a inscrição — é ela que sustenta o benefício declarado.',
      afetaPontuacao: false,
    });
  }

  if (retrato.inscritoCadUnico && !retrato.nis?.trim()) {
    achados.push({
      codigo: 'CADUNICO_SEM_NIS',
      severidade: 'BAIXA',
      titulo: 'Inscrita no CadÚnico sem NIS informado',
      detalhe: 'A ficha marca inscrição no Cadastro Único e não tem o NIS.',
      oQueConferir: 'Peça o NIS no próximo atendimento.',
      afetaPontuacao: false,
    });
  }

  if (retrato.nis?.trim() && !retrato.nisVerificado) {
    achados.push({
      codigo: 'NIS_NAO_VERIFICADO',
      severidade: 'BAIXA',
      titulo: 'NIS informado no balcão, sem conferência na base federal',
      detalhe: 'Enquanto não for verificado, é dado declarado — não comprovado.',
      oQueConferir: 'Confira no CECAD/CadÚnico quando houver acesso.',
      afetaPontuacao: false,
    });
  }

  if (retrato.rendaFamiliar === 0 && retrato.beneficios.length === 0) {
    achados.push({
      codigo: 'RENDA_ZERO_SEM_BENEFICIO',
      severidade: 'MEDIA',
      titulo: 'Renda zero e nenhum benefício declarado',
      detalhe: 'A família não declara renda nem benefício social.',
      oQueConferir:
        'Confirme como a família se mantém e encaminhe à Assistência Social se for o caso.',
      afetaPontuacao: false,
    });
  }

  if (retrato.mulherChefeFamilia && retrato.responsavelSexo === 'MASCULINO') {
    achados.push({
      codigo: 'CHEFIA_FEMININA_DIVERGENTE',
      severidade: 'BAIXA',
      titulo: 'Marcado "mulher chefe de família" com responsável do sexo masculino',
      detalhe: 'O indicador está marcado e a pessoa responsável está cadastrada como masculino.',
      oQueConferir: 'Confira quem é a pessoa responsável pelo núcleo.',
      afetaPontuacao: true,
    });
  }

  if (retrato.possuiOutroImovel) {
    achados.push({
      codigo: 'POSSUI_OUTRO_IMOVEL',
      severidade: 'ALTA',
      titulo: 'Família declara possuir outro imóvel',
      detalhe: 'A posse de outro imóvel costuma ser condição de inelegibilidade no edital.',
      oQueConferir: 'Confira o edital do programa antes de manter a inscrição ativa.',
      afetaPontuacao: false,
    });
  }

  return achados.sort(ordenarPorGravidade);
}

const PESO_SEVERIDADE: Record<SeveridadeInconsistencia, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };

function ordenarPorGravidade(a: Inconsistencia, b: Inconsistencia): number {
  if (a.afetaPontuacao !== b.afetaPontuacao) return a.afetaPontuacao ? -1 : 1;
  return PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade];
}

export function resumirInconsistencias(achados: readonly Inconsistencia[]) {
  return {
    total: achados.length,
    altas: achados.filter((item) => item.severidade === 'ALTA').length,
    afetamPontuacao: achados.filter((item) => item.afetaPontuacao).length,
  };
}

function idadeEm(nascimento: string | null | undefined, agora: Date): number | null {
  if (!nascimento) return null;

  const data = new Date(nascimento);
  if (Number.isNaN(data.getTime())) return null;

  let idade = agora.getUTCFullYear() - data.getUTCFullYear();
  const mes = agora.getUTCMonth() - data.getUTCMonth();
  if (mes < 0 || (mes === 0 && agora.getUTCDate() < data.getUTCDate())) idade -= 1;

  return idade;
}

const dinheiro = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
