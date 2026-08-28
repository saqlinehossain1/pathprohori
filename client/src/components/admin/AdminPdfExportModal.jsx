import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import {
  FileText,
  ShieldAlert,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  Filter,
} from 'lucide-react';

export const AdminPdfExportModal = ({ isOpen, onClose, onExport, allIncidents = [] }) => {
  const [selectedArea, setSelectedArea] = useState('All Neighborhoods');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7_days');
  const [selectedSeverity, setSelectedSeverity] = useState('high_only');
  const [includeImages, setIncludeImages] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);

  const neighborhoodOptions = [
    'All Neighborhoods',
    'Gulshan',
    'Banani',
    'Dhanmondi',
    'Uttara',
    'Mirpur',
    'Mohakhali',
    'Tejgaon',
    'Bashundhara',
  ];

  const timeframeOptions = [
    { label: 'Last 24 Hours', value: '24_hours' },
    { label: 'Past 7 Days', value: '7_days' },
    { label: 'Past 30 Days', value: '30_days' },
    { label: 'All Time', value: 'all_time' },
  ];

  // Calculate dynamic filtered count preview
  const getFilteredPreviewCount = () => {
    let list = [...allIncidents];

    if (selectedSeverity === 'high_only') {
      list = list.filter((i) => ['High Alert', 'Critical', 'Emergency'].includes(i.severity));
    }

    if (selectedArea !== 'All Neighborhoods') {
      list = list.filter((i) =>
        i.locationName?.toLowerCase().includes(selectedArea.toLowerCase())
      );
    }

    if (selectedTimeframe !== 'all_time') {
      const now = Date.now();
      const cutoffMap = {
        '24_hours': 24 * 60 * 60 * 1000,
        '7_days': 7 * 24 * 60 * 60 * 1000,
        '30_days': 30 * 24 * 60 * 60 * 1000,
      };
      const limitMs = cutoffMap[selectedTimeframe];
      if (limitMs) {
        list = list.filter((i) => i.createdAt && now - new Date(i.createdAt).getTime() <= limitMs);
      }
    }

    return list.length;
  };

  const previewCount = getFilteredPreviewCount();

  const handleCompileAndDownload = async () => {
    setIsCompiling(true);
    try {
      let filtered = [...allIncidents];

      if (selectedSeverity === 'high_only') {
        filtered = filtered.filter((i) =>
          ['High Alert', 'Critical', 'Emergency', 'High'].some((s) =>
            String(i.severity || '').includes(s)
          )
        );
      }

      if (selectedArea !== 'All Neighborhoods') {
        filtered = filtered.filter((i) =>
          i.locationName?.toLowerCase().includes(selectedArea.toLowerCase())
        );
      }

      if (selectedTimeframe !== 'all_time') {
        const now = Date.now();
        const cutoffMap = {
          '24_hours': 24 * 60 * 60 * 1000,
          '7_days': 7 * 24 * 60 * 60 * 1000,
          '30_days': 30 * 24 * 60 * 60 * 1000,
        };
        const cutoff = now - (cutoffMap[selectedTimeframe] || 0);
        filtered = filtered.filter(
          (i) => new Date(i.createdAt || Date.now()).getTime() >= cutoff
        );
      }

      await onExport({
        incidents: filtered.length > 0 ? filtered : allIncidents,
        options: {
          selectedArea,
          selectedTimeframe,
          selectedSeverity,
          includeImages,
        },
      });
      onClose();
    } catch (err) {
      console.error('[Admin PDF Export Error]', err);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Law Enforcement PDF Dossier">
      <div className="space-y-5">
        {/* Banner Header */}
        <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 rounded-2xl text-white flex items-center gap-3 border border-rose-500/20 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider font-display text-rose-300">
              Official Police Handover Compiler
            </h4>
            <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">
              Customize date, neighborhood filter, and evidence settings before generating PDF.
            </p>
          </div>
        </div>

        {/* 1. Neighborhood Filter */}
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span>Select Target Neighborhood / Area</span>
          </label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-all cursor-pointer"
          >
            {neighborhoodOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Timeframe Filter */}
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span>Select Report Timeframe</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {timeframeOptions.map((tf) => (
              <button
                type="button"
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer font-display ${
                  selectedTimeframe === tf.value
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Threat Severity Level */}
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Hazard Severity Filter</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedSeverity('high_only')}
              className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer font-display ${
                selectedSeverity === 'high_only'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              High Alert & Critical Only
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity('all_severities')}
              className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer font-display ${
                selectedSeverity === 'all_severities'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Severities
            </button>
          </div>
        </div>

        {/* 4. Include Image Evidence Option */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="text-xs font-extrabold text-slate-900 block font-display">
                Include Attached Photo Evidence Links
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Attach Cloudinary evidence URLs to case dossiers
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
            className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
          />
        </div>

        {/* Compile Preview Bar */}
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Telemetry Match Found</span>
          </div>
          <span className="font-mono bg-emerald-100 px-2.5 py-0.5 rounded-full text-emerald-800 font-extrabold">
            {previewCount} Incident Reports
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} size="sm">
            Cancel
          </Button>

          <button
            type="button"
            onClick={handleCompileAndDownload}
            disabled={isCompiling || previewCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-950/20 active:scale-95 transition-all cursor-pointer font-display disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isCompiling ? 'Compiling PDF...' : 'Compile & Download PDF'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminPdfExportModal;
