import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { KeyRound, ShieldAlert } from 'lucide-react';

export const DuressPinModal = ({
  isOpen,
  onClose,
  onDeactivate,
  loading = false,
  title = 'Emergency Mode Active — Enter PIN',
  description,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = loading || isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    try {
      setError('');
      setIsSubmitting(true);
      if (typeof onDeactivate === 'function') {
        await onDeactivate(pinInput);
      }
      setPinInput('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Incorrect PIN. Please try again.');
      setPinInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isBusy) {
      setPinInput('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>
            {description || 'Enter your 4-digit deactivation PIN. Your separate silent alarm PIN sends a covert critical alert.'}
          </span>
        </div>

        <Input
          label="Enter 4-Digit PIN"
          type="password"
          inputMode="numeric"
          maxLength="4"
          placeholder="••••"
          value={pinInput}
          disabled={isBusy}
          onChange={(e) => {
            setPinInput(e.target.value.replace(/\D/g, ''));
            if (error) setError('');
          }}
          error={error}
          className="text-center text-lg tracking-[0.6em] font-black"
          required
        />

        <Button
          type="submit"
          loading={isBusy}
          disabled={isBusy || pinInput.length !== 4}
          className="w-full py-3.5 font-bold shadow-md shadow-rose-950/20"
        >
          {!isBusy && <KeyRound className="w-4 h-4 mr-2" />}
          <span>{isBusy ? 'Verifying PIN...' : 'Confirm & Submit PIN'}</span>
        </Button>
      </form>
    </Modal>
  );
};

export default DuressPinModal;
