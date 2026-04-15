import mongoose from 'mongoose';

let connectionPromise = null;

export async function connectMongo() {
  const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
  if (!uri) return { enabled: false, mongoose };

  // Keep unit/integration tests hermetic and fast by default.
  // If you want Mongo-backed tests, set ENABLE_MONGO_TESTS=true.
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST) || Boolean(process.env.VITEST_WORKER_ID);
  if (isTestEnv && process.env.ENABLE_MONGO_TESTS !== 'true') {
    return { enabled: false, mongoose };
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  await connectionPromise;
  return { enabled: true, mongoose };
}

