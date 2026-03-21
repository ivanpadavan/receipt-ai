import 'dotenv/config';

function quoteIdent(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function ensureRealtimeTables(client: any, tableNames: string[]) {
  for (const tableName of tableNames) {
    const exists = await client.query(
      `
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = $1
        limit 1
      `,
      [tableName],
    );

    if (exists.rowCount && exists.rowCount > 0) {
      continue;
    }

    await client.query(
      `alter publication supabase_realtime add table ${quoteIdent(tableName)};`,
    );
  }
}

async function instrumentation() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DIRECT_URL });

  try {
    // Connect to Postgres
    await client.connect();
    // allow realtime
    await ensureRealtimeTables(client, [
      "Receipt",
      "ReceiptMockParticipant",
      "ReceiptUserParticipant",
      "ReceiptChat",
    ]);
    // fix realtime permissions
    await client.query(`
      grant usage on schema public to postgres, anon, authenticated, service_role;

      grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
      grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
      grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
    `);
    //fix realtime delete records (https://github.com/supabase/supabase/issues/4905)
    await client.query(`
      ALTER TABLE "Receipt" REPLICA IDENTITY FULL;
      ALTER TABLE "ReceiptMockParticipant" REPLICA IDENTITY FULL;
      ALTER TABLE "ReceiptUserParticipant" REPLICA IDENTITY FULL;
      ALTER TABLE "ReceiptChat" REPLICA IDENTITY FULL;
    `);
    // fix upload
    await client.query(`
      DROP POLICY IF EXISTS "Give users authenticated access to folder 1lnm9mj_0" ON storage.objects;
      DROP POLICY IF EXISTS "Give users authenticated access to folder 1lnm9mj_1" ON storage.objects;
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_0" ON storage.objects FOR SELECT TO public USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_1" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
    `);

    console.log("Realtime publication setup complete.");
  } catch (e) {
    console.log(e);
  } finally {
    await client.end().catch(() => {});
  }
}
instrumentation().catch(console.log);
