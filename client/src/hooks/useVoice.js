import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';

export const useVoice = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [keywordMatched, setKeywordMatched] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [handsFreeActive, setHandsFreeActive] = useState(false);

  const [emergencyPhraseInput, setEmergencyPhraseInput] = useState(
    user?.emergencyPhrase || 'Lavender Moonlight'
  );
  const [duressPinInput, setDuressPinInput] = useState(user?.duressPin || '');

  const recognitionRef = useRef(null);
  const handsFreeRef = useRef(handsFreeActive);

  useEffect(() => {
    handsFreeRef.current = handsFreeActive;
  }, [handsFreeActive]);

  useEffect(() => {
    if (user?.emergencyPhrase) {
      setEmergencyPhraseInput(user.emergencyPhrase);
    }
    if (user?.duressPin) {
      setDuressPinInput(user.duressPin);
    }
  }, [user]);

  const saveSettings = async (phrase, pin) => {
    try {
      setSavingPhrase(true);
      const updatedUser = await authApi.updateProfile({
        emergencyPhrase: phrase || emergencyPhraseInput,
        duressPin: pin || duressPinInput,
      });
      setUser((prev) => ({ ...prev, ...updatedUser }));
      return updatedUser;
    } catch (err) {
      console.error('Failed to update voice settings:', err);
      throw err;
    } finally {
      setSavingPhrase(false);
    }
  };

  const stopListening = useCallback(() => {
    setHandsFreeActive(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop error
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition is not supported by this browser.');
      return false;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('Listening for secret phrase...');
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        const text = currentTranscript.toLowerCase();
        setTranscript(text);

        const target = (user?.emergencyPhrase || emergencyPhraseInput || 'Lavender Moonlight').toLowerCase();
        
        // Match user's exact secret phrase or universal trigger keywords
        if (
          (target && target.length > 2 && text.includes(target)) ||
          text.includes('help me') ||
          text.includes('emergency')
        ) {
          setKeywordMatched(true);
          try {
            recognition.stop();
          } catch (e) {}
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If continuous hands-free mode is active and target not yet matched, auto-restart listener
        if (handsFreeRef.current && !keywordMatched) {
          setTimeout(() => {
            if (handsFreeRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          }, 300);
        }
      };

      recognition.start();
      setHandsFreeActive(true);
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      return false;
    }
  }, [user?.emergencyPhrase, emergencyPhraseInput, keywordMatched]);

  return {
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
    stopListening,
    handsFreeActive,
    setHandsFreeActive,
  };
};

export default useVoice;
