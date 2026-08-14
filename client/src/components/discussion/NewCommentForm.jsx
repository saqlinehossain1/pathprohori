import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../common/Button';
import uploadApi from '../../api/uploadApi';
import { Send, Upload, CheckCircle, Image, User } from 'lucide-react';

export const NewCommentForm = ({ onSubmit, loading }) => {
  const { user } = useContext(AuthContext);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      setUploadSuccess(false);
      const url = await uploadApi.uploadImage(file);
      setImageUrl(url);
      setUploadSuccess(true);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Cloudinary upload failed: ' + err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit({ text, imageUrl });
    setText('');
    setImageUrl('');
    setUploadSuccess(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-3xl border border-[#E0D5DC] shadow-xs">
      <div className="flex items-start gap-3">
        {/* User Profile Avatar next to Comment Box */}
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#6B4355] flex-shrink-0 shadow-xs mt-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#6B4355] text-white flex-shrink-0 flex items-center justify-center font-extrabold text-sm shadow-xs mt-1">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
        )}

        <textarea
          rows="2"
          placeholder="Add an eyewitness update or community comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-3.5 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355] font-medium"
          required
        />
      </div>

      {/* Image Thumbnail Preview inside comment box */}
      {imageUrl && (
        <div className="rounded-2xl overflow-hidden max-h-48 border border-[#E0D5DC] bg-[#F9F8FA] p-1.5 ml-13 relative">
          <img src={imageUrl} alt="Attached Proof" className="w-full max-h-48 object-contain rounded-xl" />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EBF0] pt-2 ml-13">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F9F8FA] hover:bg-[#6B4355] hover:text-white border border-[#E0D5DC] text-[#6B4355] rounded-xl text-xs font-extrabold transition-all shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingImage ? 'Uploading...' : 'Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploadingImage}
              className="hidden"
            />
          </label>

          {uploadSuccess && (
            <span className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Photo Attached!
            </span>
          )}
        </div>

        <Button type="submit" size="sm" loading={loading} className="font-extrabold px-5 py-2">
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Post Comment
        </Button>
      </div>
    </form>
  );
};

export default NewCommentForm;
