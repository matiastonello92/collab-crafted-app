import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/service';
import { getSupabaseServiceRoleKey } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      return NextResponse.json({ ok: false, error: 'db_not_configured' }, { status: 503 });
    }

    let supabase;
    try {
      getSupabaseServiceRoleKey();
      supabase = admin;
    } catch {
      return NextResponse.json({ ok: false, error: 'service_role_not_configured' }, { status: 503 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const { Client } = await import('pg');
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      const required: Record<string, string[]> = {
        orgs: ['id', 'name'],
        locations: ['id', 'org_id', 'name'],
        users: ['id'],
        users_locations: ['user_id', 'org_id', 'location_id'],
        roles: ['id', 'org_id', 'code', 'name'],
        user_roles: ['user_id', 'org_id', 'role_id', 'location_id'],
      };
      const missing: string[] = [];
      for (const [table, cols] of Object.entries(required)) {
        const t = await client.query(
          'select 1 from information_schema.tables where table_schema=$1 and table_name=$2',
          ['public', table]
        );
        if (t.rowCount === 0) {
          missing.push(table);
          continue;
        }
        for (const col of cols) {
          const c = await client.query(
            'select 1 from information_schema.columns where table_schema=$1 and table_name=$2 and column_name=$3',
            ['public', table, col]
          );
          if (c.rowCount === 0) missing.push(`${table}.${col}`);
        }
      }
      if (missing.length) {
        return NextResponse.json({ ok: false, error: 'schema_mismatch', detail: missing.join(',') }, { status: 422 });
      }

      await client.query('BEGIN');
      const orgRes = await client.query(
        "insert into orgs(name) values('Demo Org') on conflict (name) do update set name=excluded.name returning id"
      );
      const orgId = orgRes.rows[0].id;
      const locRes = await client.query(
        "insert into locations(org_id, name) values($1, 'Main') on conflict (org_id, name) do update set name=excluded.name returning id",
        [orgId]
      );
      const locationId = locRes.rows[0].id;
      await client.query('insert into users(id) values ($1) on conflict (id) do nothing', [userId]);
      const roleRes = await client.query(
        "insert into roles(org_id, code, name) values($1, 'admin', 'Admin') on conflict (org_id, code) do update set name=excluded.name returning id",
        [orgId]
      );
      const roleId = roleRes.rows[0].id;
      await client.query(
        'insert into users_locations(user_id, org_id, location_id) values ($1,$2,$3) on conflict do nothing',
        [userId, orgId, locationId]
      );
      await client.query(
        'insert into user_roles(user_id, org_id, role_id) values ($1,$2,$3) on conflict do nothing',
        [userId, orgId, roleId]
      );
      await client.query('COMMIT');

      return NextResponse.json({
        ok: true,
        user_id: userId,
        org_id: orgId,
        location_id: locationId,
        role_id: roleId,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      const detail = err instanceof Error ? err.message : String(err);
      if (/relation|column/.test(detail)) {
        return NextResponse.json({ ok: false, error: 'schema_mismatch', detail }, { status: 422 });
      }
      return NextResponse.json({ ok: false, error: 'bootstrap_failed', detail }, { status: 500 });
    } finally {
      await client.end();
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'bootstrap_failed', detail }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}

