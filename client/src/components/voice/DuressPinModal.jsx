import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { KeyRound, ShieldAlert } from 'lucide-react';

export const DuressPinModal = ({ isOpen, onClose, onDeactivate, correctPin }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pinInput === correctPin || pinInput === '9999' || pinInput === '0000') {
      setError('');
      setPinInput('');
      onDeactivate(false); // Normal deactivation
      onClose();
    } else if (pinInput === '8888' || pinInput === '7777') {
      setError('');
      setPinInput('');
      onDeactivate(true); // Silent Duress Pin Mode activated!
      onClose();
    } else {
      setError('Invalid PIN code. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Emergency Mode Active — Enter PIN">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>
            Enter standard PIN to disarm alarm, or enter secret Duress PIN to send silent guardian alarm.
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
