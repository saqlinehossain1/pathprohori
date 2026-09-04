import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import authApi from '../api/authApi';
import { tripApi } from '../api/tripApi';
import { triggerEmergency as triggerStandaloneEmergency, resolveEmergency as resolveStandaloneEmergency } from '../services/emergencyService';
import { captureEvidenceBurst } from '../services/evidenceLockerService';

export const VoiceContext = createContext();

// Web Audio API: synthesize crisp countdown warning tick
const playCountdownBeep = (freq = 880) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) {
    // AudioContext may be blocked before interaction
  }
};

// Web Audio API: synthesize urgent emergency siren audio
const playEmergencySirenSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.1);
  } catch (e) {
    console.error('Audio siren play error:', e);
  }
};

// Helper: best-effort GPS coordinates
const getBestEffortCoords = async () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return resolve({ latitude: 23.7808875, longitude: 90.4068305 });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({ latitude: 23.7808875, longitude: 90.4068305 }),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  });
};

export const VoiceProvider = ({ children }) => {
  const { user, setUser } = useContext(AuthContext);
  const { activeTrip, setActiveTrip } = useContext(SocketContext) || {};

  // Hands-free state (default ON whenever user enters the website)
  const [handsFreeActive, setHandsFreeActiveState] = useState(() => {
    try {
      const stored = localStorage.getItem('pathprohori_handsfree_voice');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [keywordMatched, setKeywordMatched] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 10-Second Alarm Grace Period Countdown State
  const [alarmTimerActive, setAlarmTimerActive] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState(10);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [deactivatingAlarm, setDeactivatingAlarm] = useState(false);

  const [emergencyPhraseInput, setEmergencyPhraseInput] = useState(
    user?.emergencyPhrase || 'Lavender Moonlight'
  );
  const [normalPinInput, setNormalPinInput] = useState('');
  const [fakePinInput, setFakePinInput] = useState('');

  // Refs for stable callbacks
  const recognitionRef = useRef(null);
  const handsFreeActiveRef = useRef(handsFreeActive);
  const alarmTimerActiveRef = useRef(alarmTimerActive);
  const emergencyActiveRef = useRef(emergencyActive);
  const activeTripRef = useRef(activeTrip);
  const userRef = useRef(user);
  const phraseMatchedRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Sync refs with state
  useEffect(() => {
    handsFreeActiveRef.current = handsFreeActive;
  }, [handsFreeActive]);

  useEffect(() => {
    alarmTimerActiveRef.current = alarmTimerActive;
  }, [alarmTimerActive]);

  useEffect(() => {
    emergencyActiveRef.current = emergencyActive;
  }, [emergencyActive]);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    userRef.current = user;
    if (user?.emergencyPhrase) {
      setEmergencyPhraseInput(user.emergencyPhrase);
    }
  }, [user]);

  // Persist hands-free preference
  const setHandsFreeActive = useCallback((val) => {
    const nextVal = typeof val === 'function' ? val(handsFreeActiveRef.current) : val;
    setHandsFreeActiveState(nextVal);
    try {
      localStorage.setItem('pathprohori_handsfree_voice', String(nextVal));
    } catch {}
    if (!nextVal) {
      stopListening();
    } else {
      startListening();
    }
  }, []);

  const saveSettings = async (phrase, normalPin, fakePin) => {
    try {
      setSavingPhrase(true);
      const settings = {
        emergencyPhrase: phrase || emergencyPhraseInput,
      };
      if (normalPin) settings.normalPin = normalPin;
      if (fakePin) settings.fakePin = fakePin;
      const updatedUser = await authApi.updateProfile(settings);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      return updatedUser;
    } catch (err) {
      console.error('Failed to update voice settings:', err);
      throw err;
    } finally {
      setSavingPhrase(false);
    }
  };

  // Stop Speech Recognition
  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListening(false);
  }, []);

  // Execute actual emergency alarm dispatch (after 10s countdown or manual skip)
  const executeEmergencyAlarm = useCallback(async (isDuress = false) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setAlarmTimerActive(false);
    alarmTimerActiveRef.current = false;
    setEmergencyActive(true);
    emergencyActiveRef.current = true;

    // Play full urgent siren
    playEmergencySirenSound();

    try {
      const coords = await getBestEffortCoords();
      const currentTrip = activeTripRef.current;

      if (currentTrip && currentTrip._id && currentTrip.status !== 'COMPLETED') {
        console.warn('🚨 Dispatched Emergency for Active Trip:', currentTrip._id);
        const res = await tripApi.triggerPanic(currentTrip._id, isDuress, {
          lat: coords.latitude,
          lng: coords.longitude,
        });

        if (setActiveTrip) {
          setActiveTrip(res.trip || res);
        }

        const emergencyId = res.emergencyId || res.emergency?._id || res.trip?.emergencyId;
        if (emergencyId) {
          setActiveEmergencyId(emergencyId);
          captureEvidenceBurst(emergencyId).catch((err) =>
            console.warn('[Evidence Locker Error]', err)
          );
        }
      } else {
        console.warn('🚨 Dispatched Standalone Emergency SOS Alert at:', coords);
        const res = await triggerStandaloneEmergency(coords.latitude, coords.longitude);
        const emergencyId = res?.emergency?.id || res?.emergency?._id;
        if (emergencyId) {
          setActiveEmergencyId(emergencyId);
          captureEvidenceBurst(emergencyId).catch((err) =>
            console.warn('[Evidence Locker Error]', err)
          );
        }
      }
    } catch (err) {
      console.error('Failed to execute emergency broadcast:', err);
    }
  }, [setActiveTrip]);

  // Cancel False Alarm during 10s Grace Period
  const cancelAlarmTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAlarmTimerActive(false);
    alarmTimerActiveRef.current = false;
    setGraceCountdown(10);
    phraseMatchedRef.current = false;
    setKeywordMatched(false);
    console.log('🛡️ Voice Emergency Alarm Timer Cancelled by User (Safe).');

    // Auto-resume hands-free listening if enabled
    if (handsFreeActiveRef.current) {
      setTimeout(() => {
        startListening();
      }, 300);
    }
  }, []);

  // Skip Timer & Trigger Alarm Now
  const triggerAlarmNow = useCallback(() => {
    executeEmergencyAlarm(false);
  }, [executeEmergencyAlarm]);

  // Start 10-Second Alarm Countdown Timer immediately when phrase is detected
  const triggerAlarmTimer = useCallback((isDuress = false) => {
    if (alarmTimerActiveRef.current || emergencyActiveRef.current) return;

    console.warn('🚨 INITIATING 10-SECOND EMERGENCY ALARM COUNTDOWN TIMER!');
    phraseMatchedRef.current = true;
    setKeywordMatched(true);
    setAlarmTimerActive(true);
    alarmTimerActiveRef.current = true;
    setGraceCountdown(10);

    // Stop recognition while counting down to avoid self-interference
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListening(false);

    // Immediate initial audio beep
    playCountdownBeep(980);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let remaining = 10;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setGraceCountdown(remaining);

      if (remaining > 0) {
        // Play urgent tick each second
        const pitch = remaining <= 3 ? 1200 : remaining <= 6 ? 1050 : 880;
        playCountdownBeep(pitch);
      } else {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        executeEmergencyAlarm(isDuress);
      }
    }, 1000);
  }, [executeEmergencyAlarm]);

  // Deactivate active emergency via Normal PIN or Silent Duress PIN
  const deactivateAlarm = useCallback(async (pin) => {
    setDeactivatingAlarm(true);
    try {
      const currentTrip = activeTripRef.current;
      if (currentTrip && currentTrip._id) {
        await tripApi.deactivateAlarm(currentTrip._id, { pinCode: pin, pin });
      } else {
        await resolveStandaloneEmergency(activeEmergencyId);
      }

      setEmergencyActive(false);
      emergencyActiveRef.current = false;
      setActiveEmergencyId(null);
      phraseMatchedRef.current = false;
      setKeywordMatched(false);

      // Auto-resume hands-free listening
      if (handsFreeActiveRef.current) {
        setTimeout(() => {
          startListening();
        }, 400);
      }
    } catch (err) {
      console.error('Failed to deactivate alarm:', err);
      throw err;
    } finally {
      setDeactivatingAlarm(false);
    }
  }, [activeEmergencyId]);

  // Start Speech Recognition
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition is not supported by this browser.');
      return false;
    }

    if (alarmTimerActiveRef.current || emergencyActiveRef.current) {
      return false;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setPermissionDenied(false);
        setTranscript('Listening for secret phrase...');
      };

      recognition.onresult = (event) => {
        let accumulatedTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          accumulatedTranscript += ' ' + event.results[i][0].transcript;
        }
        const text = accumulatedTranscript.toLowerCase().trim();
        setTranscript(text);

        // Normalize spoken text and target secret emergency phrase
        const targetPhrase =
          userRef.current?.emergencyPhrase || emergencyPhraseInput || 'Lavender Moonlight';
        const cleanTarget = targetPhrase.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const cleanText = text.replace(/[^a-z0-9]+/g, ' ').trim();

        // Check matching
        const isMatch = cleanTarget.length > 2 && cleanText.includes(cleanTarget);

        if (
          isMatch &&
          !phraseMatchedRef.current &&
          !alarmTimerActiveRef.current &&
          !emergencyActiveRef.current
        ) {
          console.warn('🎙️ SECRET EMERGENCY PHRASE HEARD! AUTO-TRIGGERING ALARM TIMER NOW!');
          // Immediately start alarm countdown timer directly from onresult
          triggerAlarmTimer(false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setPermissionDenied(true);
          setIsListening(false);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart speech recognition continuously if hands-free is enabled
        // and an alarm timer or active emergency is not currently running
        if (
          handsFreeActiveRef.current &&
          !alarmTimerActiveRef.current &&
          !emergencyActiveRef.current &&
          !phraseMatchedRef.current
        ) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (
              handsFreeActiveRef.current &&
              !alarmTimerActiveRef.current &&
              !emergencyActiveRef.current
            ) {
              try {
                recognition.start();
              } catch (e) {
                // Ignore start collision
              }
            }
          }, 200);
        }
      };

      recognition.start();
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      return false;
    }
  }, [emergencyPhraseInput, triggerAlarmTimer]);

  // Auto-activate voice listening on mount / entry to website
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (handsFreeActive) {
      // Attempt immediate auto-start
      startListening();

      // Browser policy: some browsers require an initial user gesture (click or keypress)
      // to permit audio recording. This global fallback listener activates mic on first user interaction!
      const handleFirstInteraction = () => {
        if (
          handsFreeActiveRef.current &&
          !recognitionRef.current?.started &&
          !alarmTimerActiveRef.current
        ) {
          startListening();
        }
      };

      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('touchstart', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });

      return () => {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
    }
  }, [handsFreeActive, startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
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
        handsFreeActive,
        setHandsFreeActive,
        permissionDenied,
        // Alarm Timer State & Actions
        alarmTimerActive,
        graceCountdown,
        triggerAlarmTimer,
        cancelAlarmTimer,
        triggerAlarmNow,
        emergencyActive,
        setEmergencyActive,
        activeEmergencyId,
        deactivateAlarm,
        deactivatingAlarm,
        isSpeechSupported: !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)),
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export default VoiceProvider;
