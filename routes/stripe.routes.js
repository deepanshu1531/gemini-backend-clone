const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');

const router = express.Router();

// Webhook (no auth needed)
router.post('/',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook);

module.exports = router;