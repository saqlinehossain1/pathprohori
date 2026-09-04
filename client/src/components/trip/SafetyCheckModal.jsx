import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { ShieldCheck, Navigation, PauseCircle } from 'lucide-react';

const REASON_COPY = {
  ROUTE_DEVIATION: {
    icon: Navigation,
    title: 'Off Your Planned Route',
    description: "We noticed you've moved off your planned route. Please confirm you're okay.",
  },
  UNEXPECTED_STOP: {
    icon: PauseCircle,
    title: 'Unexpected Stop Detected',
    description: "We noticed you haven't moved in a while. Please confirm you're okay.",
  },
};

// Route Deviation & Unexpected Stop Detection: the in-app "are you okay?" check the server
// sends before it ever alerts guardians. No dismiss button on purpose - the countdown either
// gets answered here or the server escalates automatically once it expires.
export const SafetyCheckModal = ({ pendingCheck, onConfirmSafe, responding }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!pendingCheck?.expiresAt) return undefined;
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(pendingCheck.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pendingCheck?.expiresAt]);

  if (!pendingCheck) return null;

  const copy = REASON_COPY[pendingCheck.reason] || REASON_COPY.UNEXPECTED_STOP;
  const Icon = copy.icon;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Modal isOpen onClose={() => {}} title="Safety Check">
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-black text-slate-900 font-display">{copy.title}</h4>
          <p className="text-sm text-slate-600 font-medium">{pendingCheck.message || copy.description}</p>
        </div>

        <div className="text-3xl font-black font-mono text-rose-600">
          {minutes}:{String(seconds).padStart(2, '0')}
        </div>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
          Guardians will be alerted automatically if you don't respond in time
        </p>

        <Button
          onClick={onConfirmSafe}
          loading={responding}
          disabled={responding}
          variant="success"
          size="lg"
          className="w-full py-3.5 font-bold shadow-md shadow-emerald-950/20"
        >
          {!responding && <ShieldCheck className="w-4 h-4" />}
          <span>{responding ? 'Confirming...' : "I'm Safe"}</span>
        </Button>
      </div>
    </Modal>
  );
};

export default SafetyCheckModal;
