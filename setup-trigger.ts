async function instrumentation() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DIRECT_URL });

  try {
    // Connect to Postgres
    await client.connect();
    // Define the my_trigger_function function to send notifications
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_change()
      RETURNS TRIGGER AS $$
      DECLARE
        payload TEXT;
      BEGIN
        -- Отправляем уведомление
        PERFORM pg_notify('receipt-' || new.ID, 'update');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    // Create the my_trigger to call the my_trigger_function after each insert
    await client.query(`
      CREATE OR REPLACE TRIGGER notify_on_change
      AFTER UPDATE ON public."Receipt"
      FOR EACH ROW
      EXECUTE FUNCTION notify_change();
    `);
    console.log('Event triggers setup complete.');
    await client.end();
  } catch (e) {
    console.log(e);
  }
}
instrumentation().catch(console.log);