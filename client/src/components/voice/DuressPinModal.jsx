import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { KeyRound, ShieldAlert } from 'lucide-react';

export const DuressPinModal = ({ isOpen, onClose, onDeactivate, title = 'Emergency Mode Active — Enter PIN', description }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    setError('');
    onDeactivate(pinInput);
    setPinInput('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>
            {description || 'Enter your normal PIN to disarm, or your silent Duress PIN to send a covert critical alert.'}
          </span>
        </div>

        <Input
          label="Enter 4-Digit PIN"
          type="password"
          maxLength="4"
          placeholder="••••"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          error={error}
          required
        />

        <Button type="submit" className="w-full py-3 font-bold">
          <KeyRound className="w-4 h-4 mr-2" />
          Confirm & Submit PIN
        </Button>
      </form>
    </Modal>
  );
};

export default DuressPinModal;
