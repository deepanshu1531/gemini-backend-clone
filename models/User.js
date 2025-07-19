const Subscription = require('../models/Subscription')
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    mobile: {
        type: String,
        unique: true,
        sparse: true // Allows null if not provided
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },
    password: {
        type: String,
        select: false // Never return password in queries
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Subscription
    },
    stripeCustomerId: String,
    dailyPromptCount: {
        type: Number,
        default: 0
    },
    lastPromptDate: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Hash OTP before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('otp.code') && this.otp.code) {
        this.otp.code = await bcrypt.hash(this.otp.code, 8);
    }
    next();
});

// Method to compare passwords
userSchema.methods.correctPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
};

module.exports = mongoose.model('User', userSchema);