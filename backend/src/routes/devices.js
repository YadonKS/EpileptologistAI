const express = require('express');
const router = express.Router();

// POST /devices/:id/data
router.post('/:id/data', (req, res) => {
  // TODO: validate device token, parse data, store events
  res.json({status: 'ok'});
});

module.exports = router;
