import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Mic, Volume2, ShieldCheck, AlertCircle } from 'lucide-react';

export const VoiceTriggerCard = ({
  isListening,
  transcript,
  keywordMatched,
  phrase,
  onStartListen,
  onResetMatch,
}) => {
  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#6B4355] text-white flex items-center justify-center shadow-md">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#2D2329]">
            Hands-Free Emergency Voice Trigger
          </h3>
          <p className="text-xs text-[#8C7A87] font-medium">
            Module 2 Hands-Free Emergency Voice Recognition
          </p>
        </div>
      </div>

      {/* Secret Phrase Info Box */}
      <div className="p-4 bg-[#F9F8FA] border border-[#E0D5DC] rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#8C7A87] uppercase">Active Emergency Phrase:</span>
          <span className="font-black text-[#6B4355] text-sm bg-white px-3 py-1 rounded-xl border border-[#E0D5DC]">
            "{phrase}"
          </span>
        </div>
        <p className="text-[11px] text-[#9A8B95] font-medium">
          Saying this phrase will instantly trigger silent panic alerts to your assigned guardian.
        </p>
      </div>

      {/* Voice Recognition Control & Transcript */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            onClick={onStartListen}
            disabled={isListening}
            variant={isListening ? 'secondary' : 'primary'}
            className="w-full sm:w-auto"
          >
            {isListening ? (
              <>
                <Volume2 className="w-4 h-4 mr-2 animate-bounce text-[#6B4355]" />
                Listening for phrase...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Test Voice Recognition
              </>
            )}
          </Button>

          {keywordMatched && (
            <button
              onClick={onResetMatch}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Reset Alarm Test
            </button>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-white border border-[#E0D5DC] rounded-xl text-xs font-mono text-[#2D2329]">
            <span className="text-[#8C7A87] font-bold block text-[10px] uppercase">
              Speech Transcript:
            </span>
            "{transcript}"
          </div>
        )}

        {keywordMatched && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-pulse">
            <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <span>
              EMERGENCY PHRASE MATCHED! Silent duress alert dispatched to guardian & operator room.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceTriggerCard;
