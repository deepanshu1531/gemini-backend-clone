const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: String,
    sender: {
        type: String,
        enum: ['user', 'ai']
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatroomSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [messageSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

chatroomSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chatroom', chatroomSchema);