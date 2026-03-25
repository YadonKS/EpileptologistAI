const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));

// Postgres pool using DATABASE_URL from env
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('WARNING: DATABASE_URL not set. Database operations will fail.');
}

const pool = new Pool({
  connectionString,
  // Many hosted Postgres providers require SSL. If you see certificate errors,
  // try the setting below. In production, provide a proper CA cert instead.
  ssl: connectionString ? { rejectUnauthorized: false } : false,
});

// Simple health
app.get('/health', (req, res) => res.json({status: 'ok'}));

// Device registration endpoint (placeholder)
app.post('/devices/register', (req, res) => {
  // register device, return device token
  res.json({ deviceId: 'device-placeholder' });
});

// Receive batched EEG or event data and insert into events table
app.post('/devices/:id/data', async (req, res) => {
  const deviceId = req.params.id;
  const payload = req.body;
  const ts = payload.ts ? new Date(payload.ts) : new Date();
  const eventType = payload.event_type || 'telemetry';

  try {
    const q = 'INSERT INTO events(device_id, ts, event_type, payload) VALUES($1, $2, $3, $4) RETURNING id';
    const values = [deviceId, ts, eventType, payload];
    const result = await pool.query(q, values);
    res.json({ status: 'ok', id: result.rows[0].id });
  } catch (err) {
    console.error('DB insert error', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
