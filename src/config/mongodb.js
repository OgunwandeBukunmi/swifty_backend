import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/swifty';
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by hot reloading.
  if (!global._mongoClientPromise) {
    client = new MongoClient(process.env.MONGO_URI, options);
    global._mongoClientPromise = client.connect()
      .then((connectedClient) => {
        console.log('Successfully connected to MongoDB (Development - Global Instance)');
        return connectedClient;
      })
      .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(process.env.MONGO_URL, options);
  clientPromise = client.connect()
    .then((connectedClient) => {
      console.log('Successfully connected to MongoDB (Production)');
      return connectedClient;
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err);
      throw err;
    });
}

/**
 * Helper function to retrieve the MongoDB database instance.
 * @param {string} [dbName] - Optional database name (falls back to MONGODB_DB or 'swifty').
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb(dbName) {
  const conn = await clientPromise;
  return conn.db(dbName || process.env.MONGODB_DB || 'swifty');
}

export { client };
export default clientPromise;
