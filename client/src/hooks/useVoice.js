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
  const phraseMatchedRef = useRef(false);

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
    phraseMatchedRef.current = false;
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
      phraseMatchedRef.current = false;
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
        const text = currentTranscript.toLowerCase().trim();
        setTranscript(text);

        const target = (user?.emergencyPhrase || emergencyPhraseInput || 'Lavender Moonlight')
          .toLowerCase()
          .trim();
        const normalizedText = text.replace(/[^a-z0-9]+/g, ' ').trim();
        const normalizedTarget = target.replace(/[^a-z0-9]+/g, ' ').trim();

        if (
          normalizedTarget.length > 2 &&
          normalizedText.includes(normalizedTarget) &&
          !phraseMatchedRef.current
        ) {
          phraseMatchedRef.current = true;
          setKeywordMatched(true);
          setHandsFreeActive(false);
          try {
            recognition.stop();
          } catch (e) {
            // Recognition may already have ended after the phrase was heard.
          }
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
        if (handsFreeRef.current && !phraseMatchedRef.current) {
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
