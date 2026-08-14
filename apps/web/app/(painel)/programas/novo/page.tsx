import { FormularioPrograma } from './formulario-programa';

export default function PaginaNovoPrograma() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-texto-suave">Início › Programas › Novo</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Novo programa habitacional
      </h1>
      <p className="mt-1 text-texto-suave">
        O programa nasce em rascunho. As inscrições só abrem depois que uma versão de critério for
        publicada — o critério é público antes de a fila existir.
      </p>

      <FormularioPrograma />
    </div>
  );
}
