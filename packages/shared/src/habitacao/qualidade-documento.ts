// Aferição da qualidade do documento no momento do envio.
//
// O problema que isto resolve é de fila, não de tecnologia: a foto ilegível só é descoberta na
// conferência, dias depois, quando a família já foi embora. Aí alguém liga, pede de novo, e o
// processo para por duas semanas por causa de uma foto tremida.
//
// Nada aqui usa IA. São medidas do próprio arquivo — e é de propósito: barrar upload ruim precisa
// ser instantâneo, gratuito e igual para todo mundo.

export type NivelQualidade = 'BOA' | 'ACEITAVEL' | 'RUIM';

export interface MedidasArquivo {
  mimeType: string;
  /** Bytes. Arquivo minúsculo costuma ser recorte de tela ou foto muito comprimida. */
  tamanho: number;
  largura?: number;
  altura?: number;
  /** Confiança média do OCR, 0 a 100. Ausente quando não se leu (PDF, por exemplo). */
  confiancaOcr?: number;
  /** Quantidade de caracteres reconhecidos. Página em branco lê pouco. */
  caracteresLidos?: number;
}

export interface ProblemaQualidade {
  codigo: string;
  mensagem: string;
  /** Impede o envio, ou é só um alerta? Bloquear demais faz a pessoa desistir do sistema. */
  bloqueia: boolean;
}

export interface AvaliacaoQualidade {
  nivel: NivelQualidade;
  problemas: ProblemaQualidade[];
  /** Pode anexar assim mesmo? Só o que é ilegível de fato barra. */
  aceitavel: boolean;
  /** O que dizer a quem está com o celular na mão. */
  orientacao: string;
}

/** Abaixo disto, texto de documento fotografado sai serrilhado e o conferente força a vista. */
const LARGURA_MINIMA = 1000;
const LARGURA_CONFORTAVEL = 1600;
/** Foto de documento abaixo de 80 KB quase sempre perdeu o texto na compressão. */
const TAMANHO_MINIMO_BYTES = 80 * 1024;
/** OCR abaixo disso não reconheceu quase nada: ou está borrado, ou é papel amassado, ou está escuro. */
const OCR_ILEGIVEL = 35;
const OCR_SOFRIVEL = 60;
/** Documento que produz menos de 40 caracteres provavelmente não é documento. */
const CARACTERES_MINIMOS = 40;

/**
 * Diz se dá para conferir este documento.
 *
 * A régua é o olho de quem vai ler no balcão, não a perfeição técnica: comprovante amassado com
 * texto legível passa; foto tremida onde não se lê o CPF, não. Na dúvida, aceita com alerta — o
 * custo de barrar indevidamente é a família voltar outro dia.
 */
export function aferirQualidade(medidas: MedidasArquivo): AvaliacaoQualidade {
  const problemas: ProblemaQualidade[] = [];
  const ehImagem = medidas.mimeType.startsWith('image/');

  if (ehImagem) {
    const menorLado = Math.min(medidas.largura ?? 0, medidas.altura ?? 0);
    const maiorLado = Math.max(medidas.largura ?? 0, medidas.altura ?? 0);

    if (maiorLado > 0 && maiorLado < LARGURA_MINIMA) {
      problemas.push({
        codigo: 'RESOLUCAO_BAIXA',
        mensagem: `Imagem de ${medidas.largura}×${medidas.altura}. Abaixo de ${LARGURA_MINIMA} px o texto costuma ficar ilegível.`,
        bloqueia: true,
      });
    } else if (maiorLado > 0 && maiorLado < LARGURA_CONFORTAVEL) {
      problemas.push({
        codigo: 'RESOLUCAO_JUSTA',
        mensagem: 'Resolução no limite. Se o texto miúdo não estiver nítido, refaça mais perto.',
        bloqueia: false,
      });
    }

    if (medidas.tamanho < TAMANHO_MINIMO_BYTES) {
      problemas.push({
        codigo: 'ARQUIVO_MUITO_COMPRIMIDO',
        mensagem:
          'Arquivo muito pequeno para uma foto de documento — costuma ser captura de tela ou imagem muito comprimida.',
        bloqueia: false,
      });
    }

    if (menorLado > 0 && maiorLado / menorLado > 3) {
      problemas.push({
        codigo: 'ENQUADRAMENTO_ESTRANHO',
        mensagem: 'A imagem está muito alongada. Confira se o documento inteiro está na foto.',
        bloqueia: false,
      });
    }
  }

  if (medidas.confiancaOcr !== undefined) {
    if (medidas.confiancaOcr < OCR_ILEGIVEL) {
      problemas.push({
        codigo: 'TEXTO_ILEGIVEL',
        mensagem:
          'Quase nenhum texto foi reconhecido. Provavelmente está tremido, escuro ou fora de foco.',
        bloqueia: true,
      });
    } else if (medidas.confiancaOcr < OCR_SOFRIVEL) {
      problemas.push({
        codigo: 'TEXTO_DUVIDOSO',
        mensagem: 'A leitura saiu com falhas. Confira se todo o documento está nítido.',
        bloqueia: false,
      });
    }
  }

  if (
    medidas.caracteresLidos !== undefined &&
    medidas.caracteresLidos < CARACTERES_MINIMOS &&
    ehImagem
  ) {
    problemas.push({
      codigo: 'SEM_TEXTO',
      mensagem: 'Nenhum texto foi encontrado. Confira se enviou a página certa.',
      bloqueia: true,
    });
  }

  const bloqueia = problemas.some((problema) => problema.bloqueia);
  const nivel: NivelQualidade = bloqueia ? 'RUIM' : problemas.length > 0 ? 'ACEITAVEL' : 'BOA';

  return {
    nivel,
    problemas,
    aceitavel: !bloqueia,
    orientacao: ORIENTACOES[nivel],
  };
}

const ORIENTACOES: Record<NivelQualidade, string> = {
  BOA: 'Documento legível.',
  ACEITAVEL: 'Dá para conferir, mas veja os avisos antes de anexar.',
  RUIM: 'Refaça a foto: apoie o documento numa superfície plana, com boa luz, e enquadre só ele.',
};
