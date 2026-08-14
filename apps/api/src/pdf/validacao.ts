import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Comprovante de autenticidade do documento: um payload assinado, embutido no próprio QR.
 *
 * A primeira versão consultava o banco na validação — e esbarrou na RLS, com razão: a esfera de
 * plataforma não tem bypass em dado de família, e abrir uma policy pública para atender um QR
 * seria furar o isolamento por conveniência. O documento passou a carregar a própria prova.
 *
 * O payload contém apenas o que já está impresso no papel. Quem valida confere se o papel saiu
 * deste sistema e se o conteúdo bate — não consulta a situação atual da família, que é dado dela.
 */
export interface ComprovanteDocumento {
  tipo: 'convocacao';
  id: string;
  numeroOficio: string;
  protocolo: string;
  programa: string;
  emitidoEm: string;
  prazoAte: string;
  foraDeOrdem: boolean;
  municipio: string;
}

function assinatura(corpo: string): string {
  const segredo = process.env.JWT_ACCESS_SECRET ?? '';
  return createHmac('sha256', segredo).update(corpo).digest('base64url');
}

export function assinarComprovante(dados: ComprovanteDocumento): string {
  const corpo = Buffer.from(JSON.stringify(dados)).toString('base64url');
  return `${corpo}.${assinatura(corpo)}`;
}

/** Devolve o comprovante se a assinatura confere, ou null. Nunca lança: entrada é pública. */
export function lerComprovante(token: string): ComprovanteDocumento | null {
  const [corpo, apresentada] = token.split('.');
  if (!corpo || !apresentada) return null;

  const esperada = Buffer.from(assinatura(corpo));
  const recebida = Buffer.from(apresentada);
  // Tempo constante: comparar com === vazaria o prefixo correto por timing.
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    return JSON.parse(Buffer.from(corpo, 'base64url').toString()) as ComprovanteDocumento;
  } catch {
    return null;
  }
}
