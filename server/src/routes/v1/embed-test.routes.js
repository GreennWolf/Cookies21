/**
 * EMBED TEST ROUTES - Simplified version for testing
 */

const express = require('express');
const router = express.Router();

// Simple health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'embed-cookie-detection',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Simple cookie detection endpoint
router.post('/detect', (req, res) => {
  console.log('🍪 Cookie detection data received:', req.body);
  
  res.status(200).json({
    status: 'success',
    message: 'Cookie data received successfully',
    processed: {
      cookies: 1,
      storage: 0,
      thirdPartyScripts: 0
    }
  });
});

module.exports = router;