import 'dotenv/config';
import { Client } from 'pg';

/**
 * Teste de integração da RLS contra o banco local, conectando com o MESMO papel que a API usa em
 * runtime (`habita_app`). É o único jeito honesto de verificar isolamento: policy escrita não é
 * policy aplicada, e um papel com BYPASSRLS faria todo o resto do arquivo passar por acidente.
 *
 * Precisa do stack de dev no ar (infra/docker-compose.yml) e do seed aplicado.
 */
const urlRuntime = process.env.RUNTIME_DATABASE_URL;
const descreverSeHouverBanco = urlRuntime ? describe : describe.skip;

descreverSeHouverBanco('RLS com o papel de runtime', () => {
  let client: Client;
  let tenantId: string;
  let familiaId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: urlRuntime });
    await client.connect();

    // O papel de runtime não enxerga nada sem contexto, então o preparo usa o owner.
    const owner = new Client({ connectionString: process.env.DATABASE_URL });
    await owner.connect();
    try {
      await owner.query("SELECT set_config('app.is_platform', 'true', false)");
      const tenant = await owner.query<{ id: string }>('SELECT id FROM tenant LIMIT 1');
      tenantId = tenant.rows[0]?.id ?? '';

      await owner.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]);
      await owner.query("SELECT set_config('app.is_platform', 'false', false)");
      const familia = await owner.query<{ id: string }>('SELECT id FROM familia ORDER BY codigo LIMIT 1');
      familiaId = familia.rows[0]?.id ?? '';
    } finally {
      await owner.end();
    }
  });

  afterAll(async () => {
    await client.end();
  });

  async function comContexto(
    ctx: { tenant?: string; plataforma?: boolean; familia?: string },
    sql: string,
    params: unknown[] = [],
  ) {
    await client.query('BEGIN');
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [ctx.tenant ?? '']);
      await client.query("SELECT set_config('app.is_platform', $1, true)", [
        ctx.plataforma ? 'true' : 'false',
      ]);
      await client.query("SELECT set_config('app.current_familia', $1, true)", [ctx.familia ?? '']);
      return await client.query(sql, params);
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('o papel de runtime não tem superuser nem BYPASSRLS', async () => {
    const { rows } = await client.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
    );

    expect(rows[0]?.rolsuper).toBe(false);
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it('sem contexto, nenhuma família é visível', async () => {
    const { rows } = await comContexto({}, 'SELECT count(*)::int AS total FROM familia');

    expect(rows[0]?.total).toBe(0);
  });

  it('com o tenant no contexto, as famílias da prefeitura aparecem', async () => {
    const { rows } = await comContexto(
      { tenant: tenantId },
      'SELECT count(*)::int AS total FROM familia',
    );

    expect(rows[0]?.total).toBeGreaterThan(0);
  });

  it('com outro tenant no contexto, nada vaza', async () => {
    const { rows } = await comContexto(
      { tenant: 'tenant-que-nao-existe' },
      'SELECT count(*)::int AS total FROM familia',
    );

    expect(rows[0]?.total).toBe(0);
  });

  it('plataforma não enxerga dado de família — bypass vale só para administração', async () => {
    const familias = await comContexto(
      { plataforma: true },
      'SELECT count(*)::int AS total FROM familia',
    );
    const tenants = await comContexto(
      { plataforma: true },
      'SELECT count(*)::int AS total FROM tenant',
    );

    expect(familias.rows[0]?.total).toBe(0);
    expect(tenants.rows[0]?.total).toBeGreaterThan(0);
  });

  it('munícipe enxerga a própria família e só ela', async () => {
    const { rows } = await comContexto(
      { familia: familiaId },
      'SELECT id FROM familia',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(familiaId);
  });

  it('munícipe enxerga apenas a própria inscrição', async () => {
    const { rows } = await comContexto(
      { familia: familiaId },
      'SELECT "familiaId" FROM inscricao_fila',
    );

    expect(rows.every((linha) => linha.familiaId === familiaId)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('a trilha de auditoria é append-only: update e delete não passam', async () => {
    await comContexto({ tenant: tenantId }, 'INSERT INTO audit_log (id, "tenantId", "actorType", operation, entity) VALUES ($1, $2, $3, $4, $5)', [
      'log-teste-rls',
      tenantId,
      'SYSTEM',
      'INSERT',
      'teste',
    ]);

    const update = await comContexto(
      { tenant: tenantId },
      `UPDATE audit_log SET entity = 'adulterado' WHERE "tenantId" = $1`,
      [tenantId],
    );
    const remocao = await comContexto(
      { tenant: tenantId },
      'DELETE FROM audit_log WHERE "tenantId" = $1',
      [tenantId],
    );

    expect(update.rowCount).toBe(0);
    expect(remocao.rowCount).toBe(0);
  });
});
