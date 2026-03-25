#!/usr/bin/env node
/**
 * test_connection.js
 * Quick script to test connectivity to the Postgres database using DATABASE_URL
 */
const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Try loading .env from the current working directory (default) and then
// from the parent directory if not found. This helps when the script is run
// from a different working directory or when VS Code loads env from workspace root.
const triedEnvPaths = [];
// default load (cwd)
triedEnvPaths.push(path.resolve(process.cwd(), '.env'));
dotenv.config();
// if not set, try one level up (useful when running from project root)
if(!process.env.DATABASE_URL){
  const parentEnv = path.resolve(__dirname, '..', '.env');
  triedEnvPaths.push(parentEnv);
  dotenv.config({ path: parentEnv });
}

async function main(){
  const conn = process.env.DATABASE_URL;
  if(!conn){
    console.error('ERROR: DATABASE_URL is not set in environment or .env');
    console.error('Paths checked for .env:');
    triedEnvPaths.forEach(p => console.error(' -', p));
    console.error('You can set it for this PowerShell session with:');
    console.error("  $env:DATABASE_URL = 'postgresql://user:pw@host:5432/db'\n");
    process.exit(1);
  }

  const client = new Client({ connectionString: conn, ssl: conn ? { rejectUnauthorized: false } : false });
  try{
    console.log('Attempting to connect to database...');
    await client.connect();
    const res = await client.query('SELECT NOW() as now, version();');
    console.log('Connected. Server response:');
    console.log(res.rows[0]);
    await client.end();
    process.exit(0);
  }catch(err){
    console.error('Connection failed:', err.message || err);
    try{ await client.end(); }catch(e){}
    process.exit(2);
  }
}

main();
