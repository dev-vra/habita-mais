import { FormularioFamilia } from './formulario-familia';

export default function PaginaNovaFamilia() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-texto-suave">Início › Famílias › Nova</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Cadastrar família
      </h1>
      <p className="mt-1 text-texto-suave">
        A família nasce com ficha social: sem ela não há fatos, e sem fatos não há pontuação
        defensável.
      </p>

      <FormularioFamilia />
    </div>
  );
}
