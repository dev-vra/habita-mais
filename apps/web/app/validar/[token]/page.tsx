import { LogoHabita } from '@/components/brand/logo';

interface Comprovante {
  autentico: boolean;
  documento: {
    tipo: string;
    numeroOficio: string;
    protocolo: string;
    programa: string;
    emitidoEm: string;
    prazoAte: string;
    foraDeOrdem: boolean;
    municipio: string;
  };
}

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/**
 * Conferência pública do documento. Sem login: quem recebeu o papel confere lendo o QR.
 *
 * A página mostra só o que já está impresso — número, protocolo, programa e prazo. Situação atual
 * da família não aparece: quem valida um papel não precisa saber onde ela está na fila hoje.
 */
export default async function PaginaValidar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resposta = await fetch(`${BASE}/validacao/${token}`, { cache: 'no-store' });

  if (!resposta.ok) {
    return (
      <Moldura>
        <div className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-danger">
          <p className="font-semibold">Documento não confere.</p>
          <p className="mt-1 text-sm">
            O código lido não corresponde a um documento emitido por este sistema. Confirme com a
            Secretaria de Habitação antes de considerar o papel válido.
          </p>
        </div>
      </Moldura>
    );
  }

  const { documento } = (await resposta.json()) as Comprovante;

  return (
    <Moldura>
      <div className="rounded-md border border-success/40 bg-success/5 px-4 py-3 text-success">
        <p className="font-semibold">Documento autêntico.</p>
        <p className="mt-1 text-sm">Emitido pelo Habita+ — {documento.municipio}.</p>
      </div>

      <dl className="mt-6 divide-y divide-borda rounded-lg border border-borda bg-surface">
        <Linha rotulo="Documento" valor={`Ofício de convocação ${documento.numeroOficio}`} />
        <Linha rotulo="Programa" valor={documento.programa} />
        <Linha rotulo="Protocolo da inscrição" valor={documento.protocolo} />
        <Linha rotulo="Emitido em" valor={new Date(documento.emitidoEm).toLocaleDateString('pt-BR')} />
        <Linha
          rotulo="Comparecimento até"
          valor={new Date(documento.prazoAte).toLocaleDateString('pt-BR')}
        />
        {documento.foraDeOrdem && (
          <Linha rotulo="Observação" valor="Convocação fora da ordem de classificação." />
        )}
      </dl>

      <p className="mt-6 text-sm text-texto-suave">
        Esta página confirma a autenticidade do papel, não a situação atual da inscrição. Para saber
        sua posição hoje, entre na central com protocolo e CPF.
      </p>
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <LogoHabita tamanho={36} />
      <h1 className="mt-8 font-display text-2xl font-bold text-institucional">
        Validação de documento
      </h1>
      <div className="mt-6">{children}</div>
    </main>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd className="tabular text-sm font-semibold text-texto">{valor}</dd>
    </div>
  );
}
