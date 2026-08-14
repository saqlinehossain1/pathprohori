import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';

export const useVoice = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [keywordMatched, setKeywordMatched] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [emergencyPhraseInput, setEmergencyPhraseInput] = useState(
    user?.emergencyPhrase || 'Lavender Moonlight'
  );
  const [duressPinInput, setDuressPinInput] = useState(user?.duressPin || '');

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

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('Listening for secret phrase...');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript.toLowerCase();
      setTranscript(text);

      const target = (user?.emergencyPhrase || 'Lavender Moonlight').toLowerCase();
      if (text.includes(target) || text.includes('help') || text.includes('emergency')) {
        setKeywordMatched(true);
        recognition.stop();
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [user?.emergencyPhrase]);

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
  };
};

export default useVoice;
