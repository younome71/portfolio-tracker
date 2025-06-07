const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

module.exports = router;
