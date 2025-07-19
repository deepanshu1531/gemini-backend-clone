require('dotenv').config({ path: '.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler.middleware');

// Import route handlers (not the router instances)
const authRouter = require('./routes/auth.routes');
const chatroomRouter = require('./routes/chatroom.routes');
const subscriptionRouter = require('./routes/subscription.routes');
const stripeRouter = require('./routes/stripe.routes');
const devRouter = require('./routes/dev.routes');
const { handleWebhook } = require('./controllers/subscription.controller');

const app = express();

// Database connection
connectDB();

// Middlewares
app.use(cors());
app.use(morgan('dev'));

// Only use express.json for non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') {
    next(); // skip json parser for Stripe webhook
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use('/auth', authRouter);
app.use('/chatroom', chatroomRouter);
app.use('/webhook/stripe', stripeRouter);
app.use('/subscribe', subscriptionRouter);
app.use('/subscription', subscriptionRouter);

// Dev routes.
app.use('/dev', devRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;