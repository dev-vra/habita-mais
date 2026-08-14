export interface DadosOficio {
  municipio: string;
  uf: string;
  orgao: string;
  numeroOficio: string;
  emitidaEm: Date;
  responsavel: string;
  protocolo: string;
  programa: string;
  posicao: number | null;
  pontuacao: number | null;
  prazoComparecimentoAte: Date;
  foraDeOrdem: boolean;
  motivoExcecao: string | null;
  signatario: { nome: string; cargo: string } | null;
  urlValidacao: string;
  qrDataUrl: string;
}

const formatarData = (data: Date): string => data.toLocaleDateString('pt-BR');

const porExtenso = (data: Date): string =>
  data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Ofício de convocação.
 *
 * O documento diz por que esta família foi chamada — posição, nota e critério —, porque é isso
 * que o transforma de aviso em ato administrativo motivado. Quando a chamada é fora de ordem, o
 * motivo aparece no corpo do ofício, e não em nota de rodapé: a exceção é publicada, não escondida.
 */
export function oficioConvocacaoHtml(dados: DadosOficio): string {
  const chamadaOrdem = dados.foraDeOrdem
    ? `<p class="excecao"><strong>Convocação fora da ordem de classificação.</strong> Motivo: ${escapar(
        dados.motivoExcecao ?? '',
      )}</p>`
    : dados.posicao
      ? `<p>Sua inscrição ocupa a <strong>${dados.posicao}ª posição</strong> na classificação publicada${
          dados.pontuacao !== null ? `, com <strong>${dados.pontuacao} pontos</strong>` : ''
        }.</p>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: system-ui, sans-serif; color: #1c1f1e; font-size: 11.5pt; line-height: 1.55; }
  header { text-align: center; border-bottom: 2px solid #1b4d40; padding-bottom: 10px; }
  header h1 { font-size: 13pt; margin: 0; color: #1b4d40; text-transform: uppercase; }
  header p { margin: 2px 0 0; font-size: 10pt; color: #4e5b57; }
  .numero { margin-top: 22px; font-weight: 700; }
  .destinatario { margin-top: 18px; }
  .excecao { border-left: 3px solid #8a6100; background: #fff8e1; padding: 8px 12px; }
  .prazo { border: 1px solid #d9e0dd; padding: 10px 14px; margin-top: 14px; }
  .assinatura { margin-top: 54px; text-align: center; }
  .assinatura .linha { border-top: 1px solid #1c1f1e; width: 62%; margin: 0 auto 4px; }
  footer { margin-top: 40px; border-top: 1px solid #d9e0dd; padding-top: 10px;
           font-size: 8.5pt; color: #4e5b57; display: flex; gap: 12px; align-items: center; }
  footer img { width: 74px; height: 74px; }
</style>
</head>
<body>
  <header>
    <h1>${escapar(dados.orgao)}</h1>
    <p>${escapar(dados.municipio)} — ${escapar(dados.uf)}</p>
  </header>

  <p class="numero">Ofício ${escapar(dados.numeroOficio)}</p>
  <p>${escapar(dados.municipio)}, ${porExtenso(dados.emitidaEm)}.</p>

  <div class="destinatario">
    <p>À senhora<br /><strong>${escapar(dados.responsavel)}</strong><br />
    Protocolo ${escapar(dados.protocolo)}</p>
  </div>

  <p><strong>Assunto:</strong> convocação para atendimento — ${escapar(dados.programa)}.</p>

  <p>Prezada senhora,</p>

  <p>Comunicamos que sua família foi convocada para atendimento no âmbito do programa
  <strong>${escapar(dados.programa)}</strong>.</p>

  ${chamadaOrdem}

  <div class="prazo">
    <p style="margin:0"><strong>Compareça até ${formatarData(dados.prazoComparecimentoAte)}</strong>
    à Secretaria de Habitação, portando documento de identidade, CPF e comprovantes de renda
    atualizados.</p>
  </div>

  <p>O comparecimento é condição para a análise final. A ausência sem justificativa dentro do prazo
  implica o retorno da inscrição à fila, com registro do motivo, e a convocação da próxima família
  classificada.</p>

  <p>Estar convocada não garante, por si só, a contemplação: a elegibilidade é reconferida no
  atendimento, com base nos dados apresentados.</p>

  <div class="assinatura">
    <div class="linha"></div>
    <p style="margin:0"><strong>${escapar(dados.signatario?.nome ?? '')}</strong><br />
    ${escapar(dados.signatario?.cargo ?? '')}</p>
  </div>

  <footer>
    <img src="${dados.qrDataUrl}" alt="QR code de validação" />
    <span>
      Documento emitido eletronicamente pelo Habita+. Para conferir a autenticidade, leia o QR ao
      lado — ele carrega a assinatura do documento, longa demais para ser digitada.<br />
      Emitido em ${formatarData(dados.emitidaEm)} · ${escapar(dados.numeroOficio)}.
    </span>
  </footer>
</body>
</html>`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
