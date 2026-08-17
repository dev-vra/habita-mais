import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AssistenteUseCase } from '../application/assistente.use-case';
import { OcrService, extrairPorPadrao } from './ocr.service';

/** Tipos que dá para ler. Planilha e texto não passam por aqui. */
const MIDIAS_ACEITAS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
/** Teto do que é enviado ao modelo. Acima disso o servidor digita — sai mais barato. */
const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024;

export type OrigemExtracao = 'OCR_LOCAL' | 'CACHE' | 'IA_SOBRE_TEXTO' | 'IA_SOBRE_IMAGEM';

/**
 * Extração de dados do documento anexado, em três degraus de custo.
 *
 * 1. OCR local (Tesseract). Se o texto sai limpo e todos os campos pedidos têm formato fixo —
 *    CPF, CEP, data, valor — acaba aqui, sem gastar chamada de IA. É o caso da maioria dos
 *    documentos do balcão: são impressos, com fonte limpa.
 * 2. Modelo sobre o TEXTO do OCR. Quando o texto presta mas os campos exigem entender o
 *    documento (nome, endereço), manda-se o texto — que custa uma fração do que custa a imagem.
 * 3. Modelo sobre a imagem. Só quando o OCR falhou ou o texto saiu ruído: foto torta, documento
 *    manuscrito, papel amassado.
 *
 * O arquivo vem do storage pelo servidor: a chave nunca circula, e o que volta é proposta — a
 * tela mostra ao lado do documento aberto no visualizador, e quem confere decide o que gravar.
 */
@Injectable()
export class ExtracaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly assistente: AssistenteUseCase,
    private readonly ocr: OcrService,
  ) {}

  async doDocumento(documentoId: string, campos: string[]) {
    const documento = await this.prisma.tx.documento.findUnique({
      where: { id: documentoId },
      select: {
        id: true,
        arquivoKey: true,
        mimeType: true,
        tamanho: true,
        tipo: { select: { nome: true } },
      },
    });

    if (!documento) throw new NotFoundException('Documento não encontrado.');

    if (!MIDIAS_ACEITAS.includes(documento.mimeType)) {
      throw new BadRequestException(
        `Não é possível ler ${documento.mimeType}. Envie PDF ou foto do documento.`,
      );
    }
    if (documento.tamanho > TAMANHO_MAXIMO_BYTES) {
      throw new BadRequestException(
        'Arquivo grande demais para leitura automática. Preencha os campos à mão.',
      );
    }

    const { corpo } = await this.storage.baixar(documento.arquivoKey);
    const bytes = Buffer.from(corpo);

    // PDF não passa pelo Tesseract — ele lê imagem. Vai direto ao modelo, que lê PDF nativamente.
    const leitura =
      documento.mimeType === 'application/pdf' ? null : await this.ocr.ler(bytes);

    // Basta o texto ser legível: quem decide é o dígito verificador do campo, não a média do OCR.
    if (leitura?.aproveitavel) {
      const local = extrairPorPadrao(leitura.texto, campos);

      if (local.completa) {
        return {
          origem: 'OCR_LOCAL' as OrigemExtracao,
          campos: local.campos,
          confiancaOcr: leitura.confianca,
          sugestaoId: null,
          texto: null,
          // Sem chamada de IA: não há sugestão a registrar, e nada saiu do produto.
          aviso: {
            titulo: 'Lido no próprio sistema',
            texto:
              'Os campos foram reconhecidos pelo leitor local, sem enviar o documento a serviço externo. Confira contra o papel antes de gravar.',
          },
        };
      }
    }

    // Já lemos este documento antes? Conferência é retomada várias vezes — pelo mesmo servidor
    // que voltou à tela, ou por outro que assumiu o processo. Pagar de novo pela mesma leitura do
    // mesmo papel é desperdício puro.
    const anterior = await this.leituraAnterior(documento.id, campos);
    if (anterior) return anterior;

    const textoAproveitavel = leitura?.aproveitavel ? leitura.texto : undefined;

    const resultado = await this.assistente.extrairDocumento({
      documentoId: documento.id,
      tipoDocumento: documento.tipo.nome,
      campos,
      // Com texto legível, o modelo estrutura sem ver a imagem — muito mais barato por documento.
      textoOcr: textoAproveitavel,
      midia: textoAproveitavel ? undefined : documento.mimeType,
      dados: textoAproveitavel ? undefined : bytes.toString('base64'),
    });

    return {
      ...resultado,
      origem: (textoAproveitavel ? 'IA_SOBRE_TEXTO' : 'IA_SOBRE_IMAGEM') as OrigemExtracao,
      confiancaOcr: leitura?.confianca ?? null,
      campos: interpretar(resultado.texto),
    };
  }

  /** Última extração do mesmo documento que já resolveu todos os campos pedidos agora. */
  private async leituraAnterior(documentoId: string, campos: string[]) {
    const sugestao = await this.prisma.tx.sugestaoIA.findFirst({
      where: { uso: 'EXTRACAO_DOCUMENTO', entidade: 'Documento', entidadeId: documentoId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, respostaBruta: true, modelo: true },
    });

    if (!sugestao) return null;

    const lidos = interpretar(sugestao.respostaBruta);
    const cobreTudo = campos.every((campo) => lidos[campo] !== undefined);
    if (!cobreTudo) return null;

    return {
      sugestaoId: sugestao.id,
      texto: sugestao.respostaBruta,
      modelo: sugestao.modelo,
      origem: 'CACHE' as OrigemExtracao,
      confiancaOcr: null,
      campos: lidos,
      aviso: {
        titulo: 'Leitura já feita antes',
        texto:
          'Estes campos vieram de uma leitura anterior do mesmo documento. Confira contra o papel antes de gravar.',
      },
    };
  }
}

/**
 * O modelo foi instruído a devolver só JSON, mas modelo é modelo: às vezes vem com cerca de
 * markdown em volta. Falhar aqui devolveria erro ao servidor por um detalhe de formatação — melhor
 * limpar, e devolver vazio se ainda assim não der.
 */
function interpretar(texto: string): Record<string, string | null> {
  // Recorta o primeiro objeto do texto em vez de exigir que a resposta inteira seja JSON: o
  // modelo às vezes embrulha em cerca de markdown ou antecede com uma frase, e devolver vazio
  // por causa disso jogaria fora uma leitura correta.
  const limpo = (/\{[\s\S]*\}/.exec(texto)?.[0] ?? texto).trim();

  try {
    const objeto = JSON.parse(limpo) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(objeto).map(([chave, valor]) => [
        chave,
        valor === null || valor === undefined ? null : String(valor),
      ]),
    );
  } catch {
    return {};
  }
}
