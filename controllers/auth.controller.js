const User = require('../models/User');
const Subscription = require('../models/Subscription');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const otpService = require('../services/otp.service');
const AppError = require('../errors/AppError'); 

exports.signup = async (req, res, next) => {
    try {
        const { email, password, mobile } = req.body;

        // Validate input
        if (!email && !mobile) {
            throw new AppError('Email or mobile number is required', 400);
        }
        if (email && !password) {
            throw new AppError('Password is required for email signup', 400);
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            throw new AppError('User with this email or mobile already exists', 400);
        }

        // Create new user
        const newUser = await User.create({
            email,
            password,
            mobile
        });

        // Assign a default subscription
        const newSubscription = await Subscription.create({
            user: newUser._id,
            stripeCustomerId: `temp_${newUser._id}`,
            plan: 'basic',
            status: 'active'
        });

        // Update user with subscription reference
        newUser.subscription = newSubscription._id;

        newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
        });
    } catch (error) {
        next(error);
    }
};

exports.sendOTP = async (req, res, next) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            throw new AppError('Mobile number is required', 400);
        }

        // Generate OTP
        const otp = otpService.generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Find or create user
        let user = await User.findOne({ mobile });
        if (!user) {
            user = new User({ mobile });
        }

        // Save OTP
        user.otp = { code: otp, expiresAt };
        await user.save();

        // Returned otp in response
        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: { otp }
        });
    } catch (error) {
        next(error); // Pass errors to the error handler middleware
    }
};

exports.verifyOTP = async (req, res, next) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            throw new AppError('Mobile number and OTP are required', 400);
        }

        const user = await User.findOne({ mobile });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if OTP exists
        if (!user.otp || !user.otp.code) {
            throw new AppError('No OTP requested for this number', 400);
        }

        const isValid = await otpService.verifyOTP(user, otp);
        if (!isValid) {
            throw new AppError('Invalid or expired OTP', 400);
        }

        // Clear OTP after successful verification
        user.otp = undefined;
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email, mobile: user.mobile },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: { token }
        });
    } catch (error) {
        next(error); // Pass errors to the error handler middleware
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            throw new AppError('Mobile number is required', 400);
        }

        const user = await User.findOne({ mobile });
        if (!user) {
            throw new AppError('No user found with that mobile number', 404);
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Send email
        const resetURL = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;

        try {
            res.status(200).json({
                success: true,
                message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            throw new AppError('There was an error sending the email. Try again later!', 500);
        }
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            throw new AppError('Password is required', 400);
        }

        // Get user based on token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new AppError('Token is invalid or has expired', 400);
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            throw new AppError('Both current and new passwords are required', 400);
        }

        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Verify current password
        if (!(await user.correctPassword(currentPassword))) {
            throw new AppError('Your current password is wrong', 401);
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-otp -__v -passwordResetToken -passwordResetExpires')
            .populate('subscription');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                mobile: user.mobile,
                subscription: user.subscription,
                dailyPromptCount: user.dailyPromptCount,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};