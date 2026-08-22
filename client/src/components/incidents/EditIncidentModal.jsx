import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import uploadApi from '../../api/uploadApi';
import { Upload, CheckCircle, Trash2, Edit3 } from 'lucide-react';

export const EditIncidentModal = ({ isOpen, onClose, onSubmit, incident }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationName: '',
    severity: 'Med Severity',
    imageUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (incident) {
      setFormData({
        title: incident.title || '',
        description: incident.description || '',
        locationName: incident.locationName || '',
        severity: incident.severity || 'Med Severity',
        imageUrl: incident.imageUrl || '',
      });
      setUploadSuccess(false);
    }
  }, [incident]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      setUploadSuccess(false);
      const url = await uploadApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      setUploadSuccess(true);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Cloudinary upload failed: ' + err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.imageUrl) {
      await uploadApi.deleteImage(formData.imageUrl);
    }
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setUploadSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!incident) return;
    try {
      setLoading(true);
      await onSubmit(incident._id, formData);
      onClose();
    } catch (err) {
      console.error('Failed to update incident report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Incident Hazard Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Hazard Title"
          placeholder="e.g. Street Fight / Road Block"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <Input
          label="Location Name"
          placeholder="e.g. Notun Bazar Intersection"
          value={formData.locationName}
          onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
            Severity Level
          </label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          >
            <option value="High Alert">High Alert (Immediate Danger)</option>
            <option value="Med Severity">Medium Severity (Caution Needed)</option>
            <option value="Low Severity">Low Severity (Minor Obstacle)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
            Detailed Description <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
          </label>
          <textarea
            rows="3"
            placeholder="Describe what you observed..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
          ></textarea>
        </div>

        {/* Cloudinary Image Upload — Direct File Upload Only */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
            Incident Photo <span className="text-[10px] font-normal text-slate-500">(Optional)</span>
          </label>

          {!formData.imageUrl ? (
            <label
              className={`flex flex-col items-center justify-center gap-2.5 w-full py-6 px-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                uploadingImage
                  ? 'border-rose-400 bg-rose-50/60 animate-pulse cursor-wait'
                  : 'border-slate-300 bg-slate-50 hover:border-rose-400 hover:bg-rose-50/40'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                {uploadingImage
                  ? <span className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  : <Upload className="w-5 h-5 text-slate-500" />
                }
              </div>
              <div className="text-center">
                <p className="text-xs font-extrabold text-slate-700 font-display">
                  {uploadingImage ? 'Uploading to Cloudinary…' : 'Click to upload photo'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">JPG, PNG, WEBP — max 10 MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <img src={formData.imageUrl} alt="Incident Edit Preview" className="w-full max-h-40 object-contain rounded-xl" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 font-display"
                >
                  <Trash2 className="w-4 h-4" /> Remove Photo
                </button>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center gap-1 shadow-sm font-display">
                  <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                </span>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" loading={loading} className="w-full py-3.5 mt-2 font-extrabold shadow-md shadow-rose-950/20">
          <Edit3 className="w-4 h-4 mr-2" />
          Save Incident Edits
        </Button>
      </form>
    </Modal>
  );
};

export default EditIncidentModal;
