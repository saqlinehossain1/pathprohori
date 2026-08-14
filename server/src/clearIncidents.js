import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Incident } from './models/Incident.js';

dotenv.config();

const clearAllIncidents = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://saqlinehussain:Donottry2@cluster0.lgfmhge.mongodb.net/pathprohori?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('[Database] Connected to MongoDB...');

    const result = await Incident.deleteMany({});
    console.log(`[Database Purge] Successfully deleted ${result.deletedCount} incident records from MongoDB!`);

    await mongoose.disconnect();
    console.log('[Database] Disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[Purge Error]', error);
    process.exit(1);
  }
};

clearAllIncidents();
