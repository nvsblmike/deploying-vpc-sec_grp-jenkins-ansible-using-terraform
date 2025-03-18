import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};
let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    mongo: {
      conn: MongoClient | null;
      promise: Promise<MongoClient> | null;
    };
  };

  if (!globalWithMongo.mongo) {
    globalWithMongo.mongo = {
      conn: null,
      promise: null,
    };
  }

  if (!globalWithMongo.mongo.promise) {
    client = new MongoClient(uri, options);
    globalWithMongo.mongo.promise = client.connect();
  }
  clientPromise = globalWithMongo.mongo.promise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db();
}
