/* eslint-disable no-console -- script de linha de comando: a saída no terminal É a interface. */
/**
 * Sincroniza a senha do papel de runtime `habita_app`.
 *
 * O papel nasce na migration de RLS, mas sem senha — segredo não entra em migration versionada.
 * Este script conecta como owner (DATABASE_URL) e roda `ALTER ROLE ... PASSWORD`, que é
 * idempotente: pode rodar em todo deploy sem efeito colateral se a senha não mudou.
 *
 * Uso: `pnpm --filter @habita/api db:bootstrap-role`.
 */
import 'dotenv/config';
import { Client } from 'pg';

const PAPEL = 'habita_app';

async function main(): Promise<void> {
  const senha = process.env.HABITA_APP_DB_PASSWORD;
  if (!senha) {
    throw new Error(
      'HABITA_APP_DB_PASSWORD ausente — necessária para configurar a senha do papel de runtime.',
    );
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Aspas simples dobradas em vez de bind parameter: ALTER ROLE é DDL, e a sintaxe de senha
    // não aceita parâmetro de forma confiável em todo driver.
    const escapada = senha.replace(/'/g, "''");
    await client.query(`ALTER ROLE ${PAPEL} WITH PASSWORD '${escapada}'`);
    console.log(`✔ papel ${PAPEL}: senha sincronizada.`);
  } finally {
    await client.end();
  }
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
