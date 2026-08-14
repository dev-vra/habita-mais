'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  criarUsuario,
  definirCapacidade,
  definirStatusUsuario,
  limparCapacidade,
  redefinirSenha,
} from '@/app/actions/administracao';
import { Aviso } from '@/components/ui/formulario';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string | null;
  status: string;
  ultimoAcessoEm: string | null;
  capacidadesConcedidas: string[];
  capacidadesRevogadas: string[];
}

const PERFIS = [
  { valor: 'ATENDENTE', rotulo: 'Atendimento' },
  { valor: 'TECNICO_SOCIAL', rotulo: 'Técnico social' },
  { valor: 'GESTOR_HABITACAO', rotulo: 'Gestor de Habitação' },
  { valor: 'FISCAL_OBRAS', rotulo: 'Fiscal de obras' },
  { valor: 'ANALISTA_MUTUARIO', rotulo: 'Analista de mutuários' },
  { valor: 'JURIDICO', rotulo: 'Jurídico' },
  { valor: 'FISCAL_AUDITOR', rotulo: 'Controle interno' },
  { valor: 'ADMINISTRADOR', rotulo: 'Administrador' },
];

/** As quatro da spec §5 — nunca implícitas no cargo. */
const SENSIVEIS = [
  { valor: 'RECALCULAR_PONTUACAO_LOTE', rotulo: 'Recalcular pontuação em lote' },
  { valor: 'CONVOCAR_FORA_DE_ORDEM', rotulo: 'Convocar fora de ordem' },
  { valor: 'CORTAR_AUXILIO', rotulo: 'Cortar auxílio' },
  { valor: 'TRANSFERIR_TITULARIDADE', rotulo: 'Transferir titularidade' },
];

const rotuloPerfil = (perfil: string | null) =>
  PERFIS.find((item) => item.valor === perfil)?.rotulo ?? perfil ?? '—';

export function GestaoUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  const [erro, setErro] = useState<string>();
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string }>();
  const [aberto, setAberto] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  return (
    <div className="mt-8 space-y-6">
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      {senhaGerada && (
        <Aviso tom="warning">
          <p className="font-semibold">Senha temporária de {senhaGerada.nome}</p>
          <p className="tabular mt-1 text-lg">{senhaGerada.senha}</p>
          <p className="mt-1 text-xs">
            Anote e entregue em mãos. Ela não será mostrada de novo, e a troca é obrigatória no
            primeiro acesso.
          </p>
        </Aviso>
      )}

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">Novo usuário</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_2fr_1.5fr_auto]"
          action={(form) =>
            iniciar(async () => {
              const nome = String(form.get('nome') ?? '');
              const resultado = await criarUsuario({
                nome,
                email: String(form.get('email') ?? ''),
                perfil: String(form.get('perfil') ?? ''),
              });
              setErro(resultado.erro);
              if (resultado.dados) {
                setSenhaGerada({ nome, senha: resultado.dados.senhaTemporaria });
                router.refresh();
              }
            })
          }
        >
          <input
            name="nome"
            required
            placeholder="Nome completo"
            aria-label="Nome"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@municipio.gov.br"
            aria-label="E-mail funcional"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <select
            name="perfil"
            aria-label="Perfil"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          >
            {PERFIS.map((perfil) => (
              <option key={perfil.valor} value={perfil.valor}>
                {perfil.rotulo}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
          >
            Criar
          </button>
        </form>
      </section>

      <ul className="space-y-3">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="rounded-lg border border-borda bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-texto">
                  {usuario.nome}
                  {usuario.status !== 'ATIVO' && (
                    <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                      {usuario.status.toLowerCase()}
                    </span>
                  )}
                </p>
                <p className="text-sm text-texto-suave">
                  {usuario.email} · {rotuloPerfil(usuario.perfil)}
                  {usuario.ultimoAcessoEm &&
                    ` · último acesso ${new Date(usuario.ultimoAcessoEm).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <BotaoLinha
                  onClick={() =>
                    iniciar(async () => {
                      const resultado = await redefinirSenha(usuario.id);
                      setErro(resultado.erro);
                      if (resultado.dados) {
                        setSenhaGerada({
                          nome: usuario.nome,
                          senha: resultado.dados.senhaTemporaria,
                        });
                      }
                    })
                  }
                  pendente={pendente}
                >
                  Nova senha
                </BotaoLinha>
                <BotaoLinha
                  onClick={() =>
                    rodar(() =>
                      definirStatusUsuario(
                        usuario.id,
                        usuario.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO',
                      ),
                    )
                  }
                  pendente={pendente}
                >
                  {usuario.status === 'ATIVO' ? 'Bloquear' : 'Reativar'}
                </BotaoLinha>
                <BotaoLinha
                  onClick={() => setAberto(aberto === usuario.id ? undefined : usuario.id)}
                  pendente={false}
                >
                  Capacidades
                </BotaoLinha>
              </div>
            </div>

            {usuario.capacidadesConcedidas.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {usuario.capacidadesConcedidas.map((capacidade) => (
                  <li
                    key={capacidade}
                    className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-text"
                  >
                    {SENSIVEIS.find((s) => s.valor === capacidade)?.rotulo ?? capacidade}
                  </li>
                ))}
              </ul>
            )}

            {aberto === usuario.id && (
              <div className="mt-4 space-y-3 border-t border-borda pt-4">
                {SENSIVEIS.map((sensivel) => {
                  const concedida = usuario.capacidadesConcedidas.includes(sensivel.valor);
                  return (
                    <form
                      key={sensivel.valor}
                      className="grid gap-2 sm:grid-cols-[1.2fr_2fr_auto]"
                      action={(form) =>
                        rodar(() =>
                          concedida
                            ? limparCapacidade(usuario.id, sensivel.valor)
                            : definirCapacidade(usuario.id, {
                                capacidade: sensivel.valor,
                                concedida: true,
                                motivo: String(form.get('motivo') ?? ''),
                              }),
                        )
                      }
                    >
                      <span className="self-center text-sm text-texto">{sensivel.rotulo}</span>
                      {!concedida && (
                        <input
                          name="motivo"
                          required
                          minLength={15}
                          placeholder="Motivo da concessão (fica na trilha)"
                          className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
                        />
                      )}
                      <button
                        type="submit"
                        disabled={pendente}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                          concedida
                            ? 'border border-borda text-danger hover:bg-danger/5'
                            : 'bg-primary text-surface hover:bg-primary/90'
                        } ${concedida ? 'sm:col-start-3' : ''}`}
                      >
                        {concedida ? 'Retirar' : 'Conceder'}
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BotaoLinha({
  children,
  onClick,
  pendente,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pendente: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendente}
      className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background disabled:opacity-60"
    >
      {children}
    </button>
  );
}
