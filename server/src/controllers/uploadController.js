import cloudinary, { deleteCloudinaryImage } from '../config/cloudinary.js';

// @desc    Upload image to Cloudinary
// @route   POST /api/upload
export const uploadImage = async (req, res, next) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'No image data provided for upload' });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: folder || 'pathprohori',
      resource_type: 'auto',
    });

    res.status(200).json({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error('[Cloudinary Upload Error]', error);
    res.status(500).json({ message: error.message || 'Image upload failed' });
  }
};

// @desc    Delete image asset from Cloudinary
// @route   POST /api/upload/delete
export const deleteImage = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'No image URL provided for deletion' });
    }

    await deleteCloudinaryImage(url);
    res.status(200).json({ message: 'Image asset deleted from Cloudinary successfully' });
  } catch (error) {
    console.error('[Cloudinary Delete Error]', error);
    res.status(500).json({ message: error.message || 'Image deletion failed' });
  }
};
