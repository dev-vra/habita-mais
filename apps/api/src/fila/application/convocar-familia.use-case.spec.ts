import { BadRequestException } from '@nestjs/common';
import type { FatosFamilia } from '@habita/shared/habitacao';
import { ConvocarFamiliaUseCase } from './convocar-familia.use-case';
import type {
  ConvocacoesRepository,
  GeradorProtocolo,
  InscricoesRepository,
  TrilhaAuditoria,
} from '../domain/ports';
import type { InscricaoParaCalculo } from '../domain/tipos';

const FATOS: FatosFamilia = {
  rendaPerCapita: 218,
  mesesResidenciaMunicipio: 168,
  mesesInscricao: 40,
  quantidadeMenores: 3,
  temPessoaComDeficiencia: false,
  temIdoso: false,
  mulherChefeFamilia: true,
  moradiaInadequada: true,
  situacaoRisco: false,
  laudoRiscoRegistrado: false,
};

const MOTIVO_VALIDO = 'Remoção determinada pela Defesa Civil no Córrego Formoso, laudo 118/2026.';

function montar(situacao: string) {
  const inscricao: InscricaoParaCalculo = {
    id: 'insc-1',
    protocolo: 'HAB-2026/00418',
    familiaId: 'fam-1',
    situacao: situacao as InscricaoParaCalculo['situacao'],
    inscritaEm: new Date('2023-03-14'),
    fatos: FATOS,
    mesesResidenciaMunicipio: 168,
    pontuacaoVigente: 97,
  };

  const inscricoes: Partial<InscricoesRepository> = {
    buscarParaCalculo: jest.fn().mockResolvedValue(inscricao),
    atualizarSituacao: jest.fn(),
  };
  const convocacoes: Partial<ConvocacoesRepository> = {
    criarConvocacao: jest
      .fn()
      .mockResolvedValue({ id: 'conv-1', inscricaoId: 'insc-1', desfecho: null }),
  };
  const protocolos: GeradorProtocolo = { proximo: jest.fn().mockResolvedValue('OFC-2026/00001') };
  const trilha: TrilhaAuditoria = { registrar: jest.fn() };

  const useCase = new ConvocarFamiliaUseCase(
    inscricoes as InscricoesRepository,
    convocacoes as ConvocacoesRepository,
    protocolos,
    trilha,
  );

  return { useCase, inscricoes, convocacoes, trilha };
}

const ENTRADA_BASE = {
  inscricaoId: 'insc-1',
  prazoComparecimentoAte: new Date('2026-08-25'),
  agora: new Date('2026-08-13'),
};

describe('ConvocarFamiliaUseCase', () => {
  it('convoca quem está apta e move a inscrição para CONVOCADA', async () => {
    const { useCase, inscricoes } = montar('APTA');

    const saida = await useCase.executar({ ...ENTRADA_BASE, foraDeOrdem: false });

    expect(saida.numeroOficio).toBe('OFC-2026/00001');
    expect(inscricoes.atualizarSituacao).toHaveBeenCalledWith('insc-1', 'CONVOCADA');
  });

  it('recusa convocar quem está com pendência', async () => {
    const { useCase } = montar('PENDENTE');

    await expect(useCase.executar({ ...ENTRADA_BASE, foraDeOrdem: false })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('exige motivo fundamentado na convocação fora de ordem', async () => {
    const { useCase } = montar('APTA');

    await expect(
      useCase.executar({ ...ENTRADA_BASE, foraDeOrdem: true, motivoExcecao: 'urgente' }),
    ).rejects.toThrow(/motivo fundamentado/);
  });

  it('registra a exceção na trilha com o motivo, para publicar junto ao ranking', async () => {
    const { useCase, trilha } = montar('APTA');

    await useCase.executar({ ...ENTRADA_BASE, foraDeOrdem: true, motivoExcecao: MOTIVO_VALIDO });

    expect(trilha.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        diff: expect.objectContaining({ foraDeOrdem: true, motivoExcecao: MOTIVO_VALIDO }),
      }),
    );
  });

  it('não guarda motivo de exceção quando a convocação é em ordem', async () => {
    const { useCase, convocacoes } = montar('APTA');

    await useCase.executar({ ...ENTRADA_BASE, foraDeOrdem: false, motivoExcecao: MOTIVO_VALIDO });

    expect(convocacoes.criarConvocacao).toHaveBeenCalledWith(
      expect.objectContaining({ foraDeOrdem: false, motivoExcecao: undefined }),
    );
  });
});
