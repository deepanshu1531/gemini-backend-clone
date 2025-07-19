const User = require('../models/User');

const Subscription = require('../models/Subscription');

exports.checkRateLimit = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    // Pro users have no limits
    if (subscription && subscription.plan === 'pro' && subscription.isActive()) {
      return next();
    }

    // Basic user rate limiting logic
    const user = await User.findById(req.user._id);
    const today = new Date();

    if (user.lastPromptDate === undefined || user.lastPromptDate.toDateString() !== today.toDateString()) {
      user.dailyPromptCount = 0;
      user.lastPromptDate = today;
    }

    if (user.dailyPromptCount >= 5) {
      let err = new Error('Daily limit exceeded. Upgrade to Pro for unlimited access.');
      err.statusCode = 429;
      throw err;
    }
    user.dailyPromptCount += 1;
    await user.save();
    next();
  } catch (error) {
    next(error);
  }
};