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
    `);
    console.log('Realtime publication setup complete.');
    await client.end();
  } catch (e) {
    console.log(e);
  }
}
instrumentation().catch(console.log);