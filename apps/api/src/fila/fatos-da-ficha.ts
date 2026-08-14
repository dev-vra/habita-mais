import type { FichaSocial } from '@prisma/client';
import type { FatosFamilia } from '@habita/shared/habitacao';

const MESES_POR_ANO = 12;

/**
 * Traduz a ficha social vigente nos fatos objetivos que o motor de pontuação consome.
 *
 * É o único ponto onde o banco vira entrada de cálculo — e é de propósito: a nota precisa ser
 * explicável a partir de campos concretos da ficha, não de leitura interpretativa de um servidor.
 * O snapshot guarda o retorno desta função junto com a nota, para que a conta continue
 * reproduzível mesmo depois de a ficha ser atualizada.
 */
export function fatosDaFicha(
  ficha: FichaSocial,
  referencia: { inscritaEm: Date; agora: Date },
): FatosFamilia {
  return {
    rendaPerCapita: Number(ficha.rendaPerCapita),
    mesesResidenciaMunicipio: ficha.mesesResidenciaMunicipio,
    mesesInscricao: mesesEntre(referencia.inscritaEm, referencia.agora),
    quantidadeMenores: ficha.quantidadeMenores,
    temPessoaComDeficiencia: ficha.temPessoaComDeficiencia,
    temIdoso: ficha.temIdoso,
    mulherChefeFamilia: ficha.mulherChefeFamilia,
    moradiaInadequada: ficha.moradiaInadequada,
    situacaoRisco: ficha.situacaoRisco,
    // A evidência é o laudo anexado, não a marcação do servidor.
    laudoRiscoRegistrado: Boolean(ficha.laudoRiscoKey),
  };
}

export function mesesEntre(inicio: Date, fim: Date): number {
  const anos = fim.getFullYear() - inicio.getFullYear();
  const meses = fim.getMonth() - inicio.getMonth();
  const ajusteDoDia = fim.getDate() < inicio.getDate() ? -1 : 0;
  return Math.max(0, anos * MESES_POR_ANO + meses + ajusteDoDia);
}
