import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  CATEGORIAS,
  StorageService,
  type ArquivoRecebido,
  type CategoriaArquivo,
} from './storage.service';

@Controller('arquivos')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('arquivo'))
  async enviar(
    @UploadedFile() arquivo: ArquivoRecebido | undefined,
    @Query('categoria') categoria: string,
  ) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!CATEGORIAS.includes(categoria as CategoriaArquivo)) {
      throw new BadRequestException(`Categoria inválida. Use uma de: ${CATEGORIAS.join(', ')}.`);
    }

    return this.storage.enviar(categoria as CategoriaArquivo, arquivo);
  }

  /**
   * Download pelo BFF, sem URL assinada: o arquivo passa pelo servidor, que já sabe quem é o
   * usuário. Link assinado vazaria acesso a quem o repassasse, e um laudo social não deve ser
   * compartilhável por link solto.
   */
  // Wildcard nomeado do path-to-regexp 8 (Express 5): a chave tem barras, então precisa
  // capturar o resto do caminho.
  @Get('*key')
  async baixar(@Param('key') key: string[] | string, @Res() res: Response) {
    const caminho = Array.isArray(key) ? key.join('/') : key;
    const { corpo, tipo } = await this.storage.baixar(caminho);

    res.setHeader('Content-Type', tipo);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(Buffer.from(corpo));
  }
}
