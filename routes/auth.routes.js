// routes/auth.routes.js
const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public routes
router.post('/signup', asyncHandler(authController.signup));
router.post('/send-otp', asyncHandler(authController.sendOTP));
router.post('/verify-otp', asyncHandler(authController.verifyOTP));
router.post('/forgot-password', asyncHandler(authController.forgotPassword));
router.patch('/reset-password/:token', asyncHandler(authController.resetPassword));

// Protected routes
router.post('/change-password', 
    authMiddleware.authenticate, 
    asyncHandler(authController.changePassword));

router.get('/me', 
    authMiddleware.authenticate, 
    asyncHandler(authController.getCurrentUser));

module.exports = router;