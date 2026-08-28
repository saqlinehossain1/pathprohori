import React, { useState } from 'react';
import { useVoice } from '../hooks/useVoice';
import VoiceTriggerCard from '../components/voice/VoiceTriggerCard';
import DuressPinModal from '../components/voice/DuressPinModal';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Lock, Eye, EyeOff, KeyRound, ShieldCheck, Mic } from 'lucide-react';

export const VoiceSettings = () => {
  const {
    isListening,
    transcript,
    keywordMatched,
    setKeywordMatched,
    emergencyPhraseInput,
    setEmergencyPhraseInput,
    normalPinInput,
    setNormalPinInput,
    fakePinInput,
    setFakePinInput,
    savingPhrase,
    saveSettings,
    startListening,
    stopListening,
  } = useVoice();

  const [showPhrase, setShowPhrase] = useState(false);
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveSettings(emergencyPhraseInput, normalPinInput, fakePinInput);
      setStatusMessage('Voice emergency phrase & duress settings saved!');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDuressDeactivate = () => {
    stopListening();
    setKeywordMatched(false);
    alert('PIN test submitted. Use an active journey to verify alarm deactivation.');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Clean Text Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-extrabold mb-2 border border-rose-200 shadow-2xs">
          <Mic className="w-3.5 h-3.5 text-rose-600" />
          <span className="font-display">Hands-Free Emergency System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
          Voice Trigger & Duress Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
          Configure secret emergency voice phrase & practice silent duress PIN disarm.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-2xl shadow-xs">
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
            onStopListen={stopListening}
            onResetMatch={() => setShowDuressModal(true)}
          />

          {/* Secret Phrase Configuration Form */}
          <Card className="space-y-4 shadow-card border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3 font-display">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Configure Emergency Phrase & Duress PIN</span>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
                  Secret Emergency Voice Phrase
                </label>
                <div className="relative">
                  <input
                    type={showPhrase ? 'text' : 'password'}
                    value={emergencyPhraseInput}
                    onChange={(e) => setEmergencyPhraseInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Input
                label="Normal Deactivation PIN"
                type="password"
                maxLength="4"
                placeholder="4 digits"
                value={normalPinInput}
                onChange={(e) => setNormalPinInput(e.target.value.replace(/\D/g, ''))}
              />
              <Input
                label="Silent Duress PIN"
                type="password"
                maxLength="4"
                placeholder="Different 4 digits"
                value={fakePinInput}
                onChange={(e) => setFakePinInput(e.target.value.replace(/\D/g, ''))}
              />

              <Button type="submit" loading={savingPhrase} className="w-full py-3.5 font-extrabold shadow-md shadow-rose-950/20">
                Save Emergency Settings
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Instructions */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-50 to-white space-y-3 border-slate-200/80 shadow-card">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm font-display">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <span>Duress Protocol Safety</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
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
      />
    </div>
  );
};

export default VoiceSettings;
