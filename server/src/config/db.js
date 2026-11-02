/**
 * MongoDB connection via Mongoose.
 */
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error('connectDb: mongoUri is required');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB');
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
