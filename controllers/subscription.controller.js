const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createCustomer, createCheckoutSession, webhookHandle } = require('../services/stripe.service')

exports.initiateSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      let err = new Error('User not found');
      req.statusCode = 404;
      next(err);
    }

    // Check if user already has an active subscription
    const existingSub = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trialing'] }
    });

    if (existingSub.plan === 'pro') {
      let err = new Error('User already has an pro subscription');
      req.statusCode = 400;
      next(err);
    }

    // Create Stripe customer if not exists
    let customer = await createCustomer(user);

    // Create Checkout Session
    const session = await createCheckoutSession(customer, userId);

    res.status(200).json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.log(error)
    next(error);
  }
};

exports.getSubscriptionStatus = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: {
          plan: 'basic',
          status: 'none'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res, next) => {

  console.log("********************========= Webhook Events =========********************")
  const sig = req.headers['stripe-signature'];
  const payload = req.body;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    err.statusCode = 400;
    throw err;
  }

  try {
    await webhookHandle(event);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};