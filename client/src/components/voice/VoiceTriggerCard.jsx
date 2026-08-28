import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Mic, Volume2, ShieldCheck, AlertCircle, Square, CheckCircle2 } from 'lucide-react';

export const VoiceTriggerCard = ({
  isListening,
  transcript,
  keywordMatched,
  phrase,
  onStartListen,
  onStopListen,
  onResetMatch,
}) => {
  return (
    <Card className="space-y-6 border-slate-200/80 shadow-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md font-display">
          <Mic className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 font-display">
            Hands-Free Emergency Voice Trigger
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Test and configure your secret voice phrase & duress protocol.
          </p>
        </div>
      </div>

      {/* Secret Phrase Info Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="font-bold text-slate-500 uppercase tracking-wider font-display">Active Emergency Phrase:</span>
          <span className="font-black text-rose-600 text-sm bg-white px-3 py-1 rounded-xl border border-slate-200 font-display shadow-xs">
            "{phrase}"
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          Saying this phrase hands-free will instantly trigger emergency alarms and notify your assigned guardians.
        </p>
      </div>

      {/* Voice Recognition Control & Transcript */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {!isListening ? (
            <Button
              onClick={onStartListen}
              variant="primary"
              className="w-full sm:w-auto shadow-md shadow-rose-950/20"
            >
              <Mic className="w-4 h-4 mr-2" />
              Test Voice Recognition
            </Button>
          ) : (
            <Button
              onClick={onStopListen}
              variant="secondary"
              className="w-full sm:w-auto border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
            >
              <Square className="w-3.5 h-3.5 mr-2 text-rose-600 fill-rose-600" />
              Stop Voice Test
            </Button>
          )}

          {keywordMatched && (
            <button
              onClick={onResetMatch}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Reset Test & Test Duress PIN
            </button>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 shadow-xs">
            <span className="text-slate-500 font-bold block text-[10px] uppercase font-display">
              Speech Transcript:
            </span>
            "{transcript}"
          </div>
        )}

        {keywordMatched && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <span className="block font-black font-display text-sm text-emerald-900">
                ✅ PRACTICE TEST PASSED: Secret Voice Phrase Matched!
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                (Note: This is a practice simulation. Real guardian & operator distress dispatch occurs automatically hands-free during an active journey).
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceTriggerCard;
