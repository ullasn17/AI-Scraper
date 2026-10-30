import mongoose from 'mongoose';
import dns from 'dns';

try {
  // Prevent SRV ECONNREFUSED lookup failures on Windows local environments
  if (process.platform === 'win32') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch {
  // Ignore in sandboxed or serverless environments where custom DNS servers cannot be set
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[MongoDB Error] MONGODB_URI environment variable is missing in Vercel settings!');
    throw new Error('Please define the MONGODB_URI environment variable in Vercel');
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((instance) => {
      return instance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[MongoDB Error] Failed to connect to MongoDB Atlas:', e);
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
