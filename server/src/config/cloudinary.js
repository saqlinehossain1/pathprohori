import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || 'dqtgftupy',
  api_key: process.env.CLOUDINARY_API_KEY || '222616479995218',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vGv7T_QvLwT-mctXCCBJ9TkRCtA',
});

export const deleteCloudinaryImage = async (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return;
  try {
    // Extract public_id from Cloudinary URL:
    // e.g. "https://res.cloudinary.com/dqtgftupy/image/upload/v1723654321/pathprohori_incidents/xyz123.jpg"
    const parts = url.split('/upload/');
    if (parts.length < 2) return;
    const pathAfterUpload = parts[1];
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    const publicId = pathWithoutVersion.substring(0, pathWithoutVersion.lastIndexOf('.'));

    if (publicId) {
      const res = await cloudinary.uploader.destroy(publicId);
      console.log(`[Cloudinary Destroy] Asset '${publicId}' deleted:`, res);
    }
  } catch (err) {
    console.error('[Cloudinary Destroy Error]', err.message);
  }
};

export default cloudinary;
