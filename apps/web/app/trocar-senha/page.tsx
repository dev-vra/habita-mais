import { LogoHabita } from '@/components/brand/logo';
import { FormularioTrocaSenha } from './formulario-troca-senha';

export default function PaginaTrocarSenha() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <LogoHabita tamanho={40} />
        <h1 className="mt-8 font-display text-2xl font-bold text-institucional">
          Troque a senha temporária
        </h1>
        <p className="mt-1 text-sm text-texto-suave">
          O acesso fica bloqueado até a troca — a senha do primeiro acesso é conhecida por quem
          criou o usuário.
        </p>

        <FormularioTrocaSenha />
      </div>
    </main>
  );
}
