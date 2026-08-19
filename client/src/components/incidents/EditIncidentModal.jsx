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

        {/* Cloudinary Image Upload / Removal Section */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider font-display">
            Incident Photo (Attach / Change / Remove)
          </label>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-950/20">
              <Upload className="w-4 h-4" />
              <span>{uploadingImage ? 'Uploading...' : 'Attach / Change Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>

            {formData.imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Attached Photo</span>
              </button>
            )}

            {uploadSuccess && (
              <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Cloudinary Uploaded!
              </span>
            )}
          </div>

          <Input
            placeholder="Or paste image URL (https://...)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />

          {formData.imageUrl && (
            <div className="rounded-2xl overflow-hidden max-h-40 border border-slate-200 mt-2 relative p-1 bg-slate-50">
              <img src={formData.imageUrl} alt="Incident Edit Preview" className="w-full max-h-40 object-contain rounded-xl" />
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
