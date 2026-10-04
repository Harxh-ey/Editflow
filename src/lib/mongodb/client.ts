import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(MONGODB_URI);
}

export async function getDb(): Promise<Db | null> {
  if (!MONGODB_URI) {
    return null;
  }

  if (cachedDb) {
    return cachedDb;
  }

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(MONGODB_URI);
      await cachedClient.connect();
    }
    cachedDb = cachedClient.db(process.env.MONGODB_DB || 'editflow');

    if (process.env.NODE_ENV === 'development') {
      const globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
        _mongoDb?: Db;
      };
      globalWithMongo._mongoClient = cachedClient;
      globalWithMongo._mongoDb = cachedDb;
    }

    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
}
