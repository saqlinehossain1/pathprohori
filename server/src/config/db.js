import mongoose from 'mongoose';
import dns from 'dns';

// Reliable DNS resolution fallback for Windows Node querySrv ESERVFAIL
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
    console.error('[MongoDB Fix] Update server/.env with a reachable MongoDB Atlas connection string and allow this IP in Atlas Network Access.');
    process.exit(1);
  }
};
