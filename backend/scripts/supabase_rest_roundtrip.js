#!/usr/bin/env node
/**
 * supabase_rest_roundtrip.js
 * Inserts an event via Supabase REST (PostgREST) and then fetches recent
 * events for the test device. This uses SUPABASE_URL and SUPABASE_SERVICE_ROLE
 * from environment or a local .env file (server-side only).
 */
const path = require('path');
const dotenv = require('dotenv');

// load .env from cwd or parent
dotenv.config();
if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE){
  const parentEnv = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: parentEnv });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if(!SUPABASE_URL || !SERVICE_ROLE){
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set in env or .env');
  console.error('Example .env entries:');
  console.error('  SUPABASE_URL=https://<project-ref>.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE=<service_role_key>');
  process.exit(1);
}

// Prefer global fetch (Node 18+). If not present, try to require node-fetch.
let fetchImpl = global.fetch;
if(!fetchImpl){
  try{
    // node-fetch v2/v3 compat
    fetchImpl = require('node-fetch');
  }catch(e){
    console.error('No global fetch available and node-fetch is not installed.');
    console.error('Install with: npm install node-fetch@2');
    process.exit(1);
  }
}

async function run(){
  const deviceId = 'rest-test-device-1';
  const event = { device_id: deviceId, ts: new Date().toISOString(), event_type: 'rest_roundtrip', payload: { note: 'inserted via REST' } };

  const insertUrl = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/events`;
  try{
    console.log('Inserting event via REST...');
    const insRes = await fetchImpl(insertUrl, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        // Ask PostgREST to return the inserted representation
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(event)
    });

    if(!insRes.ok){
      const text = await insRes.text();
      throw new Error(`Insert failed: ${insRes.status} ${insRes.statusText} - ${text}`);
    }
    const inserted = await insRes.json();
    console.log('Insert response:', inserted);

    console.log('Querying recent events for device via REST...');
    const queryUrl = `${insertUrl}?device_id=eq.${encodeURIComponent(deviceId)}&order=ts.desc&limit=10`;
    const qRes = await fetchImpl(queryUrl, {
      headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }
    });
    if(!qRes.ok){
      const text = await qRes.text();
      throw new Error(`Query failed: ${qRes.status} ${qRes.statusText} - ${text}`);
    }
    const rows = await qRes.json();
    console.log(`Found ${rows.length} event(s):`);
    console.log(JSON.stringify(rows, null, 2));

    console.log('REST roundtrip completed successfully.');
  }catch(err){
    console.error('Error during REST roundtrip:', err.message || err);
    process.exit(2);
  }
}

run();
