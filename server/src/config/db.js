import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
    process.exit(1);
  }
};
