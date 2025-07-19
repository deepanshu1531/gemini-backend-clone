const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');

module.exports = {
  createCustomer: async (user) => {
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: `${user.mobile}@gemini-clone.com`,
        metadata: { userId: user._id.toString() }
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    return customer;
  },

  createCheckoutSession: async (customer, userId) => {
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.BACKEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BACKEND_URL}/subscription/cancel`,
      subscription_data: {
        metadata: { userId: userId.toString() }
      }
    });
    return session;
  },

  webhookHandle: async (event) => {
    const subscription = event.data.object;
    const sub = await stripe.subscriptions.retrieve(subscription.subscription);
    const userId = sub.metadata.userId;

    switch (event.type) {
      case 'checkout.session.completed':
        if (subscription.mode === 'subscription') {
          await Subscription.findOneAndUpdate(
            { user: userId },
            {
              user: userId,
              stripeCustomerId: sub.customer,
              plan: 'pro',
              status: sub.status,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days from now,
              cancelAtPeriodEnd: sub.cancel_at_period_end
            },
            { upsert: true }
          );
        }
        break;

      case 'customer.subscription.updated':
        await Subscription.findOneAndUpdate(
          { user: userId },
          {
            status: subscription.status,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end
          }
        );
        break;

      case 'customer.subscription.deleted':
        await Subscription.findOneAndUpdate(
          { user: userId },
          { status: 'canceled' }
        );
        break;
    }
  }
};
