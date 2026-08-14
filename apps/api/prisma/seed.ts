/* eslint-disable no-console -- script de linha de comando: a saída no terminal É a interface. */
/**
 * Seed de desenvolvimento: uma prefeitura, os perfis do §5, um programa com critério publicado e
 * oito famílias na fila — o suficiente para ver a tela-âncora do produto com dado plausível.
 *
 * Idempotente: roda quantas vezes quiser. Chaves naturais (CNPJ, e-mail, slug, código da família,
 * protocolo) evitam duplicar, e as pontuações são recalculadas pelo motor de verdade — o mesmo
 * que a API usa, para o seed nunca "inventar" nota que o produto não produziria.
 *
 * Dados fictícios. Nomes vêm das maquetes do caderno de identidade.
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EsferaUsuario,
  MotivoCalculo,
  PerfilTenant,
  PrismaClient,
  Saneamento,
  Sexo,
  SituacaoInscricao,
  SituacaoPrograma,
  SituacaoVersaoCriterio,
  TipoConstrucao,
  TipoMoradia,
  type Prisma,
} from '@prisma/client';
import { habitacao } from '@habita/shared';
import { fatosDaFicha } from '../src/fila/fatos-da-ficha';

const SENHA_PADRAO = 'Habita+Dev2026!';
const SALARIO_MINIMO_REFERENCIA = 1600;
const AGORA = new Date('2026-08-13T12:00:00.000Z');
const SISTEMA = 'seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Mesmo mecanismo do runtime: com FORCE RLS, nem o owner escapa de declarar o contexto. */
async function comContexto<T>(
  ctx: { tenantId?: string; isPlatform?: boolean },
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${ctx.tenantId ?? ''}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_platform', ${ctx.isPlatform ? 'true' : 'false'}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_familia', '', true)`;
    return work(tx);
  });
}

interface FamiliaSemente {
  codigo: string;
  protocolo: string;
  responsavel: { nome: string; cpf: string; nascimento: string; sexo: Sexo; deficiencia?: boolean };
  inscritaEm: string;
  situacao: SituacaoInscricao;
  ficha: {
    rendaFamiliar: number;
    pessoas: number;
    quantidadeMenores: number;
    mesesResidenciaMunicipio: number;
    mulherChefeFamilia: boolean;
    temPessoaComDeficiencia: boolean;
    temIdoso: boolean;
    moradiaInadequada: boolean;
    situacaoRisco: boolean;
    laudoRisco: boolean;
    tipoMoradia: TipoMoradia;
    tipoConstrucao: TipoConstrucao;
    saneamento: Saneamento;
  };
}

const FAMILIAS: FamiliaSemente[] = [
  {
    codigo: 'FAM-0001',
    protocolo: 'HAB-2026/00418',
    responsavel: { nome: 'Marlene Aparecida dos Santos', cpf: '52998224725', nascimento: '1985-03-12', sexo: Sexo.FEMININO },
    inscritaEm: '2023-03-14',
    situacao: SituacaoInscricao.EM_RECURSO,
    ficha: {
      rendaFamiliar: 1090, pessoas: 5, quantidadeMenores: 3, mesesResidenciaMunicipio: 168,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: false,
      moradiaInadequada: true, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.CEDIDA, tipoConstrucao: TipoConstrucao.ALVENARIA,
      saneamento: Saneamento.FOSSA_RUDIMENTAR,
    },
  },
  {
    codigo: 'FAM-0002',
    protocolo: 'HAB-2026/00219',
    responsavel: { nome: 'Josefa Ribeiro da Cruz', cpf: '11144477735', nascimento: '1979-11-02', sexo: Sexo.FEMININO },
    inscritaEm: '2022-08-15',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 1056, pessoas: 4, quantidadeMenores: 1, mesesResidenciaMunicipio: 200,
      mulherChefeFamilia: true, temPessoaComDeficiencia: true, temIdoso: false,
      moradiaInadequada: true, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.ALUGADA, tipoConstrucao: TipoConstrucao.MADEIRA,
      saneamento: Saneamento.FOSSA_SEPTICA,
    },
  },
  {
    codigo: 'FAM-0003',
    protocolo: 'HAB-2026/00512',
    responsavel: { nome: 'Edinalva Pereira Lima', cpf: '15350946056', nascimento: '1990-06-25', sexo: Sexo.FEMININO },
    inscritaEm: '2024-01-22',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 1146, pessoas: 6, quantidadeMenores: 4, mesesResidenciaMunicipio: 96,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: false,
      moradiaInadequada: true, situacaoRisco: true, laudoRisco: true,
      tipoMoradia: TipoMoradia.OCUPACAO, tipoConstrucao: TipoConstrucao.IMPROVISADO,
      saneamento: Saneamento.CEU_ABERTO,
    },
  },
  {
    codigo: 'FAM-0004',
    protocolo: 'HAB-2026/00087',
    responsavel: { nome: 'Sebastiana Alves Ferreira', cpf: '19100000053', nascimento: '1958-01-09', sexo: Sexo.FEMININO },
    inscritaEm: '2021-11-05',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 915, pessoas: 3, quantidadeMenores: 0, mesesResidenciaMunicipio: 300,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: true,
      moradiaInadequada: false, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.CEDIDA, tipoConstrucao: TipoConstrucao.ALVENARIA,
      saneamento: Saneamento.REDE_PUBLICA,
    },
  },
  {
    codigo: 'FAM-0005',
    protocolo: 'HAB-2026/00644',
    responsavel: { nome: 'Rosimeire da Silva Nunes', cpf: '23557028050', nascimento: '1993-09-30', sexo: Sexo.FEMININO },
    inscritaEm: '2024-05-18',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 1360, pessoas: 4, quantidadeMenores: 2, mesesResidenciaMunicipio: 72,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: false,
      moradiaInadequada: false, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.ALUGADA, tipoConstrucao: TipoConstrucao.ALVENARIA,
      saneamento: Saneamento.REDE_PUBLICA,
    },
  },
  {
    codigo: 'FAM-0006',
    protocolo: 'HAB-2026/00301',
    responsavel: { nome: 'Antônia Gomes de Souza', cpf: '30962409005', nascimento: '1982-04-17', sexo: Sexo.FEMININO },
    inscritaEm: '2023-02-08',
    situacao: SituacaoInscricao.PENDENTE,
    ficha: {
      rendaFamiliar: 1830, pessoas: 5, quantidadeMenores: 2, mesesResidenciaMunicipio: 120,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: false,
      moradiaInadequada: false, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.ALUGADA, tipoConstrucao: TipoConstrucao.MISTA,
      saneamento: Saneamento.FOSSA_SEPTICA,
    },
  },
  {
    codigo: 'FAM-0007',
    protocolo: 'HAB-2026/00158',
    responsavel: { nome: 'Cleuza Martins de Oliveira', cpf: '40364477882', nascimento: '1956-12-01', sexo: Sexo.FEMININO },
    inscritaEm: '2022-09-27',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 804, pessoas: 2, quantidadeMenores: 0, mesesResidenciaMunicipio: 264,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: true,
      moradiaInadequada: true, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.CEDIDA, tipoConstrucao: TipoConstrucao.MADEIRA,
      saneamento: Saneamento.FOSSA_RUDIMENTAR,
    },
  },
  {
    codigo: 'FAM-0008',
    protocolo: 'HAB-2026/00727',
    responsavel: { nome: 'Vanderleia Costa Batista', cpf: '68885230004', nascimento: '1996-07-14', sexo: Sexo.FEMININO },
    inscritaEm: '2024-07-03',
    situacao: SituacaoInscricao.APTA,
    ficha: {
      rendaFamiliar: 1284, pessoas: 3, quantidadeMenores: 2, mesesResidenciaMunicipio: 48,
      mulherChefeFamilia: true, temPessoaComDeficiencia: false, temIdoso: false,
      moradiaInadequada: false, situacaoRisco: false, laudoRisco: false,
      tipoMoradia: TipoMoradia.ALUGADA, tipoConstrucao: TipoConstrucao.ALVENARIA,
      saneamento: Saneamento.REDE_PUBLICA,
    },
  },
];

const USUARIOS = [
  { email: 'bianka@tangaradaserra.mt.gov.br', nome: 'Bianka Moreira', perfil: PerfilTenant.GESTOR_HABITACAO },
  { email: 'admin@tangaradaserra.mt.gov.br', nome: 'Administração Habita+', perfil: PerfilTenant.ADMINISTRADOR },
  { email: 'social@tangaradaserra.mt.gov.br', nome: 'Técnica Social', perfil: PerfilTenant.TECNICO_SOCIAL },
  { email: 'balcao@tangaradaserra.mt.gov.br', nome: 'Atendimento do Balcão', perfil: PerfilTenant.ATENDENTE },
  { email: 'auditoria@tangaradaserra.mt.gov.br', nome: 'Controle Interno', perfil: PerfilTenant.FISCAL_AUDITOR },
];

async function main(): Promise<void> {
  const senhaHash = await argon2.hash(SENHA_PADRAO, { type: argon2.argon2id });

  const tenantId = await semearTenantEUsuarios(senhaHash);
  const { programaId, versaoId } = await semearPrograma(tenantId);
  await semearFamiliasEInscricoes(tenantId, programaId, versaoId);
  await publicarRanking(tenantId, programaId, versaoId);

  console.log('\n✔ Seed concluído.');
  console.log(`  Prefeitura: Tangará da Serra (${tenantId})`);
  console.log(`  Acesso: ${USUARIOS[0]?.email} · senha ${SENHA_PADRAO}`);
}

async function semearTenantEUsuarios(senhaHash: string): Promise<string> {
  return comContexto({ isPlatform: true }, async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { cnpj: '03758255000108' },
      update: {},
      create: {
        nome: 'Prefeitura Municipal de Tangará da Serra',
        cnpj: '03758255000108',
        municipio: 'Tangará da Serra',
        uf: 'MT',
        parametros: { salarioMinimo: SALARIO_MINIMO_REFERENCIA },
        createdBy: SISTEMA,
        updatedBy: SISTEMA,
      },
    });

    await tx.usuario.upsert({
      where: { email: 'plataforma@geogis.com.br' },
      update: {},
      create: {
        esfera: EsferaUsuario.PLATAFORMA,
        nome: 'Plataforma GeoGis',
        email: 'plataforma@geogis.com.br',
        senhaHash,
        createdBy: SISTEMA,
        updatedBy: SISTEMA,
      },
    });

    for (const usuario of USUARIOS) {
      await tx.usuario.upsert({
        where: { email: usuario.email },
        update: {},
        create: {
          tenantId: tenant.id,
          esfera: EsferaUsuario.TENANT,
          perfil: usuario.perfil,
          nome: usuario.nome,
          email: usuario.email,
          senhaHash,
          createdBy: SISTEMA,
          updatedBy: SISTEMA,
        },
      });
    }

    // A gestora recebe a exceção da §9 explicitamente — é exatamente assim que a capacidade
    // sensível deve existir: concedida, com motivo, e visível na trilha.
    const gestora = await tx.usuario.findUnique({ where: { email: USUARIOS[0]!.email } });
    if (gestora) {
      await tx.usuarioCapacidade.upsert({
        where: {
          usuarioId_capacidade: { usuarioId: gestora.id, capacidade: 'CONVOCAR_FORA_DE_ORDEM' },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          usuarioId: gestora.id,
          capacidade: 'CONVOCAR_FORA_DE_ORDEM',
          motivo: 'Decreto municipal de atendimento a caso de risco iminente.',
          createdBy: SISTEMA,
          updatedBy: SISTEMA,
        },
      });
    }

    return tenant.id;
  });
}

async function semearPrograma(tenantId: string): Promise<{ programaId: string; versaoId: string }> {
  return comContexto({ tenantId }, async (tx) => {
    const programa = await tx.programaHabitacional.upsert({
      where: { tenantId_slug: { tenantId, slug: 'residencial-bela-vista' } },
      update: {},
      create: {
        tenantId,
        nome: 'Residencial Bela Vista',
        slug: 'residencial-bela-vista',
        fonteRecurso: 'FAR / Caixa Econômica Federal',
        vagas: 120,
        inscricaoInicio: new Date('2026-01-15'),
        inscricaoFim: new Date('2026-06-30'),
        situacao: SituacaoPrograma.INSCRICOES_ENCERRADAS,
        createdBy: SISTEMA,
        updatedBy: SISTEMA,
      },
    });

    const referencia = habitacao.versaoCriterioReferencia(
      SALARIO_MINIMO_REFERENCIA,
      '2026-01-10T12:00:00.000Z',
    );

    const versao = await tx.versaoCriterio.upsert({
      where: { programaId_versao: { programaId: programa.id, versao: 1 } },
      update: {},
      create: {
        tenantId,
        programaId: programa.id,
        versao: 1,
        situacao: SituacaoVersaoCriterio.PUBLICADA,
        definicoes: referencia.criterios as unknown as Prisma.InputJsonValue,
        publicadoEm: new Date(referencia.publicadoEm),
        publicadoPor: SISTEMA,
        createdBy: SISTEMA,
        updatedBy: SISTEMA,
      },
    });

    return { programaId: programa.id, versaoId: versao.id };
  });
}

async function semearFamiliasEInscricoes(
  tenantId: string,
  programaId: string,
  versaoId: string,
): Promise<void> {
  for (const semente of FAMILIAS) {
    await comContexto({ tenantId }, async (tx) => {
      const pessoa = await tx.pessoa.upsert({
        where: { tenantId_cpf: { tenantId, cpf: semente.responsavel.cpf } },
        update: {},
        create: {
          tenantId,
          cpf: semente.responsavel.cpf,
          nome: semente.responsavel.nome,
          nascimento: new Date(semente.responsavel.nascimento),
          sexo: semente.responsavel.sexo,
          deficiencia: semente.responsavel.deficiencia ?? false,
          createdBy: SISTEMA,
          updatedBy: SISTEMA,
        },
      });

      const familia = await tx.familia.upsert({
        where: { tenantId_codigo: { tenantId, codigo: semente.codigo } },
        update: {},
        create: {
          tenantId,
          codigo: semente.codigo,
          responsavelId: pessoa.id,
          createdBy: SISTEMA,
          updatedBy: SISTEMA,
        },
      });

      const jaTemFicha = await tx.fichaSocial.findFirst({
        where: { familiaId: familia.id, vigente: true },
      });

      const dados = semente.ficha;
      const ficha =
        jaTemFicha ??
        (await tx.fichaSocial.create({
          data: {
            tenantId,
            familiaId: familia.id,
            rendaFamiliar: dados.rendaFamiliar,
            rendaPerCapita: Number((dados.rendaFamiliar / dados.pessoas).toFixed(2)),
            quantidadePessoas: dados.pessoas,
            fonteRendaPrincipal: 'Trabalho informal',
            nis: null,
            mulherChefeFamilia: dados.mulherChefeFamilia,
            temPessoaComDeficiencia: dados.temPessoaComDeficiencia,
            temIdoso: dados.temIdoso,
            quantidadeMenores: dados.quantidadeMenores,
            situacaoRisco: dados.situacaoRisco,
            laudoRiscoKey: dados.laudoRisco ? `laudos/${semente.codigo}-defesa-civil.pdf` : null,
            laudoRiscoEmitidoEm: dados.laudoRisco ? new Date('2026-07-30') : null,
            tipoMoradia: dados.tipoMoradia,
            tipoConstrucao: dados.tipoConstrucao,
            saneamento: dados.saneamento,
            moradiaInadequada: dados.moradiaInadequada,
            mesesResidenciaMunicipio: dados.mesesResidenciaMunicipio,
            apuradaEm: new Date('2026-07-22'),
            validaAte: new Date('2027-07-22'),
            createdBy: SISTEMA,
            updatedBy: SISTEMA,
          },
        }));

      const inscricao = await tx.inscricaoFila.upsert({
        where: { programaId_familiaId: { programaId, familiaId: familia.id } },
        update: {},
        create: {
          tenantId,
          programaId,
          familiaId: familia.id,
          protocolo: semente.protocolo,
          situacao: semente.situacao,
          inscritaEm: new Date(semente.inscritaEm),
          createdBy: SISTEMA,
          updatedBy: SISTEMA,
        },
      });

      const jaTemSnapshot = await tx.pontuacaoSnapshot.findFirst({
        where: { inscricaoId: inscricao.id, vigente: true },
      });
      if (jaTemSnapshot) return;

      const definicoes = await tx.versaoCriterio.findUniqueOrThrow({ where: { id: versaoId } });
      const versaoCriterio = {
        versao: definicoes.versao,
        publicadoEm: definicoes.publicadoEm?.toISOString() ?? '',
        criterios: definicoes.definicoes as unknown as habitacao.DefinicaoCriterio[],
      };

      const fatos = fatosDaFicha(ficha, { inscritaEm: inscricao.inscritaEm, agora: AGORA });
      const calculo = habitacao.calcularPontuacao(versaoCriterio, fatos, AGORA.toISOString());

      await tx.pontuacaoSnapshot.create({
        data: {
          tenantId,
          inscricaoId: inscricao.id,
          versaoCriterioId: versaoId,
          total: calculo.total,
          totalMaximo: calculo.totalMaximo,
          itens: calculo.itens as unknown as Prisma.InputJsonValue,
          fatos: fatos as unknown as Prisma.InputJsonValue,
          motivo: MotivoCalculo.INSCRICAO,
          calculadoPor: SISTEMA,
          createdBy: SISTEMA,
        },
      });

      console.log(`  ${semente.protocolo} · ${semente.responsavel.nome} · ${calculo.total} pts`);
    });
  }
}

async function publicarRanking(
  tenantId: string,
  programaId: string,
  versaoId: string,
): Promise<void> {
  await comContexto({ tenantId }, async (tx) => {
    const jaPublicado = await tx.rankingPublicacao.findFirst({ where: { programaId } });
    if (jaPublicado) return;

    const inscricoes = await tx.inscricaoFila.findMany({
      where: { programaId, deletedAt: null },
      include: {
        snapshots: { where: { vigente: true }, take: 1 },
        familia: { include: { fichas: { where: { vigente: true }, take: 1 } } },
      },
    });

    const itens = inscricoes.map((inscricao) => ({
      inscricaoId: inscricao.id,
      protocolo: inscricao.protocolo,
      pontuacao: Number(inscricao.snapshots[0]?.total ?? 0),
      inscritaEm: inscricao.inscritaEm.toISOString(),
      mesesResidenciaMunicipio: inscricao.familia.fichas[0]?.mesesResidenciaMunicipio ?? 0,
      apta: habitacao.ocupaPosicaoNaFila(inscricao.situacao),
    }));

    const classificados = habitacao.classificarFila(itens);

    const publicacao = await tx.rankingPublicacao.create({
      data: {
        tenantId,
        programaId,
        versaoCriterioId: versaoId,
        publicadoPor: SISTEMA,
        prazoRecursoAte: new Date('2026-08-20'),
        totalClassificadas: classificados.length,
        createdBy: SISTEMA,
      },
    });

    for (const item of classificados) {
      await tx.rankingItem.create({
        data: {
          tenantId,
          publicacaoId: publicacao.id,
          inscricaoId: item.inscricaoId,
          posicao: item.posicao,
          protocolo: item.protocolo,
          pontuacao: item.pontuacao,
        },
      });
    }

    console.log(`\n  Ranking publicado com ${classificados.length} famílias classificadas.`);
  });
}

main()
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
