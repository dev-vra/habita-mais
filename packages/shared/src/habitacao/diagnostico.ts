// Diagnóstico do cadastro: o que falta, o que bloqueia e qual é o próximo passo.
//
// Existe porque o servidor do balcão não deveria precisar decorar as regras do produto para saber
// por que uma família não pontua ou não pode ser convocada. O sistema conhece as regras — então
// ele diz, em vez de deixar a pessoa descobrir por tentativa.
//
// Três severidades, e a diferença entre elas importa:
//  • BLOQUEIO impede um ato (inscrever, convocar, pontuar). Some quando resolvido.
//  • ATENCAO não impede nada hoje, mas vira problema depois (ficha vencendo, dado não verificado).
//  • PROXIMO_PASSO é o que fazer agora, quando não há nada travando.

export type SeveridadeDiagnostico = 'BLOQUEIO' | 'ATENCAO' | 'PROXIMO_PASSO' | 'OK';

export interface ItemDiagnostico {
  codigo: string;
  severidade: SeveridadeDiagnostico;
  titulo: string;
  detalhe: string;
  /** Rótulo da ação sugerida — a interface decide para onde leva. */
  acao?: string;
}

export interface EstadoCadastro {
  temFichaVigente: boolean;
  fichaVencida: boolean;
  fichaVenceEmDias: number | null;
  quantidadePessoas: number;
  membrosCadastrados: number;
  rendaFamiliar: number;
  fonteRendaInformada: boolean;
  nisInformado: boolean;
  nisVerificado: boolean;
  enderecoCompleto: boolean;
  situacaoRisco: boolean;
  temLaudoRisco: boolean;
  vulnerabilidadesMarcadas: number;
  inscricoes: {
    situacao: string;
    pendenciasAbertas: number;
    pontuacaoDesatualizada: boolean;
    temSnapshot: boolean;
  }[];
  programasComInscricaoAberta: number;
}

const DIAS_PARA_AVISAR_VENCIMENTO = 60;

/**
 * Avalia o cadastro e devolve os itens em ordem de urgência.
 *
 * A lista é a mesma para todas as telas: painel da família, tela da inscrição e conferência antes
 * de convocar. Duas telas com regras próprias divergiriam no primeiro ajuste.
 */
export function diagnosticarCadastro(estado: EstadoCadastro): ItemDiagnostico[] {
  const itens: ItemDiagnostico[] = [];

  if (!estado.temFichaVigente) {
    itens.push({
      codigo: 'SEM_FICHA',
      severidade: 'BLOQUEIO',
      titulo: 'Sem ficha social vigente',
      detalhe: 'Sem ficha não há fatos, e sem fatos a família não pode ser inscrita nem pontuada.',
      acao: 'Apurar ficha social',
    });
    return itens;
  }

  if (estado.fichaVencida) {
    itens.push({
      codigo: 'FICHA_VENCIDA',
      severidade: 'BLOQUEIO',
      titulo: 'Ficha social vencida',
      detalhe:
        'A inscrição pode ser baixada no recadastramento enquanto a ficha não for revalidada.',
      acao: 'Nova apuração',
    });
  } else if (
    estado.fichaVenceEmDias !== null &&
    estado.fichaVenceEmDias <= DIAS_PARA_AVISAR_VENCIMENTO
  ) {
    itens.push({
      codigo: 'FICHA_VENCENDO',
      severidade: 'ATENCAO',
      titulo: `Ficha vence em ${estado.fichaVenceEmDias} dias`,
      detalhe: 'Revalidar antes do vencimento evita a baixa automática no recadastramento.',
      acao: 'Nova apuração',
    });
  }

  if (estado.situacaoRisco && !estado.temLaudoRisco) {
    itens.push({
      codigo: 'RISCO_SEM_LAUDO',
      severidade: 'BLOQUEIO',
      titulo: 'Risco declarado sem laudo',
      detalhe:
        'O critério de risco não pontua sem laudo da Defesa Civil — risco é evidência de terceiro, não marcação do servidor.',
      acao: 'Encaminhar à Defesa Civil',
    });
  }

  // O responsável entra na conta: uma família de 4 pessoas precisa de 3 membros além dele.
  const membrosEsperados = Math.max(0, estado.quantidadePessoas - 1);
  if (estado.membrosCadastrados < membrosEsperados) {
    itens.push({
      codigo: 'COMPOSICAO_INCOMPLETA',
      severidade: 'ATENCAO',
      titulo: `Faltam ${membrosEsperados - estado.membrosCadastrados} membros no cadastro`,
      detalhe: `A ficha declara ${estado.quantidadePessoas} pessoas, e há ${estado.membrosCadastrados} cadastradas além do responsável.`,
      acao: 'Cadastrar membros',
    });
  }

  if (estado.rendaFamiliar > 0 && !estado.fonteRendaInformada) {
    itens.push({
      codigo: 'SEM_FONTE_RENDA',
      severidade: 'ATENCAO',
      titulo: 'Renda sem fonte declarada',
      detalhe: 'A origem da renda sustenta a apuração em auditoria.',
      acao: 'Completar ficha',
    });
  }

  if (estado.nisInformado && !estado.nisVerificado) {
    itens.push({
      codigo: 'NIS_NAO_VERIFICADO',
      severidade: 'ATENCAO',
      titulo: 'NIS declarado, não verificado',
      detalhe:
        'O dado não foi conferido na base federal. A pontuação que depende dele carrega essa limitação.',
    });
  }

  if (!estado.enderecoCompleto) {
    itens.push({
      codigo: 'ENDERECO_INCOMPLETO',
      severidade: 'ATENCAO',
      titulo: 'Endereço incompleto',
      detalhe: 'Sem endereço, a visita domiciliar e a Defesa Civil não chegam na casa.',
      acao: 'Completar endereço',
    });
  }

  if (estado.vulnerabilidadesMarcadas === 0) {
    itens.push({
      codigo: 'SEM_VULNERABILIDADE',
      severidade: 'ATENCAO',
      titulo: 'Nenhuma vulnerabilidade marcada',
      detalhe:
        'Se a visita não identificou nenhuma, tudo bem — mas confira: é o campo que alimenta os indicadores do PLHIS.',
    });
  }

  itens.push(...diagnosticarInscricoes(estado));

  return itens.sort((a, b) => ordem(a.severidade) - ordem(b.severidade));
}

function diagnosticarInscricoes(estado: EstadoCadastro): ItemDiagnostico[] {
  const itens: ItemDiagnostico[] = [];

  if (estado.inscricoes.length === 0) {
    itens.push({
      codigo: 'SEM_INSCRICAO',
      severidade: estado.programasComInscricaoAberta > 0 ? 'PROXIMO_PASSO' : 'ATENCAO',
      titulo:
        estado.programasComInscricaoAberta > 0
          ? 'Família pronta para inscrição'
          : 'Sem inscrição e sem programa aberto',
      detalhe:
        estado.programasComInscricaoAberta > 0
          ? `Há ${estado.programasComInscricaoAberta} programa(s) com inscrição aberta.`
          : 'Nenhum programa está recebendo inscrição no momento.',
      acao: estado.programasComInscricaoAberta > 0 ? 'Inscrever em programa' : undefined,
    });
    return itens;
  }

  for (const inscricao of estado.inscricoes) {
    if (inscricao.pendenciasAbertas > 0) {
      itens.push({
        codigo: 'PENDENCIA_ABERTA',
        severidade: 'BLOQUEIO',
        titulo: `${inscricao.pendenciasAbertas} pendência(s) suspendendo a inscrição`,
        detalhe: 'Enquanto houver pendência, a família fica fora da classificação.',
        acao: 'Resolver pendências',
      });
    }
    if (!inscricao.temSnapshot) {
      itens.push({
        codigo: 'SEM_PONTUACAO',
        severidade: 'BLOQUEIO',
        titulo: 'Inscrição sem pontuação calculada',
        detalhe: 'Sem nota congelada, a família não ocupa posição na fila.',
        acao: 'Calcular pontuação',
      });
    } else if (inscricao.pontuacaoDesatualizada) {
      itens.push({
        codigo: 'PONTUACAO_DESATUALIZADA',
        severidade: 'ATENCAO',
        titulo: 'Pontuação anterior à última apuração da ficha',
        detalhe:
          'A ficha mudou depois do último cálculo. Recalcular é ato do gestor — a nota não muda sozinha.',
        acao: 'Recalcular pontuação',
      });
    }
    if (inscricao.situacao === 'APTA' && inscricao.pendenciasAbertas === 0) {
      itens.push({
        codigo: 'APTA',
        severidade: 'OK',
        titulo: 'Concorrendo normalmente',
        detalhe: 'A inscrição está apta e ocupa posição na fila.',
      });
    }
  }

  return itens;
}

const PESO: Record<SeveridadeDiagnostico, number> = {
  BLOQUEIO: 0,
  PROXIMO_PASSO: 1,
  ATENCAO: 2,
  OK: 3,
};

const ordem = (severidade: SeveridadeDiagnostico): number => PESO[severidade];

/** Resumo de uma linha para cabeçalho de tela. */
export function resumirDiagnostico(itens: ItemDiagnostico[]): {
  bloqueios: number;
  atencoes: number;
  proximoPasso: ItemDiagnostico | undefined;
} {
  return {
    bloqueios: itens.filter((item) => item.severidade === 'BLOQUEIO').length,
    atencoes: itens.filter((item) => item.severidade === 'ATENCAO').length,
    proximoPasso: itens.find((item) => item.severidade === 'PROXIMO_PASSO'),
  };
}
