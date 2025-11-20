#!/usr/bin/env node
/**
 * db_roundtrip.js
 * Simple script that uses DATABASE_URL to insert a device and an event,
 * then fetches events for that device. This runs server-side and does
 * not require Supabase HTTP API keys.
 */
const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// load .env from cwd or parent (same logic as test_connection.js)
dotenv.config();
if(!process.env.DATABASE_URL){
  const parentEnv = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: parentEnv });
}

async function main(){
  const conn = process.env.DATABASE_URL;
  if(!conn){
    console.error('ERROR: DATABASE_URL is not set. Please set it in .env or as an environment variable.');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn, ssl: conn ? { rejectUnauthorized: false } : false });
  try{
    console.log('Connecting to DB...');
    await client.connect();

    const deviceId = 'test-device-1';
    console.log('Ensuring device exists:', deviceId);
    await client.query(
      `INSERT INTO devices (id, name, owner_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [deviceId, 'Test Device', 'local-test']
    );

    console.log('Inserting an event...');
    const insertRes = await client.query(
      `INSERT INTO events (device_id, ts, event_type, payload)
       VALUES ($1, now(), $2, $3) RETURNING id, ts`,
      [deviceId, 'integration_test', { note: 'Inserted by db_roundtrip.js' }]
    );
    console.log('Inserted event id:', insertRes.rows[0].id, 'at', insertRes.rows[0].ts);

    console.log('Querying recent events for device...');
    const rows = await client.query('SELECT id, device_id, ts, event_type, payload FROM events WHERE device_id = $1 ORDER BY ts DESC LIMIT 10', [deviceId]);
    console.log(`Found ${rows.rowCount} event(s):`);
    rows.rows.forEach(r => console.log(JSON.stringify(r)));

    await client.end();
    process.exit(0);
  }catch(err){
    console.error('Error during DB roundtrip:', err.message || err);
    try{ await client.end(); }catch(e){}
    process.exit(2);
  }
}

main();
