import 'dotenv/config';

async function instrumentation() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DIRECT_URL });

  try {
    // Connect to Postgres
    await client.connect();
    // Define the my_trigger_function function to send notifications
    // Enable Realtime by adding the table to the publication
    await client.query(`
      alter publication supabase_realtime add table "Receipt";
      
      grant usage on schema public to postgres, anon, authenticated, service_role;

      grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
      grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
      grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

      alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
      
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_0" ON storage.objects FOR SELECT TO public USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
      CREATE POLICY "Give users authenticated access to folder 1lnm9mj_1" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
    `);
    console.log('Realtime publication setup complete.');
    await client.end();
  } catch (e) {
    console.log(e);
  }
}
instrumentation().catch(console.log);