#!/usr/bin/env node
/**
 * apply_schema.js
 *
 * Read backend/src/schema.sql and run it against the database specified
 * by the environment variable DATABASE_URL.
 *
 * Usage:
 *   set DATABASE_URL=postgresql://user:pass@host:5432/dbname
 *   node scripts/apply_schema.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function main(){
  const conn = process.env.DATABASE_URL;
  if(!conn){
    console.error('ERROR: DATABASE_URL env var is not set.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'src', 'schema.sql');
  if(!fs.existsSync(schemaPath)){
    console.error('ERROR: schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({
    connectionString: conn,
    ssl: conn ? { rejectUnauthorized: false } : false,
  });

  try{
    console.log('Connecting to database...');
    await client.connect();
    console.log('Applying schema from', schemaPath);
    // Execute the whole file content. For most providers this works fine.
    await client.query(sql);
    console.log('Schema applied successfully.');
  }catch(err){
    console.error('Failed to apply schema:', err.message || err);
    process.exitCode = 2;
  }finally{
    await client.end();
  }
}

main();
