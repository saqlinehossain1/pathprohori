import { useContext } from 'react';
import { VoiceContext } from '../context/VoiceContext';

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

export default useVoice;
