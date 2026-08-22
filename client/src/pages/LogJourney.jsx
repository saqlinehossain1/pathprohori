import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../hooks/useTrip';
import JourneyForm from '../components/journey/JourneyForm';
import OngoingJourneyMap from '../components/journey/OngoingJourneyMap';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ShieldCheck,
  Lightbulb,
  CheckCircle,
  Navigation,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  History,
  X,
  MapPin,
  Car,
  Camera,
  ChevronRight,
  Info
} from 'lucide-react';
import tripApi from '../api/tripApi';

export const LogJourney = () => {
  const navigate = useNavigate();
  const {
    activeTrip,
    loading: loadingTrip,
    panicLoading,
    startTrip,
    triggerPanic,
    cancelPanic,
    completeTrip
  } = useTrip();

  // Clean empty initial form state (NO hardcoded values)
  const [formData, setFormData] = useState({
    numberPlate: '',
    vehicleType: 'CNG Auto',
    vehicleColor: '',
    estimatedTimeMinutes: 30,
    startingLocation: '',
    destination: '',
    startCoords: null,
    destinationCoords: null,
    driverDescription: '',
    journeyNotes: '',
    photoUrl: '',
  });

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // My Safe Journeys History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [safeJourneys, setSafeJourneys] = useState([]);
  const [selectedHistoryTrip, setSelectedHistoryTrip] = useState(null);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await tripApi.getTripHistory();
      setSafeJourneys(data || []);
    } catch (err) {
      console.error('Failed to fetch safe journey history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = () => {
    setShowHistoryModal(true);
    setSelectedHistoryTrip(null);
    fetchHistory();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startingLocation.trim() || !formData.destination.trim()) {
      setError('Please provide both starting location and destination address.');
      return;
    }

    setStarting(true);
    setError('');

    try {
      await startTrip(formData);
    } catch (err) {
      console.error('Start trip error:', err);
      setError(err.response?.data?.message || 'Failed to start live journey monitoring');
    } finally {
      setStarting(false);
    }
  };

  const handleCompleteTrip = async () => {
    try {
      await completeTrip();
      setShowCompleteModal(true);
    } catch (err) {
      console.error('Failed to complete trip:', err);
      alert('Failed to mark journey completed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Helper to calculate remaining 48-hour privacy countdown
  const getRemainingHours = (expiresAt) => {
    if (!expiresAt) return '48 hrs';
    const expireTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.round((expireTime - now) / (1000 * 60 * 60)));
    return `${diffHours} hrs`;
  };

  if (loadingTrip && !activeTrip) {
    return <LoadingSpinner label="Checking live journey status..." />;
  }

  return (
    <div className="space-y-6">
      {/* Clean Text Page Header with "My Safe Journeys" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-extrabold mb-2 border border-rose-200 shadow-2xs">
            <Navigation className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-display">
              {activeTrip ? 'Active Live Monitoring' : 'Journey Safety Logger'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            {activeTrip ? 'Live Journey Tracking Progress' : 'Log New Journey'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            {activeTrip
              ? 'Your journey is currently monitored by PATHPROHORI emergency guardians. Keep your phone connected.'
              : 'Keep your commute secure. Search starting & destination map locations before starting your trip.'}
          </p>
        </div>

        {/* My Safe Journeys Button */}
        <div className="shrink-0">
          <button
            onClick={handleOpenHistoryModal}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 font-display"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>My Safe Journeys</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl border border-rose-200 shadow-xs">
          {error}
        </div>
      )}

      {/* Render Ongoing Journey Map if activeTrip exists */}
      {activeTrip ? (
        <OngoingJourneyMap
          trip={activeTrip}
          onComplete={handleCompleteTrip}
          onPanic={triggerPanic}
          onCancelPanic={cancelPanic}
          panicLoading={panicLoading}
        />
      ) : (
        /* Render Journey Log Form if no activeTrip */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Main Form */}
          <Card className="lg:col-span-2 shadow-card border-slate-200/80">
            <JourneyForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              loading={starting}
            />
          </Card>

          {/* Right Column: Safety Guidelines */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200/80 space-y-4 shadow-card">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm font-display">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Real-Time Protection Features</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Map place search & automatic coordinate mapping for operators & guardians.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Optional Cloudinary photo check-in for vehicle & number plate verification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Automated 48-hour privacy purge: Safe journey logs & photos auto-delete after 48 hours.</span>
                </li>
              </ul>
            </Card>

            <Card className="space-y-3 shadow-card border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm font-display">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span>Commuter Safety Tip</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Always verify vehicle number plates match before boarding CNGs, buses, or ride-share cars.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Completion Modal Popup */}
      {showCompleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center space-y-5 shadow-2xl border-emerald-200 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-200 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 font-display">
                Journey Completed Safely!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thank you for using PATHPROHORI Commuter Protection. Your journey was completed safely.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-slate-800 font-display">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>48-Hour Auto-Purge Privacy Policy</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your journey location logs, coordinates, and uploaded photos are securely stored for 48 hours for safety tracking, and will be automatically purged from the database after 48 hours.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setShowCompleteModal(false);
                  navigate('/');
                }}
                className="w-full py-3 text-xs font-extrabold shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* My Safe Journeys Modal Dialog */}
      {showHistoryModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border-slate-200 animate-in fade-in zoom-in duration-200 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-display">
                    My Safe Journeys
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Available in database for 48 hours before auto-purge privacy policy
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryTrip(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-medium">
                  <LoadingSpinner label="Fetching safe journey history..." />
                </div>
              ) : selectedHistoryTrip ? (
                /* Detailed View of Selected Journey */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <button
                    onClick={() => setSelectedHistoryTrip(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-display mb-2"
                  >
                    ← Back to Safe Journeys List
                  </button>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black font-display">
                        SAFE COMPLETED
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Purges in {getRemainingHours(selectedHistoryTrip.expiresAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">From</span>
                        <span className="font-extrabold text-slate-900 block">{selectedHistoryTrip.startingLocation}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">To</span>
                        <span className="font-extrabold text-slate-900 block">{selectedHistoryTrip.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">Vehicle Info</span>
                      <span className="font-black text-slate-900 font-display">{selectedHistoryTrip.vehicleType}</span>
                      {selectedHistoryTrip.numberPlate && (
                        <p className="text-slate-600 font-mono mt-0.5">{selectedHistoryTrip.numberPlate}</p>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">Est Duration</span>
                      <span className="font-black text-slate-900 font-display">{selectedHistoryTrip.estimatedTimeMinutes} Mins</span>
                    </div>
                  </div>

                  {selectedHistoryTrip.driverDescription && (
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display">Driver / Journey Notes</span>
                      <p className="text-slate-700 font-medium">{selectedHistoryTrip.driverDescription}</p>
                    </div>
                  )}

                  {selectedHistoryTrip.photoUrl && (
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-display flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-rose-600" /> Uploaded Check-in Photo
                      </span>
                      <img
                        src={selectedHistoryTrip.photoUrl}
                        alt="Journey checkin"
                        className="w-full h-48 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              ) : safeJourneys.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Info className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">No safe completed journeys available.</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Safe completed journeys remain in the database for 48 hours before auto-deleting for privacy.
                  </p>
                </div>
              ) : (
                /* List of Safe Journeys */
                <div className="space-y-3">
                  {safeJourneys.map((tr) => (
                    <div
                      key={tr._id}
                      onClick={() => setSelectedHistoryTrip(tr)}
                      className="p-3.5 sm:p-4 bg-slate-50 hover:bg-rose-50/40 border border-slate-200/90 rounded-2xl transition-all cursor-pointer flex items-center justify-between group gap-3"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black font-display uppercase shrink-0">
                            SAFE
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 font-display truncate">
                            {tr.vehicleType} {tr.numberPlate ? `(${tr.numberPlate})` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate flex-1 min-w-0">{tr.startingLocation}</span>
                          <span className="text-slate-400 shrink-0">➔</span>
                          <span className="truncate flex-1 min-w-0">{tr.destination}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-medium flex-wrap">
                          <span>Completed: {new Date(tr.completedAt || tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">Expires in {getRemainingHours(tr.expiresAt)}</span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white text-slate-400 group-hover:text-rose-600 flex items-center justify-center shadow-xs border border-slate-200 transition-all shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 text-right">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryTrip(null);
                }}
                className="text-xs font-bold px-4 py-2"
              >
                Close Window
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LogJourney;
