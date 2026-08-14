import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface CorpoErro {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Formato único de erro em toda a API. Exceção desconhecida nunca vaza mensagem crua nem stack —
 * isso fica no log do servidor, e o cliente recebe um 500 genérico.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, message, error } = this.resolver(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const corpo: CorpoErro = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(status).json(corpo);
  }

  private resolver(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const corpo = exception.getResponse();
      if (typeof corpo === 'string') return { status, message: corpo, error: exception.name };

      const { message, error } = corpo as { message?: string | string[]; error?: string };
      return { status, message: message ?? exception.message, error: error ?? exception.name };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
      error: 'Internal Server Error',
    };
  }
}
