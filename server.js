const app = require('./app');
const { getRedisClient, closeRedisClient } = require('./config/redis');
const { geminiWorker } = require('./config/gemini.queue');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize Redis connection
    const redisClient = await getRedisClient();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Verify BullMQ worker is running
    geminiWorker.on('ready', () => {
      console.log('BullMQ worker is ready');
    });

    // Graceful shutdown handler
    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      try {
        // Close worker first
        if (geminiWorker) {
          await geminiWorker.close();
          console.log('BullMQ worker closed');
        }

        // Then close Redis
        await closeRedisClient();
        console.log('Redis connection closed');

        // Finally close server
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });

        // Force exit if server doesn't close in time
        setTimeout(() => {
          console.error('Forcing shutdown...');
          process.exit(1);
        }, 5000).unref();

      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err);
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      shutdown('uncaughtException');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    await closeRedisClient();
    process.exit(1);
  }
}

startServer();