/* eslint-disable no-console -- script de linha de comando: a saída no terminal É a interface. */
/**
 * Catálogo padrão de tipos de documento.
 *
 * A lista vem da prática de COHABs e do MCMV: identidade e renda do requerente, comprovação de
 * residência e de não possuir imóvel, e — do lado do registro — matrícula, CND municipal e o
 * contrato com firma reconhecida, que é o que o cartório efetivamente recebe.
 *
 * Cada prefeitura ajusta a lista depois; isto é ponto de partida, não regra do produto.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EscopoDocumento, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

interface Tipo {
  codigo: string;
  nome: string;
  escopo: EscopoDocumento;
  validadeMeses?: number;
  orientacao?: string;
}

const CATALOGO: Tipo[] = [
  // Identificação do requerente
  { codigo: 'RG', nome: 'Documento de identidade (RG ou CNH)', escopo: 'PESSOA' },
  { codigo: 'CPF', nome: 'CPF', escopo: 'PESSOA' },
  { codigo: 'CERTIDAO_ESTADO_CIVIL', nome: 'Certidão de nascimento ou casamento', escopo: 'PESSOA', validadeMeses: 12, orientacao: 'Certidão atualizada — o cartório exige emissão recente no registro.' },
  { codigo: 'COMPROVANTE_RENDA', nome: 'Comprovante de renda', escopo: 'PESSOA', validadeMeses: 3, orientacao: 'Três últimos contracheques, extrato do benefício ou declaração de renda informal.' },
  { codigo: 'CTPS', nome: 'Carteira de trabalho', escopo: 'PESSOA' },

  // Família
  { codigo: 'COMPROVANTE_RESIDENCIA', nome: 'Comprovante de residência', escopo: 'FAMILIA', validadeMeses: 3, orientacao: 'Conta de luz, água ou telefone dos últimos três meses.' },
  { codigo: 'DECLARACAO_NAO_PROPRIETARIO', nome: 'Declaração de não possuir imóvel', escopo: 'FAMILIA', validadeMeses: 12, orientacao: 'Declaração assinada pelo responsável familiar, sob as penas da lei.' },
  { codigo: 'FOLHA_CADUNICO', nome: 'Folha resumo do CadÚnico', escopo: 'FAMILIA', validadeMeses: 24 },
  { codigo: 'LAUDO_RISCO', nome: 'Laudo de risco da Defesa Civil', escopo: 'FAMILIA', validadeMeses: 24, orientacao: 'Emitido pela Defesa Civil. Sem ele, o critério de risco não pontua.' },
  { codigo: 'LAUDO_MEDICO', nome: 'Laudo médico (PCD ou doença crônica)', escopo: 'FAMILIA', validadeMeses: 12 },

  // Inscrição
  { codigo: 'REQUERIMENTO_INSCRICAO', nome: 'Requerimento de inscrição assinado', escopo: 'INSCRICAO' },
  { codigo: 'AUTODECLARACAO', nome: 'Autodeclaração de informações', escopo: 'INSCRICAO' },

  // Programa
  { codigo: 'EDITAL', nome: 'Edital do programa', escopo: 'PROGRAMA' },
  { codigo: 'REGULAMENTO', nome: 'Regulamento e critérios publicados', escopo: 'PROGRAMA' },
  { codigo: 'PUBLICACAO_RANKING', nome: 'Publicação do ranking', escopo: 'PROGRAMA' },
  { codigo: 'ATA_CONSELHO', nome: 'Ata do conselho municipal', escopo: 'PROGRAMA' },

  // Convênio e obra
  { codigo: 'TERMO_CONVENIO', nome: 'Termo de convênio ou repasse', escopo: 'CONVENIO' },
  { codigo: 'PROJETO_APROVADO', nome: 'Projeto aprovado', escopo: 'OBRA' },
  { codigo: 'LICENCA_AMBIENTAL', nome: 'Licença ambiental', escopo: 'OBRA', validadeMeses: 24 },
  { codigo: 'ART_RRT', nome: 'ART ou RRT do responsável técnico', escopo: 'OBRA' },
  { codigo: 'MEDICAO_FOTOS', nome: 'Relatório de medição com fotos', escopo: 'OBRA' },

  // Unidade e registro
  { codigo: 'HABITE_SE', nome: 'Habite-se', escopo: 'UNIDADE' },
  { codigo: 'MATRICULA_IMOVEL', nome: 'Matrícula atualizada do imóvel', escopo: 'UNIDADE', validadeMeses: 3, orientacao: 'Certidão da matrícula emitida pelo CRI — o cartório exige atualizada.' },
  { codigo: 'CND_MUNICIPAL', nome: 'Certidão negativa de débitos municipais', escopo: 'UNIDADE', validadeMeses: 3 },

  // Contrato e título
  { codigo: 'CONTRATO_ASSINADO', nome: 'Contrato assinado com firma reconhecida', escopo: 'CONTRATO' },
  { codigo: 'TERMO_ENTREGA_CHAVES', nome: 'Termo de entrega de chaves', escopo: 'CONTRATO' },
  { codigo: 'TITULO_GARANTIA', nome: 'Título de garantia de recebimento', escopo: 'CONTRATO' },
  { codigo: 'COMPROVANTE_QUITACAO', nome: 'Comprovante de quitação', escopo: 'CONTRATO' },
];

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_platform','true',true)`;
    const tenant = await tx.tenant.findFirst({ select: { id: true } });
    if (!tenant) throw new Error('Nenhuma prefeitura cadastrada.');

    await tx.$executeRaw`SELECT set_config('app.is_platform','false',true)`;
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;

    for (const tipo of CATALOGO) {
      await tx.tipoDocumento.upsert({
        where: { tenantId_codigo: { tenantId: tenant.id, codigo: tipo.codigo } },
        update: {},
        create: {
          tenantId: tenant.id,
          codigo: tipo.codigo,
          nome: tipo.nome,
          escopo: tipo.escopo,
          validadeMeses: tipo.validadeMeses ?? null,
          orientacao: tipo.orientacao ?? null,
          createdBy: 'seed',
          updatedBy: 'seed',
        },
      });
    }
    console.log(`${CATALOGO.length} tipos de documento no catálogo.`);
  });
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
}).finally(() => prisma.$disconnect());
