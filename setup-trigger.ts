import 'dotenv/config';

async function instrumentation() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DIRECT_URL });

  try {
    // Connect to Postgres
    await client.connect();
    // allow realtime
    await client.query(`
      alter publication supabase_realtime add table "Receipt";
      alter publication supabase_realtime add table "ReceiptMockParticipant";
      alter publication supabase_realtime add table "ReceiptRealParticipant";
    `);
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
    `);
    // fix upload
    await client.query(`
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_0" ON storage.objects FOR SELECT TO public USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_1" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
    `);

    console.log("Realtime publication setup complete.");
    await client.end();
  } catch (e) {
    console.log(e);
  }
}
instrumentation().catch(console.log);