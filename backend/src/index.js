const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));

// Simple health
app.get('/health', (req, res) => res.json({status: 'ok'}));

// Device registration and data endpoints (placeholder)
app.post('/devices/register', (req, res) => {
  // register device, return device token
  res.json({ deviceId: 'device-placeholder' });
});

app.post('/devices/:id/data', (req, res) => {
  // receive batched EEG or event data
  console.log('Received data for device', req.params.id);
  res.json({ status: 'received' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
