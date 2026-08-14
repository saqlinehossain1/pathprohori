import React, { useState } from 'react';
import { useVoice } from '../hooks/useVoice';
import VoiceTriggerCard from '../components/voice/VoiceTriggerCard';
import DuressPinModal from '../components/voice/DuressPinModal';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Lock, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

export const VoiceSettings = () => {
  const {
    isListening,
    transcript,
    keywordMatched,
    setKeywordMatched,
    emergencyPhraseInput,
    setEmergencyPhraseInput,
    duressPinInput,
    setDuressPinInput,
    savingPhrase,
    saveSettings,
    startListening,
  } = useVoice();

  const [showPhrase, setShowPhrase] = useState(false);
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveSettings(emergencyPhraseInput, duressPinInput);
      setStatusMessage('Voice emergency phrase & duress settings saved!');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDuressDeactivate = (isSilentDuress) => {
    if (isSilentDuress) {
      alert('SILENT DURESS PIN ACTIVATED: Sending stealth emergency alert to police control room.');
    } else {
      alert('Alarm test disarmed successfully with primary PIN.');
    }
    setKeywordMatched(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-[#6B4355] tracking-tight">
          Voice Trigger & Duress Settings
        </h1>
        <p className="text-xs text-[#8C7A87] font-medium mt-1">
          Module 2 Hands-Free Emergency Voice Activation & Silent Duress Deactivation PIN.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-2xl">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Voice Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Voice Trigger Test Component */}
          <VoiceTriggerCard
            isListening={isListening}
            transcript={transcript}
            keywordMatched={keywordMatched}
            phrase={emergencyPhraseInput}
            onStartListen={startListening}
            onResetMatch={() => setShowDuressModal(true)}
          />

          {/* Secret Phrase Configuration Form */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 text-[#6B4355] font-extrabold text-sm border-b border-[#F0EBF0] pb-3">
              <Lock className="w-4 h-4" />
              <span>Configure Emergency Phrase & Duress PIN</span>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#6B4355] uppercase tracking-wider">
                  Secret Emergency Voice Phrase
                </label>
                <div className="relative">
                  <input
                    type={showPhrase ? 'text' : 'password'}
                    value={emergencyPhraseInput}
                    onChange={(e) => setEmergencyPhraseInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-bold text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355] pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="absolute right-3 top-3 text-[#8C7A87] hover:text-[#2D2329]"
                  >
                    {showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Input
                label="Duress Deactivation PIN (Optional)"
                type="password"
                maxLength="4"
                placeholder="e.g. 9999 (Normal) / 8888 (Silent Duress)"
                value={duressPinInput}
                onChange={(e) => setDuressPinInput(e.target.value)}
              />

              <Button type="submit" loading={savingPhrase} className="w-full py-3 font-extrabold">
                Save Emergency Settings
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Instructions */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[#FDF7F9] to-white space-y-3 border-[#E0D5DC]">
            <div className="flex items-center gap-2 text-[#6B4355] font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <span>Duress Protocol Safety</span>
            </div>
            <p className="text-xs text-[#4A3D46] font-medium leading-relaxed">
              If forced by an attacker to disarm an active emergency alarm, enter your <strong>Silent Duress PIN</strong>. The UI will appear to disarm, but a stealth dispatch signal will be sent to guardians & police operators.
            </p>
          </Card>
        </div>
      </div>

      {/* Duress Pin Modal */}
      <DuressPinModal
        isOpen={showDuressModal}
        onClose={() => setShowDuressModal(false)}
        onDeactivate={handleDuressDeactivate}
        correctPin={duressPinInput || '9999'}
      />
    </div>
  );
};

export default VoiceSettings;
