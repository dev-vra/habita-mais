import type { FatosFamilia } from '@habita/shared/habitacao';
import { RecalcularPontuacaoUseCase } from './recalcular-pontuacao.use-case';
import type { InscricoesRepository, ProgramasRepository, TrilhaAuditoria } from '../domain/ports';
import type { InscricaoParaCalculo, SnapshotParaGravar } from '../domain/tipos';

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

function inscricao(id: string, situacao: string): InscricaoParaCalculo {
  return {
    id,
    protocolo: `HAB-2026/${id}`,
    familiaId: `fam-${id}`,
    situacao: situacao as InscricaoParaCalculo['situacao'],
    inscritaEm: new Date('2023-03-14'),
    fatos: FATOS,
    mesesResidenciaMunicipio: 168,
    pontuacaoVigente: 70,
  };
}

describe('RecalcularPontuacaoUseCase', () => {
  const versao = {
    id: 'versao-3',
    versao: 3,
    publicadoEm: '2026-01-10T12:00:00.000Z',
    criterios: [
      {
        codigo: 'MULHER_CHEFE_FAMILIA',
        rotulo: 'Mulher chefe de família',
        tipo: 'FLAG' as const,
        peso: 10,
        fonte: 'mulherChefeFamilia' as const,
      },
    ],
  };

  let snapshotsGravados: SnapshotParaGravar[];
  let useCase: RecalcularPontuacaoUseCase;

  beforeEach(() => {
    snapshotsGravados = [];

    const programas: ProgramasRepository = {
      buscarPorId: jest.fn(),
      versaoPublicada: jest.fn().mockResolvedValue(versao),
    };

    const inscricoes: Partial<InscricoesRepository> = {
      listarParaCalculo: jest.fn().mockResolvedValue([
        inscricao('00001', 'APTA'),
        inscricao('00002', 'CONVOCADA'),
        inscricao('00003', 'CONTEMPLADA'),
        inscricao('00004', 'PENDENTE'),
        inscricao('00005', 'DESISTENTE'),
      ]),
      registrarSnapshot: jest.fn(async (snapshot: SnapshotParaGravar) => {
        snapshotsGravados.push(snapshot);
        return { id: 'snap', total: snapshot.total };
      }),
    };

    const trilha: TrilhaAuditoria = { registrar: jest.fn() };

    useCase = new RecalcularPontuacaoUseCase(
      programas,
      inscricoes as InscricoesRepository,
      trilha,
    );
  });

  it('recalcula quem ainda concorre e preserva quem já foi chamada', async () => {
    const resultados = await useCase.programaInteiro('programa-1', new Date('2026-08-05'));

    const protocolosRecalculados = snapshotsGravados.map((snapshot) => snapshot.inscricaoId);
    expect(protocolosRecalculados).toEqual(['00001', '00004']);
    expect(resultados).toHaveLength(2);
  });

  it('marca o motivo do cálculo como recálculo em lote', async () => {
    await useCase.programaInteiro('programa-1', new Date('2026-08-05'));

    expect(snapshotsGravados.every((snapshot) => snapshot.motivo === 'RECALCULO_LOTE')).toBe(true);
  });

  it('registra na trilha quantas foram recalculadas e quantas ficaram intocadas', async () => {
    const trilha = { registrar: jest.fn() };
    const programas: ProgramasRepository = {
      buscarPorId: jest.fn(),
      versaoPublicada: jest.fn().mockResolvedValue(versao),
    };
    const inscricoes: Partial<InscricoesRepository> = {
      listarParaCalculo: jest
        .fn()
        .mockResolvedValue([inscricao('00001', 'APTA'), inscricao('00002', 'CONVOCADA')]),
      registrarSnapshot: jest.fn().mockResolvedValue({ id: 'snap', total: 10 }),
    };

    await new RecalcularPontuacaoUseCase(
      programas,
      inscricoes as InscricoesRepository,
      trilha,
    ).programaInteiro('programa-1', new Date('2026-08-05'));

    expect(trilha.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        diff: expect.objectContaining({ recalculadas: 1, preservadas: 1 }),
      }),
    );
  });
});
