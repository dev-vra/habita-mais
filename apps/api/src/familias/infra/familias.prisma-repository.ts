import { Injectable } from '@nestjs/common';
import {
  AbastecimentoAgua,
  BeneficioSocial,
  ColetaLixo,
  EnergiaEletrica,
  Escolaridade,
  EstadoCivil,
  EstruturaFamiliar,
  FonteRenda,
  IndicadorVulnerabilidade,
  NivelVulnerabilidade,
  OrigemFicha,
  Pavimentacao,
  RegimeBens,
  RegimeRenda,
  SituacaoHabitacional,
  SituacaoTrabalho,
  TipoDeficiencia,
  Parentesco,
  Saneamento,
  Sexo,
  TipoConstrucao,
  TipoMoradia,
  type Prisma,
} from '@prisma/client';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { FamiliasRepository, FichaVigenteResumo } from '../domain/ports';
import type {
  DadosFichaSocial,
  DadosMembro,
  DadosPessoa,
  DadosVisita,
  FamiliaCriada,
} from '../domain/tipos';

@Injectable()
export class FamiliasPrismaRepository implements FamiliasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pessoaPorCpf(cpf: string): Promise<{ id: string; nome: string; familiaId?: string } | null> {
    const pessoa = await this.prisma.tx.pessoa.findFirst({
      where: { cpf, deletedAt: null },
      select: {
        id: true,
        nome: true,
        membros: { where: { saiuEm: null }, select: { familiaId: true }, take: 1 },
        familiasResponsavel: { where: { deletedAt: null }, select: { id: true }, take: 1 },
      },
    });
    if (!pessoa) return null;

    return {
      id: pessoa.id,
      nome: pessoa.nome,
      familiaId: pessoa.familiasResponsavel[0]?.id ?? pessoa.membros[0]?.familiaId,
    };
  }

  async criarPessoa(dados: DadosPessoa): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.pessoa.create({
      data: {
        tenantId: tenantId ?? '',
        cpf: dados.cpf,
        nome: dados.nome,
        nascimento: dados.nascimento ?? null,
        sexo: (dados.sexo ?? 'NAO_INFORMADO') as Sexo,
        nis: dados.nis ?? null,
        telefone: dados.telefone ?? null,
        email: dados.email ?? null,
        deficiencia: dados.deficiencia ?? false,
        telefoneAlternativo: dados.telefoneAlternativo ?? null,
        nomeMae: dados.nomeMae ?? null,
        nomePai: dados.nomePai ?? null,
        nomePaiNaoInformado: dados.nomePaiNaoInformado ?? false,
        estadoCivil: (dados.estadoCivil as EstadoCivil) ?? null,
        regimeBens: (dados.regimeBens as RegimeBens) ?? null,
        rg: dados.rg ?? null,
        orgaoExpedidor: dados.orgaoExpedidor ?? null,
        rgUf: dados.rgUf ?? null,
        rgAusente: dados.rgAusente ?? false,
        nacionalidade: dados.nacionalidade ?? null,
        naturalidade: dados.naturalidade ?? null,
        profissao: dados.profissao ?? null,
        escolaridade: (dados.escolaridade as Escolaridade) ?? null,
        situacaoTrabalho: (dados.situacaoTrabalho as SituacaoTrabalho) ?? null,
        tiposDeficiencia: (dados.tiposDeficiencia ?? []) as TipoDeficiencia[],
        usaCadeiraDeRodas: dados.usaCadeiraDeRodas ?? false,
        necessitaCuidador: dados.necessitaCuidador ?? false,
        cep: dados.cep ?? null,
        logradouro: dados.logradouro ?? null,
        numero: dados.numero ?? null,
        complemento: dados.complemento ?? null,
        bairro: dados.bairro ?? null,
        municipio: dados.municipio ?? null,
        uf: dados.uf ?? null,
        referencia: dados.referencia ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async criarFamilia(dados: { codigo: string; responsavelId: string }): Promise<FamiliaCriada> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    const familia = await this.prisma.tx.familia.create({
      data: {
        tenantId: tenantId ?? '',
        codigo: dados.codigo,
        responsavelId: dados.responsavelId,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, codigo: true, responsavelId: true },
    });

    return familia;
  }

  async existe(familiaId: string): Promise<boolean> {
    const familia = await this.prisma.tx.familia.findFirst({
      where: { id: familiaId, deletedAt: null },
      select: { id: true },
    });
    return familia !== null;
  }

  async fichaVigente(familiaId: string): Promise<FichaVigenteResumo | null> {
    const ficha = await this.prisma.tx.fichaSocial.findFirst({
      where: { familiaId, vigente: true, deletedAt: null },
      select: { id: true, rendaPerCapita: true, quantidadePessoas: true, validaAte: true },
    });
    if (!ficha) return null;

    return { ...ficha, rendaPerCapita: Number(ficha.rendaPerCapita) };
  }

  async registrarFicha(familiaId: string, dados: DadosFichaSocial): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    await this.prisma.tx.fichaSocial.updateMany({
      where: { familiaId, vigente: true },
      data: { vigente: false },
    });

    return this.prisma.tx.fichaSocial.create({
      data: {
        tenantId: tenantId ?? '',
        familiaId,
        rendaFamiliar: dados.rendaFamiliar,
        rendaPerCapita: Number((dados.rendaFamiliar / dados.quantidadePessoas).toFixed(2)),
        quantidadePessoas: dados.quantidadePessoas,
        quantidadeMenores: dados.quantidadeMenores,
        fonteRendaPrincipal: dados.fonteRendaPrincipal ?? null,
        nis: dados.nis ?? null,
        beneficioAtivo: dados.beneficioAtivo ?? null,
        mulherChefeFamilia: dados.mulherChefeFamilia,
        temPessoaComDeficiencia: dados.temPessoaComDeficiencia,
        temIdoso: dados.temIdoso,
        situacaoRisco: dados.situacaoRisco,
        laudoRiscoKey: dados.laudoRiscoKey ?? null,
        laudoRiscoEmitidoEm: dados.laudoRiscoEmitidoEm ?? null,
        tipoMoradia: dados.tipoMoradia as TipoMoradia,
        tipoConstrucao: dados.tipoConstrucao as TipoConstrucao,
        saneamento: dados.saneamento as Saneamento,
        moradiaInadequada: dados.moradiaInadequada,
        possuiOutroImovel: dados.possuiOutroImovel,
        mesesResidenciaMunicipio: dados.mesesResidenciaMunicipio,
        origem: (dados.origem ?? 'PROPRIA') as OrigemFicha,
        origemProcessoExterno: dados.origemProcessoExterno ?? null,
        origemConsultadaEm: dados.origemProcessoExterno ? new Date() : null,
        fonteRenda: (dados.fonteRenda as FonteRenda) ?? null,
        regimeRenda: (dados.regimeRenda as RegimeRenda) ?? null,
        rendaComplementar: dados.rendaComplementar ?? false,
        rendaComplementarDesc: dados.rendaComplementarDesc ?? null,
        inscritoCadUnico: dados.inscritoCadUnico ?? false,
        beneficios: (dados.beneficios ?? []) as BeneficioSocial[],
        estruturaFamiliar: (dados.estruturaFamiliar as EstruturaFamiliar) ?? null,
        vulnerabilidades: (dados.vulnerabilidades ?? []) as IndicadorVulnerabilidade[],
        nivelVulnerabilidade: (dados.nivelVulnerabilidade as NivelVulnerabilidade) ?? null,
        parecerTecnico: dados.parecerTecnico ?? null,
        situacaoHabitacional: (dados.situacaoHabitacional as SituacaoHabitacional) ?? null,
        comodos: dados.comodos ?? null,
        banheiros: dados.banheiros ?? null,
        abastecimentoAgua: (dados.abastecimentoAgua as AbastecimentoAgua) ?? null,
        energiaEletrica: (dados.energiaEletrica as EnergiaEletrica) ?? null,
        coletaLixo: (dados.coletaLixo as ColetaLixo) ?? null,
        pavimentacao: (dados.pavimentacao as Pavimentacao) ?? null,
        iluminacaoPublica: dados.iluminacaoPublica ?? null,
        drenagemPluvial: dados.drenagemPluvial ?? null,
        acessoEscolaProxima: dados.acessoEscolaProxima ?? null,
        acessoSaudeProxima: dados.acessoSaudeProxima ?? null,
        acessoTransportePublico: dados.acessoTransportePublico ?? null,
        apuradaEm: dados.apuradaEm,
        validaAte: dados.validaAte,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async adicionarMembro(familiaId: string, dados: DadosMembro): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    const existente = await this.pessoaPorCpf(dados.pessoa.cpf);
    const pessoaId = existente?.id ?? (await this.criarPessoa(dados.pessoa)).id;

    return this.prisma.tx.membroFamiliar.create({
      data: {
        tenantId: tenantId ?? '',
        familiaId,
        pessoaId,
        parentesco: dados.parentesco as Parentesco,
        contribuiRenda: dados.contribuiRenda,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async registrarVisita(familiaId: string, dados: DadosVisita): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.visitaDomiciliar.create({
      data: {
        tenantId: tenantId ?? '',
        familiaId,
        visitadaEm: dados.visitadaEm,
        parecer: dados.parecer,
        latitude: dados.latitude ?? null,
        longitude: dados.longitude ?? null,
        fotos: dados.fotos as unknown as Prisma.InputJsonValue,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }
}
