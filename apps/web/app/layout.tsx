import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Habita+ · Gestão Habitacional de Interesse Social',
  description:
    'A fila da casa própria com nome, nota e data: critério publicado antes da inscrição, ' +
    'pontuação congelada no cálculo e cada convocação com ofício.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
