import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AssistenteUseCase } from '../application/assistente.use-case';

/** Tipos que o modelo consegue ler. Planilha e texto não passam por aqui. */
const MIDIAS_ACEITAS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
/** Teto de tamanho do que é enviado ao modelo. Acima disso, o servidor digita — sai mais barato. */
const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024;

/**
 * Extração de dados do documento anexado.
 *
 * O arquivo vem do storage pelo servidor: a chave nunca circula, e o modelo recebe o conteúdo sem
 * saber de que família é. O que volta é proposta — a tela mostra ao lado do documento aberto no
 * visualizador, e quem confere decide o que gravar.
 */
@Injectable()
export class ExtracaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly assistente: AssistenteUseCase,
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

    const resultado = await this.assistente.extrairDocumento({
      documentoId: documento.id,
      tipoDocumento: documento.tipo.nome,
      campos,
      midia: documento.mimeType,
      dados: Buffer.from(corpo).toString('base64'),
    });

    return { ...resultado, campos: interpretar(resultado.texto) };
  }
}

/**
 * O modelo foi instruído a devolver só JSON, mas modelo é modelo: às vezes vem com cerca de
 * markdown em volta. Falhar aqui devolveria erro ao servidor por um detalhe de formatação — melhor
 * tentar limpar, e devolver campos vazios se ainda assim não der.
 */
function interpretar(texto: string): Record<string, string | null> {
  const limpo = texto
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

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
