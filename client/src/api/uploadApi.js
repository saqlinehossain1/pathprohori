import API from './axiosConfig';

export const uploadApi = {
  uploadImage: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const { data } = await API.post('/upload', { image: base64Data });
          resolve(data.url);
        } catch (error) {
          console.error('[Upload API Error]', error);
          reject(error.response?.data?.message || 'Image upload failed');
        }
      };
      reader.onerror = (error) => reject(error);
    });
  },

  deleteImage: async (url) => {
    if (!url) return;
    try {
      const { data } = await API.post('/upload/delete', { url });
      return data;
    } catch (error) {
      console.error('[Delete Upload API Error]', error);
    }
  },
};

export default uploadApi;
