const { Queue, Worker } = require('bullmq');
const { redisConfig } = require('./redis');
const geminiService = require('../services/gemini.service');
const Chatroom = require('../models/Chatroom');

// Queue that holds jobs for the Gemini AI service.
const geminiQueue = new Queue('gemini-queue', { // gemini-queue (to identify it in Redis).
  connection: redisConfig, // redisConfig for connecting to Redis.
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times.
    backoff: {
      type: 'exponential', // wait longer between retries
      delay: 2000
    },
    removeOnComplete: true, // remove completed jobs
    removeOnFail: 100 // keep only 100 failed jobs.
  }
});

// Worker processing function
const processGeminiJob = async (job) => {
  try {
    const { chatroomId, content, userId } = job.data;

    const aiResponse = await geminiService.generateResponse(content);

    const chatroom = await Chatroom.findOne({ _id: chatroomId, userId });
    if (!chatroom) throw new Error('Chatroom not found');

    chatroom.messages.push({
      content: aiResponse,
      sender: 'ai'
    });

    await chatroom.save();
    
    return {
      success: true,
      chatroomId,
      messageId: chatroom.messages[chatroom.messages.length - 1]._id
    };
  } catch (error) {
    console.error('Error processing Gemini job:', error);
    clearGeminiQueue();
    throw error;
  }
};

// Worker that processes jobs from geminiQueue
const geminiWorker = new Worker('gemini-queue', // Listens to the gemini-queue for new jobs.
  processGeminiJob, { // Uses the processGeminiJob function to handle each job.
  connection: redisConfig,
  concurrency: 5, // can process 5 jobs at the same time
  limiter: { max: 30, duration: 1000 } // max 30 jobs per second to avoid overloading
});

// Clear Gemini queue
async function clearGeminiQueue() {
  try {
    // Get all job IDs in the queue
    const jobs = await geminiQueue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed']);

    // Remove each job
    for (const job of jobs) {
      await job.remove();
    }

    // Alternatively, you can use the more efficient clean method
    // This will remove all jobs in the specified states
    await geminiQueue.obliterate({ force: true });

    console.log('Gemini queue has been cleared successfully');
    return { success: true, message: 'Queue cleared' };
  } catch (error) {
    console.error('Error clearing Gemini queue:', error);
    throw error;
  }
}

// Event listeners
geminiWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

geminiWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

module.exports = {
  geminiQueue,
  geminiWorker,
  processGeminiJob,
  clearGeminiQueue
};