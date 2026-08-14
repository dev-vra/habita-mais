import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getActiveContext } from '../context/request-context';

/** Categorias válidas — cada uma vira um prefixo, e o resto do caminho é gerado, nunca recebido. */
export const CATEGORIAS = ['laudos', 'visitas', 'pendencias', 'regulamentos', 'oficios'] as const;
export type CategoriaArquivo = (typeof CATEGORIAS)[number];

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

export interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Object storage S3-compatível (MinIO em dev).
 *
 * A chave sempre começa pelo tenant — `tenant/<id>/<categoria>/<uuid>.<ext>`. Isso dá isolamento
 * no bucket e, mais importante, torna verificável no download: uma chave que não começa pelo
 * tenant do contexto é recusada antes de qualquer leitura, então adivinhar caminho não basta.
 *
 * O nome original NÃO entra na chave: nome de arquivo carrega dado pessoal com frequência
 * ("laudo-maria-cpf.pdf") e viraria vazamento em qualquer log de acesso.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly cliente: S3Client;
  private readonly bucket = process.env.MINIO_BUCKET ?? 'habita';

  constructor() {
    this.cliente = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9310',
      region: process.env.AWS_REGION ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER ?? 'habita',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? '',
      },
    });
  }

  /** Cria o bucket se não existir — em dev, evita um passo manual entre clonar e usar. */
  async onModuleInit(): Promise<void> {
    try {
      await this.cliente.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.cliente.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async enviar(categoria: CategoriaArquivo, arquivo: ArquivoRecebido): Promise<{ key: string }> {
    this.validar(arquivo);

    const { tenantId } = getActiveContext();
    if (!tenantId) throw new BadRequestException('Envio de arquivo exige tenant no contexto.');

    const extensao = EXTENSOES[arquivo.mimetype] ?? 'bin';
    const key = `tenant/${tenantId}/${categoria}/${randomUUID()}.${extensao}`;

    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: arquivo.buffer,
        ContentType: arquivo.mimetype,
      }),
    );

    return { key };
  }

  async baixar(key: string): Promise<{ corpo: Uint8Array; tipo: string }> {
    const { tenantId } = getActiveContext();
    if (!tenantId || !key.startsWith(`tenant/${tenantId}/`)) {
      throw new BadRequestException('Arquivo fora do escopo desta prefeitura.');
    }

    const resposta = await this.cliente.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const corpo = await resposta.Body?.transformToByteArray();
    if (!corpo) throw new BadRequestException('Arquivo não encontrado.');

    return { corpo, tipo: resposta.ContentType ?? 'application/octet-stream' };
  }

  private validar(arquivo: ArquivoRecebido): void {
    if (!TIPOS_ACEITOS.includes(arquivo.mimetype)) {
      throw new BadRequestException('Formato não aceito. Envie PDF, JPG, PNG ou WebP.');
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      throw new BadRequestException('Arquivo acima de 10 MB.');
    }
  }
}

const EXTENSOES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
