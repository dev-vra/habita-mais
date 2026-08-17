import { redirect } from 'next/navigation';
import { MenuLateral, type GrupoMenu } from '@/components/domain/menu-lateral';
import type { Atalho } from '@/components/domain/busca-global';
import { ProvedorToast } from '@/components/ui/toast';
import { ApiError, apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';

interface ResumoNavegacao {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  /** Visitas de acompanhamento vencidas — o contador que puxa o servidor para o pós-entrega. */
  visitasVencidas?: number;
  programas: { id: string; nome: string; slug: string }[];
}

const PERFIS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_HABITACAO: 'Gestor de Habitação',
  TECNICO_SOCIAL: 'Técnico social',
  ATENDENTE: 'Atendimento',
  FISCAL_OBRAS: 'Fiscal de obras',
  ANALISTA_MUTUARIO: 'Analista de mutuários',
  JURIDICO: 'Jurídico',
  FISCAL_AUDITOR: 'Controle interno',
  DEFESA_CIVIL: 'Defesa Civil',
  SETOR_PARCEIRO: 'Setor parceiro',
};

/**
 * Casca do sistema.
 *
 * O menu mostra só o que o usuário pode abrir: oferecer link que devolve 403 faz o servidor
 * descobrir a própria permissão por tentativa e erro. As filas aparecem nomeadas, uma por programa
 * — "Fila" genérico não diz de qual programa se trata, e é sempre de um programa que se fala.
 *
 * O layout monta o modelo de navegação; o desenho (acordeão, recolher, gaveta no celular) é do
 * `MenuLateral`. A paleta de comandos recebe esses mesmos itens, para não existir atalho que abra
 * uma tela que a capacidade nega.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/entrar');

  const podeHabitacao = sessao.capacidades.includes('ACESSAR_HABITACAO');
  const podeAdministrar = sessao.capacidades.includes('GERIR_USUARIOS');
  const podeParametros = sessao.capacidades.includes('GERIR_PARAMETROS');
  const podeAuditar = sessao.capacidades.includes('LER_AUDITORIA');
  const podeVerFinanceiro = sessao.capacidades.includes('VER_DADO_FINANCEIRO');
  const podeEncaminhar =
    sessao.capacidades.includes('ENCAMINHAR_SETOR') ||
    sessao.capacidades.includes('RESPONDER_ENCAMINHAMENTO');

  let resumo: ResumoNavegacao = { familias: 0, aptas: 0, aguardandoConvocacao: 0, programas: [] };

  if (podeHabitacao) {
    try {
      resumo = await apiFetch<ResumoNavegacao>('/painel');
    } catch (erro) {
      // Só 401 é sessão morta. Tratar 403 como expiração mandava para o login quem apenas não
      // tinha a capacidade — e o servidor via tela de login sem entender por quê.
      if (erro instanceof ApiError && erro.status === 401) redirect('/entrar?sessao=expirada');
      throw erro;
    }
  }

  const grupos: GrupoMenu[] = [];

  if (podeHabitacao) {
    grupos.push(
      {
        chave: 'atendimento',
        rotulo: 'Atendimento',
        icone: 'atendimento',
        itens: [
          { rotulo: 'Painel', href: '/painel' },
          { rotulo: 'Famílias', href: '/familias', contador: resumo.familias },
          { rotulo: 'Pendências', href: '/pendencias' },
        ],
      },
      {
        chave: 'filas',
        rotulo: 'Filas',
        icone: 'filas',
        itens: [
          ...resumo.programas.map((programa) => ({
            rotulo: programa.nome,
            href: `/fila/${programa.slug}`,
            contador: resumo.aptas,
          })),
          { rotulo: 'Programas e critérios', href: '/programas' },
        ],
      },
      {
        chave: 'producao',
        rotulo: 'Produção',
        icone: 'producao',
        itens: [
          { rotulo: 'Empreendimentos e obras', href: '/producao' },
          { rotulo: 'Pós-entrega', href: '/acompanhamento', contador: resumo.visitasVencidas },
          { rotulo: 'Retomada', href: '/retomada' },
        ],
      },
    );

    if (podeVerFinanceiro) {
      grupos.push({
        chave: 'mutuarios',
        rotulo: 'Mutuários',
        icone: 'mutuarios',
        itens: [{ rotulo: 'Contratos e carnês', href: '/contratos' }],
      });
    }

    grupos.push({
      chave: 'gestao',
      rotulo: 'Gestão',
      icone: 'gestao',
      itens: [
        { rotulo: 'Indicadores', href: '/indicadores' },
        ...(podeEncaminhar ? [{ rotulo: 'Encaminhamentos', href: '/encaminhamentos' }] : []),
        ...(podeAuditar ? [{ rotulo: 'Trilha de auditoria', href: '/auditoria' }] : []),
      ],
    });
  }

  if (!podeHabitacao && podeEncaminhar) {
    grupos.push({
      chave: 'setor',
      rotulo: 'Meu setor',
      icone: 'setor',
      itens: [{ rotulo: 'Encaminhamentos recebidos', href: '/encaminhamentos' }],
    });
  }

  if (podeAdministrar || podeParametros) {
    grupos.push({
      chave: 'administracao',
      rotulo: 'Administração',
      icone: 'administracao',
      itens: [
        ...(podeAdministrar ? [{ rotulo: 'Usuários', href: '/administracao/usuarios' }] : []),
        ...(podeParametros
          ? [
              { rotulo: 'Setores', href: '/administracao/setores' },
              { rotulo: 'Parâmetros', href: '/administracao/parametros' },
              { rotulo: 'Assistente de IA', href: '/administracao/assistente' },
            ]
          : []),
      ],
    });
  }

  const atalhos: Atalho[] = grupos.flatMap((grupo) =>
    grupo.itens.map((item) => ({
      tipo: grupo.chave === 'filas' && item.href.startsWith('/fila/') ? 'Fila' : 'Tela',
      rotulo: item.rotulo,
      apoio: grupo.rotulo,
      href: item.href,
    })),
  );

  if (podeHabitacao) {
    atalhos.push({
      tipo: 'Ação',
      rotulo: 'Cadastrar família',
      apoio: 'Atendimento',
      href: '/familias/nova',
    });
  }

  return (
    <ProvedorToast>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <MenuLateral
          grupos={grupos}
          atalhos={atalhos}
          usuario={{
            nome: sessao.nome,
            perfil: sessao.perfil ? (PERFIS[sessao.perfil] ?? sessao.perfil) : 'Servidor',
          }}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ProvedorToast>
  );
}
