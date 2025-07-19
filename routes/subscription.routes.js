const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Protected routes
router.post('/pro',
  authMiddleware.authenticate,
  asyncHandler(subscriptionController.initiateSubscription));

router.get('/status',
  authMiddleware.authenticate,
  asyncHandler(subscriptionController.getSubscriptionStatus));


module.exports = router;