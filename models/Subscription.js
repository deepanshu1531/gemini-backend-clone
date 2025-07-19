const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    stripeCustomerId: {
        type: String,
        required: true,
        unique: true
    },
    stripeSubscriptionId: {
        type: String,
        unique: true,
        sparse: true // Allows null values without triggering unique constraint
    },
    plan: {
        type: String,
        enum: ['basic', 'pro'],
        default: 'basic'
    },
    status: {
        type: String,
        enum: ['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing'],
        default: 'active'
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    paymentMethod: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});


subscriptionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get user's subscription
subscriptionSchema.statics.findByUserId = async function (userId) {
    return this.findOne({ user: userId }).populate('user', 'mobile');
};

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
    return this.status === 'active' || this.status === 'trialing';
};

module.exports = mongoose.model('Subscription', subscriptionSchema);