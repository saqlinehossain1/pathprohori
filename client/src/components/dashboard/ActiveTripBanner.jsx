import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import AlarmDeactivationForm from '../trip/AlarmDeactivationForm';
import DuressPinModal from '../voice/DuressPinModal';
import { Activity, AlertTriangle, CheckCircle2, MapPin, Navigation, Clock } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export const ActiveTripBanner = ({
  activeTrip,
  signalLossAlert,
  panicLoading,
  onPanic,
  onComplete,
  onDeactivateAlarm,
  onSafetyStatusChange,
  deactivating,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showFinishPinModal, setShowFinishPinModal] = useState(false);
  const [showPanicGraceModal, setShowPanicGraceModal] = useState(false);
  const [panicCountdown, setPanicCountdown] = useState(10);
  const [safetySaving, setSafetySaving] = useState(false);
  const panicTimerRef = useRef(null);

  if (!activeTrip) return null;

  const isEmergencyActive = activeTrip.status === 'EMERGENCY';
  const isResponseRole = user?.role === 'admin' || user?.role === 'operator';

  const handleDeactivateAlarm = async (pin) => {
    try {
      await onDeactivateAlarm(pin);
      setShowDeactivateModal(false);
    } catch (e) {
      console.error('Deactivate alarm error:', e);
      throw e;
    }
  };

  useEffect(() => {
    if (!showPanicGraceModal) return undefined;
    if (panicCountdown <= 0) {
      setShowPanicGraceModal(false);
      if (typeof onPanic === 'function') onPanic(false);
      return undefined;
    }

    panicTimerRef.current = setTimeout(() => setPanicCountdown((value) => value - 1), 1000);
    return () => clearTimeout(panicTimerRef.current);
  }, [showPanicGraceModal, panicCountdown, onPanic]);

  const handlePanic = () => {
    setPanicCountdown(10);
    setShowPanicGraceModal(true);
  };

  const cancelPanicGracePeriod = () => {
    clearTimeout(panicTimerRef.current);
    setShowPanicGraceModal(false);
    setPanicCountdown(10);
  };

  const handleFinishWithPin = async (pin) => {
    try {
      await onDeactivateAlarm(pin, true);
      setShowFinishPinModal(false);
    } catch (e) {
      console.error('Finish trip error:', e);
      throw e;
    }
  };

  const handleSafetyStatus = async (nextStatus) => {
    if (nextStatus === 'UNSAFE' && !window.confirm('Mark this journey Unsafe? Linked guardians will receive a warning.')) return;
    try {
      setSafetySaving(true);
      await onSafetyStatusChange(nextStatus);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update journey safety status.');
    } finally {
      setSafetySaving(false);
    }
  };

  return (
    <div className={`border rounded-xl p-5 shadow-xs transition-colors ${
      isEmergencyActive ? 'border-red-300 bg-red-50/40' : 'border-slate-200/90 bg-white'
    }`}>
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Activity className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Active Transit Tracking
              </h2>
              <Badge variant={isEmergencyActive ? 'highAlert' : 'default'}>{activeTrip.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              15s telemetry heartbeat connected · linked to guardians
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/log-journey')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>View Live Map</span>
          </button>

          {!isResponseRole && (
            <Button
              variant="danger"
              size="sm"
              onClick={handlePanic}
              loading={panicLoading}
              className="px-3.5 py-2 text-xs font-bold"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              1-Tap Panic
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => (isEmergencyActive ? setShowDeactivateModal(true) : setShowFinishPinModal(true))}
            className="text-xs font-semibold px-3.5 py-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            {isEmergencyActive ? 'Deactivate Alarm' : 'Complete Trip Safely'}
          </Button>
        </div>
      </div>

      {signalLossAlert && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-900 text-xs font-semibold shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            CRITICAL WARNING: Signal lost for active journey #{activeTrip._id?.substring(0, 6)}! Emergency protocols countdown active.
          </span>
        </div>
      )}

      {/* Trip Details Grid */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Vehicle</span>
          <span className="text-slate-900 font-bold text-sm">{activeTrip.vehicleType}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Number Plate</span>
          <span className="text-slate-900 font-bold text-sm font-mono">{activeTrip.numberPlate || 'N/A'}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Destination</span>
          <span className="text-slate-900 font-bold text-sm truncate block">{activeTrip.destination || 'Unspecified'}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Est. Duration</span>
          <span className="text-slate-900 font-bold text-sm">{activeTrip.estimatedTimeMinutes} Mins</span>
        </div>
      </div>

      {/* PIN-Gated Alarm Deactivation */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Emergency Active"
      >
        <AlarmDeactivationForm onDeactivate={handleDeactivateAlarm} loading={deactivating} />
      </Modal>

      <DuressPinModal
        isOpen={showFinishPinModal}
        onClose={() => {
          if (!deactivating) setShowFinishPinModal(false);
        }}
        loading={deactivating}
        onDeactivate={handleFinishWithPin}
        title="Finish Journey — Enter PIN"
        description="Enter your normal PIN to finish this journey safely."
      />

      <Modal
        isOpen={showPanicGraceModal}
        onClose={cancelPanicGracePeriod}
        title="Emergency SOS Check"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-50 text-amber-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">SOS alert starts in {panicCountdown}s</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Cancel now if this was accidental. If the countdown ends, your guardians will receive the emergency alert.
            </p>
          </div>
          <button
            type="button"
            onClick={cancelPanicGracePeriod}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer font-display"
          >
            Cancel False Alarm
          </button>
          <button
            type="button"
            onClick={() => {
              clearTimeout(panicTimerRef.current);
              setShowPanicGraceModal(false);
              if (typeof onPanic === 'function') onPanic(false);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-extrabold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 cursor-pointer font-display"
          >
            Send Alert Now
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveTripBanner;
