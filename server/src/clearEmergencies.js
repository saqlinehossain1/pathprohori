import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Emergency } from './models/Emergency.js';

dotenv.config();

const clearStaleEmergencies = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://saqlinehussain:Donottry2@cluster0.lgfmhge.mongodb.net/pathprohori?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('[Database] Connected to MongoDB...');

    const result = await Emergency.updateMany({ status: 'ACTIVE' }, { $set: { status: 'RESOLVED', resolvedAt: new Date() } });
    console.log(`[Database Clean] Resolved ${result.modifiedCount} active test emergencies.`);

    await mongoose.disconnect();
    console.log('[Database] Disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[Clean Error]', error);
    process.exit(1);
  }
};

clearStaleEmergencies();
