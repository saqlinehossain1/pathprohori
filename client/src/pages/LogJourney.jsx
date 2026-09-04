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
    deactivating,
    startTrip,
    triggerPanic,
    cancelPanic,
    deactivateAlarm,
    completeTrip,
    updateSafetyStatus,
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
    <div className="space-y-6 pb-28 md:pb-8 animate-page-enter page-bottom-clearance">
      {/* Clean journey workspace header */}
      <div className="mobile-page-header flex min-w-0 flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="page-header-kicker inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[11px] font-bold mb-1.5 border border-rose-200 shadow-2xs">
            <Navigation className="w-3.5 h-3.5 text-rose-600" />
            <span>{activeTrip ? 'Active Live Monitoring' : 'Transit Safety Logger'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            {activeTrip ? 'Live Journey Tracking' : 'Log New Journey'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-2xl">
            {activeTrip
              ? 'Your transit path is actively monitored by connected guardians. Telemetry pings every 15 seconds.'
              : 'Record your transport details and route to ensure continuous guardian and control-room monitoring.'}
          </p>
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <button
            onClick={handleOpenHistoryModal}
            className="w-full px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all border border-slate-300 shadow-2xs hover:border-slate-400 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer sm:w-auto"
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Trip History</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 shadow-2xs">
          {error}
        </div>
      )}

      {/* Render Ongoing Journey Map if activeTrip exists */}
      {activeTrip ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl shadow-soft">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 font-display">
                Transit in progress: {activeTrip.startingLocation || 'Origin'} → {activeTrip.destination || 'Destination'}
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                Live monitoring is active. You can complete this trip safely using your PIN below.
              </p>
            </div>
          </div>

          <OngoingJourneyMap
            trip={activeTrip}
            onComplete={handleCompleteTrip}
            onPanic={triggerPanic}
            onCancelPanic={cancelPanic}
            panicLoading={panicLoading}
            onDeactivateAlarm={deactivateAlarm}
            deactivating={deactivating}
            onSafetyStatusChange={updateSafetyStatus}
          />
        </div>
      ) : (
        /* Render Journey Log Form if no activeTrip */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main setup panel */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-soft">
            <JourneyForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              loading={starting}
            />
          </div>

          {/* Journey contextual summary rail */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-display">Monitoring Protocols</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Interactive OpenStreetMap coordinate mapping for guardians & operators.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Optional Cloudinary photo check-in for number plate & driver verification.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>15-second heartbeat loop detecting sudden offline disconnection.</span>
                </li>
              </ul>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Auto-Purge Lifespan</span>
                  <span className="font-extrabold text-slate-900 font-mono">48 Hours</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-normal leading-relaxed">
                  GPS coordinates and evidence photos automatically delete after the retention period.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-display">Commuter Safety Advice</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                Confirm vehicle license plates match your recorded details prior to boarding any CNG, shuttle, or cab.
              </p>
            </div>
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
