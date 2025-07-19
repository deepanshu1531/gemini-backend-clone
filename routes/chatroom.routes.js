const express = require('express');
const chatroomController = require('../controllers/chatroom.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimitMiddleware = require('../middlewares/rateLimit.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Protected routes (require JWT authentication)
router.use(authMiddleware.authenticate);

// Create new chatroom
router.post('/', 
  asyncHandler(chatroomController.createChatroom));

// List all chatrooms (with Redis caching)
router.get('/', 
  asyncHandler(chatroomController.getChatrooms));

// Get specific chatroom details
router.get('/:id', 
  asyncHandler(chatroomController.getChatroom));

// Send message to chatroom (with rate limiting for basic users)
router.post('/:id/message', 
  rateLimitMiddleware.checkRateLimit,
  asyncHandler(chatroomController.sendMessage));

module.exports = router;