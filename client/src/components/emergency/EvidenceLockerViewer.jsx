import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mic,
  Play,
  Pause,
  Download,
  Maximize2,
  X,
  ShieldCheck,
  HardDrive,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getEmergencyEvidence } from '../../services/evidenceLockerService';

export const EvidenceLockerViewer = ({
  emergencyId,
  initialEvidence = null,
  isLive = false,
  onEvidenceUpdated = null,
}) => {
  const [evidence, setEvidence] = useState(initialEvidence);
  const [loading, setLoading] = useState(!initialEvidence && !!emergencyId);
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef(null);

  // Fetch initial evidence if emergencyId is provided and no initialEvidence
  useEffect(() => {
    if (!emergencyId) return;

    let isMounted = true;
    const fetchEvidence = async () => {
      try {
        setLoading(true);
        const data = await getEmergencyEvidence(emergencyId);
        if (isMounted && data?.evidence) {
          setEvidence(data.evidence);
          if (onEvidenceUpdated) onEvidenceUpdated(data.evidence);
        }
      } catch (err) {
        console.warn('[EvidenceLockerViewer] Error loading evidence:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvidence();
    return () => {
      isMounted = false;
    };
  }, [emergencyId]);

  // Sync if initialEvidence prop updates from parent / socket
  useEffect(() => {
    if (initialEvidence) {
      setEvidence(initialEvidence);
    }
  }, [initialEvidence]);

  const photos = evidence?.photos || [];
  const audioClips = evidence?.audioClips || [];
  const totalSizeBytes = evidence?.totalSizeBytes || 0;
  const captureStatus = evidence?.captureStatus || 'PENDING';

  // Audio Playback Handlers
  const currentAudio = audioClips[activeAudioIndex] || null;

  const togglePlayAudio = (index = activeAudioIndex) => {
    if (!audioRef.current) return;

    if (index !== activeAudioIndex) {
      setActiveAudioIndex(index);
      setIsPlayingAudio(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
        }
      }, 50);
      return;
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.warn);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || currentAudio?.durationSec || 1;
    setAudioCurrentTime(current);
    setAudioDuration(duration);
    setAudioProgress((current / duration) * 100);
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
  };

  const handleSeekAudio = (e) => {
    if (!audioRef.current) return;
    const seekPercent = parseFloat(e.target.value);
    const duration = audioRef.current.duration || currentAudio?.durationSec || 1;
    const targetTime = (seekPercent / 100) * duration;
    audioRef.current.currentTime = targetTime;
    setAudioProgress(seekPercent);
    setAudioCurrentTime(targetTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 p-4 text-slate-900 shadow-2xs">
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-rose-600" />
          <h4 className="text-xs font-bold text-slate-900 font-display">
            Evidence Locker
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">
            ({photos.length} {photos.length === 1 ? 'photo' : 'photos'}, {audioClips.length} audio)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
          <span>Payload:</span>
          <span className="font-bold text-slate-700">{formatBytes(totalSizeBytes)}</span>
        </div>
      </div>

      {loading && (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading evidence...</span>
        </div>
      )}

      {!loading && photos.length === 0 && audioClips.length === 0 && (
        <div className="py-5 px-4 bg-white border border-slate-200/80 rounded-xl text-center space-y-1">
          <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            {captureStatus === 'CAPTURING'
              ? 'Capturing photos and audio from commuter device...'
              : 'No hardware evidence captured for this alert.'}
          </p>
          <p className="text-[10px] text-slate-400">
            Compressed files upload automatically upon emergency activation.
          </p>
        </div>
      )}

      {/* 1. Photo Snapshots Grid */}
      {photos.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-rose-500" />
              Photos ({photos.length})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <div
                key={photo.public_id || idx}
                onClick={() => setActivePhotoModal(photo)}
                className="group relative aspect-video rounded-xl overflow-hidden bg-slate-200 border border-slate-200 hover:border-slate-400 transition-all cursor-pointer shadow-2xs"
              >
                <img
                  src={photo.url}
                  alt={`Evidence Snapshot ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                {/* Minimal Frame Label */}
                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-mono text-white font-semibold">
                  {formatBytes(photo.sizeBytes)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Minimal Audio Player */}
      {audioClips.length > 0 && currentAudio && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-500" />
              Audio Recording
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {formatTime(audioDuration || currentAudio.durationSec || 5)}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
            {/* Hidden HTML5 Audio Element */}
            <audio
              ref={audioRef}
              src={currentAudio.url}
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
              preload="metadata"
            />

            {/* Clean Play/Pause Button */}
            <button
              type="button"
              onClick={() => togglePlayAudio()}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
              title={isPlayingAudio ? 'Pause Audio' : 'Play Audio Evidence'}
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-white text-white" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              )}
            </button>

            {/* Clean Slider & Time */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 min-w-[24px]">
                {formatTime(audioCurrentTime)}
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={audioProgress}
                onChange={handleSeekAudio}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600 focus:outline-hidden"
              />
              <span className="text-[10px] font-mono text-slate-400 min-w-[24px]">
                {formatTime(audioDuration || currentAudio.durationSec || 5)}
              </span>
            </div>

            {/* Download Link */}
            <a
              href={currentAudio.url}
              target="_blank"
              rel="noopener noreferrer"
              download="emergency_audio_evidence.webm"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Download Audio"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 3. Photo Lightbox Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-2.5 p-3.5 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-800 font-display">
                Snapshot #{activePhotoModal.sequenceIndex || 1}
              </span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
              <img
                src={activePhotoModal.url}
                alt="Evidence Snapshot"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Size: {formatBytes(activePhotoModal.sizeBytes)}</span>
              <a
                href={activePhotoModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-600 hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Full Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceLockerViewer;
