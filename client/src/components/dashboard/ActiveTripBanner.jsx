import React, { useContext } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Activity, AlertTriangle, CheckCircle2, Clock, Navigation } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export const ActiveTripBanner = ({
  activeTrip,
  signalLossAlert,
  panicLoading,
  onPanic,
  onComplete,
}) => {
  const { user } = useContext(AuthContext);
  if (!activeTrip) return null;

  const isResponseRole = user?.role === 'admin' || user?.role === 'operator';

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
              <h2 className="text-lg font-extrabold text-[#2D2329]">
                Active Transit Tracking Live
              </h2>
              <Badge variant="highAlert">{activeTrip.status}</Badge>
            </div>
            <p className="text-xs text-[#8C7A87] font-medium">
              Heartbeat monitor checking connection & location telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isResponseRole && (
            <Button
              variant="danger"
              size="sm"
              onClick={onPanic}
              loading={panicLoading}
              className="px-5 py-2.5 shadow-md text-xs font-black"
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              1-TAP PANIC
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onComplete} className="text-xs">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            End Trip Safely
          </Button>
        </div>
      </div>

      {/* Signal Loss Warning Alert */}
      {signalLossAlert && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-bold animate-bounce">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            CRITICAL WARNING: Signal lost for active trip #{activeTrip._id?.substring(0, 6)}! Emergency protocols countdown active.
          </span>
        </div>
      )}

      {/* Trip Details Grid */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
        <div className="bg-white/80 p-3 rounded-2xl border border-rose-100/60">
          <span className="text-[#8C7A87] block text-[10px] uppercase">Vehicle</span>
          <span className="text-[#2D2329] font-extrabold text-sm">{activeTrip.vehicleType}</span>
        </div>
        <div className="bg-white/80 p-3 rounded-2xl border border-rose-100/60">
          <span className="text-[#8C7A87] block text-[10px] uppercase">Number Plate</span>
          <span className="text-[#2D2329] font-extrabold text-sm">{activeTrip.numberPlate || 'N/A'}</span>
        </div>
        <div className="bg-white/80 p-3 rounded-2xl border border-rose-100/60">
          <span className="text-[#8C7A87] block text-[10px] uppercase">Destination</span>
          <span className="text-[#2D2329] font-extrabold text-sm truncate block">{activeTrip.destination || 'Unspecified'}</span>
        </div>
        <div className="bg-white/80 p-3 rounded-2xl border border-rose-100/60">
          <span className="text-[#8C7A87] block text-[10px] uppercase">Est. Duration</span>
          <span className="text-[#2D2329] font-extrabold text-sm">{activeTrip.estimatedTimeMinutes} Mins</span>
        </div>
      </div>
    </Card>
  );
};

export default ActiveTripBanner;
