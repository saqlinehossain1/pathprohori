import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import AlarmDeactivationForm from '../trip/AlarmDeactivationForm';
import { Activity, AlertTriangle, CheckCircle2, MapPin, Navigation, Clock } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export const ActiveTripBanner = ({
  activeTrip,
  signalLossAlert,
  panicLoading,
  onPanic,
  onComplete,
  onDeactivateAlarm,
  deactivating,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  if (!activeTrip) return null;

  const isEmergencyActive = activeTrip.status === 'EMERGENCY';
  const isResponseRole = user?.role === 'admin' || user?.role === 'operator';

  const handleDeactivateAlarm = async (pin) => {
    await onDeactivateAlarm(pin);
    setShowDeactivateModal(false);
  };

  return (
    <Card className="border-rose-200 bg-gradient-to-br from-white via-rose-50/30 to-amber-50/20 shadow-lg relative overflow-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 font-display">
                Active Transit Tracking Live
              </h2>
              <Badge variant="highAlert">{activeTrip.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Heartbeat monitor checking connection & location telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/log-journey')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-display"
          >
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>View Live Journey Map</span>
          </button>

          {!isResponseRole && (
            <Button
              variant="danger"
              size="sm"
              onClick={onPanic}
              loading={panicLoading}
              className="px-4 py-2 text-xs font-black shadow-md shadow-rose-950/20"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              1-TAP PANIC
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => (isEmergencyActive ? setShowDeactivateModal(true) : onComplete())}
            className="text-xs font-extrabold px-4 py-2"
          >
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
            {isEmergencyActive ? 'Deactivate Alarm to Finish' : 'End Trip Safely'}
          </Button>
        </div>
      </div>

      {/* Signal Loss Warning Alert */}
      {signalLossAlert && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-bold animate-bounce shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            CRITICAL WARNING: Signal lost for active trip #{activeTrip._id?.substring(0, 6)}! Emergency protocols countdown active.
          </span>
        </div>
      )}

      {/* Trip Details Grid */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
        <div className="bg-white/95 p-3 rounded-2xl border border-rose-200/60 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-display font-extrabold">Vehicle</span>
          <span className="text-slate-900 font-black text-sm font-display">{activeTrip.vehicleType}</span>
        </div>
        <div className="bg-white/95 p-3 rounded-2xl border border-rose-200/60 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-display font-extrabold">Number Plate</span>
          <span className="text-slate-900 font-black text-sm font-display">{activeTrip.numberPlate || 'N/A'}</span>
        </div>
        <div className="bg-white/95 p-3 rounded-2xl border border-rose-200/60 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-display font-extrabold">Destination</span>
          <span className="text-slate-900 font-black text-sm truncate block font-display">{activeTrip.destination || 'Unspecified'}</span>
        </div>
        <div className="bg-white/95 p-3 rounded-2xl border border-rose-200/60 shadow-xs">
          <span className="text-slate-500 block text-[10px] uppercase font-display font-extrabold">Est. Duration</span>
          <span className="text-slate-900 font-black text-sm font-display">{activeTrip.estimatedTimeMinutes} Mins</span>
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
    </Card>
  );
};

export default ActiveTripBanner;
