const User = require('../models/User');
const Chatroom = require('../models/Chatroom');
const Subscription = require('../models/Subscription');
const { getRedisClient } = require('../config/redis');
const { geminiQueue } = require('../config/gemini.queue');

// Cache key generator
const getCacheKey = (userId) => `user:${userId}:chatrooms`;

exports.createChatroom = async (req, res, next) => {
  try {
    const { title } = req.body;
    const userId = req.user._id;

    const chatroom = new Chatroom({
      userId,
      title: title || 'New Chat'
    });

    await chatroom.save();

    const redisClient = await getRedisClient();
    // Invalidate cache.
    // new chatroom is created, any previously cached data related to this user's chatrooms becomes outdated.
    await redisClient.del(getCacheKey(userId));

    res.status(201).json({
      success: true,
      message: 'Chatroom created successfully',
      data: chatroom
    });
  } catch (error) {
    next(error);
  }
};

exports.getChatrooms = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cacheKey = getCacheKey(userId);

    const redisClient = await getRedisClient();
    // Check cache first
    // Speed: Redis is an in-memory data store, 
    // so fetching data from Redis is 100x faster than querying a database (MongoDB/PostgreSQL).
    // Reduce Database Load: If the data is already cached, 
    // the app avoids hitting the database, reducing load and improving scalability.
    const cachedChatrooms = await redisClient.get(cacheKey);
    if (cachedChatrooms) {
      return res.status(200).json({
        success: true,
        message: 'Chatrooms retrieved from cache',
        data: JSON.parse(cachedChatrooms)
      });
    }

    // Fetch from DB if not in cache
    const chatrooms = await Chatroom.find({ userId })
      .sort({ updatedAt: -1 })
      .select('-messages -__v');

    // After fetching fresh data from MongoDB, 
    // it stores it in Redis so that the next request can use the cached version.
    // 600 = 10 minutes (expires automatically after this time).
    await redisClient.setEx(cacheKey, 600, JSON.stringify(chatrooms));

    res.status(200).json({
      success: true,
      message: 'Chatrooms retrieved from DB',
      data: chatrooms
    });
  } catch (error) {
    next(error);
  }
};

exports.getChatroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const chatroom = await Chatroom.findOne({
      _id: id,
      userId // Ensure user owns the chatroom
    }).select('-__v -userId');

    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'Chatroom not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: chatroom
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const chatroomId = req.params.id;
    const content = req.body.content;
    const userId = req.user._id;

    // Add user message to chatroom
    const chatroom = await Chatroom.findOne({ _id: chatroomId, userId });
    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'Chatroom not found'
      });
    }

    chatroom.messages.push({
      content,
      sender: 'user'
    });

    await chatroom.save();

    // Add to queue for Gemini processing
    const job = await geminiQueue.add('process-message', { 
      chatroomId: String(chatroomId),
      content: String(content),
      userId: String(userId)
    });

    res.status(200).json({
      success: true,
      message: 'Message sent. AI response will be processed shortly.',
      data: {
        messageId: chatroom.messages[chatroom.messages.length - 1]._id,
        jobId: job.id
      }
    });
  } catch (error) {
    console.log(error)
    next(error);
  }
};