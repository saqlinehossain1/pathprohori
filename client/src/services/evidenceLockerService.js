import API from '../api/axiosConfig';

/**
 * PATHPROHORI - Low-Bandwidth Evidence Locker Service
 * Silently captures ultra-compressed photo bursts and ambient audio clips
 * immediately upon emergency activation and uploads them to secure cloud storage.
 */

// Helper to convert Blob to Base64 Data URL
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Capture a burst of silent, compressed snapshots via device camera
 * @param {string} emergencyId - The MongoDB ID of the active emergency
 * @param {object} options - Configuration for photo count, interval, and callbacks
 */
export const captureSilentPhotos = async (emergencyId, options = {}) => {
  if (!emergencyId) return [];
  const count = options.count || 3;
  const intervalMs = options.intervalMs || 900;
  const onProgress = options.onProgress || (() => {});

  let stream = null;
  let videoEl = null;
  const uploadedPhotos = [];

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[Evidence Locker] MediaDevices API not supported on this browser.');
      return [];
    }

    // Attempt environment (rear) camera first, fallback to user (front) camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
    } catch (rearErr) {
      console.warn('[Evidence Locker] Rear camera unavailable, trying default camera:', rearErr);
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    // Create offscreen video element
    videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.position = 'fixed';
    videoEl.style.top = '-9999px';
    videoEl.style.left = '-9999px';
    videoEl.style.opacity = '0';
    videoEl.style.pointerEvents = 'none';
    document.body.appendChild(videoEl);

    videoEl.srcObject = stream;

    // Wait for video playback to begin
    await new Promise((resolve) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play().then(resolve).catch(resolve);
      };
      // Fallback timeout in case onloadedmetadata doesn't fire
      setTimeout(resolve, 800);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < count; i++) {
      // Pause slightly between burst frames
      if (i > 0) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      const videoWidth = videoEl.videoWidth || 640;
      const videoHeight = videoEl.videoHeight || 480;

      // Scale to low-bandwidth target dimensions (max 640px width)
      const scale = Math.min(1, 640 / videoWidth);
      canvas.width = Math.round(videoWidth * scale);
      canvas.height = Math.round(videoHeight * scale);

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Low-bandwidth compression: JPEG quality 0.35 (~15-30 KB per photo)
      const base64Data = canvas.toDataURL('image/jpeg', 0.35);
      const sizeBytes = Math.round((base64Data.length * 3) / 4);

      try {
        const { data } = await API.post(`/emergency/${emergencyId}/evidence/photo`, {
          image: base64Data,
          sequenceIndex: i + 1,
          sizeBytes,
        });

        uploadedPhotos.push(data.photo);
        onProgress({ type: 'PHOTO', index: i + 1, total: count, photo: data.photo, sizeBytes });
        console.log(`[Evidence Locker] Photo burst frame ${i + 1}/${count} uploaded (${Math.round(sizeBytes / 1024)} KB)`);
      } catch (uploadErr) {
        console.error(`[Evidence Locker] Photo frame ${i + 1} upload failed:`, uploadErr);
      }
    }
  } catch (err) {
    console.warn('[Evidence Locker] Photo capture failed or was denied:', err.message);
  } finally {
    // Release camera tracks immediately to save battery and remove active indicator
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoEl && videoEl.parentNode) {
      videoEl.parentNode.removeChild(videoEl);
    }
  }

  return uploadedPhotos;
};

/**
 * Capture a short ambient audio clip via device microphone
 * @param {string} emergencyId - The MongoDB ID of the active emergency
 * @param {object} options - Configuration for audio duration and callbacks
 */
export const captureSilentAudio = async (emergencyId, options = {}) => {
  if (!emergencyId) return null;
  const durationMs = options.durationMs || 5000;
  const onProgress = options.onProgress || (() => {});

  let stream = null;
  let mediaRecorder = null;

  try {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      console.warn('[Evidence Locker] MediaRecorder API not supported.');
      return null;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });

    // Detect supported low-bandwidth audio MIME type
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else {
        mimeType = '';
      }
    }

    const recorderOptions = {
      audioBitsPerSecond: 16000, // 16 kbps low-bandwidth encoding (~10-25 KB for 5s)
    };
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    mediaRecorder = new MediaRecorder(stream, recorderOptions);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    return new Promise((resolve) => {
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          let base64Audio = await blobToBase64(audioBlob);
          // Strip codec sub-parameters from Data URI prefix so Cloudinary parses it cleanly
          base64Audio = base64Audio.replace(
            /^data:audio\/[a-zA-Z0-9.-]+(;codecs=[^;]+)?;base64,/i,
            'data:video/webm;base64,'
          );
          const sizeBytes = audioBlob.size;

          const { data } = await API.post(`/emergency/${emergencyId}/evidence/audio`, {
            audio: base64Audio,
            durationSec: Math.round(durationMs / 1000),
            sizeBytes,
          });

          onProgress({ type: 'AUDIO', audioClip: data.audioClip, sizeBytes });
          console.log(`[Evidence Locker] Ambient audio clip uploaded (${Math.round(sizeBytes / 1024)} KB)`);
          resolve(data.audioClip);
        } catch (uploadErr) {
          console.error('[Evidence Locker] Audio upload failed:', uploadErr);
          resolve(null);
        } finally {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }
      };

      mediaRecorder.start();

      // Stop recorder after duration
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, durationMs);
    });
  } catch (err) {
    console.warn('[Evidence Locker] Audio capture failed or was denied:', err.message);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    return null;
  }
};

/**
 * Master orchestrator for automated silent evidence capture burst upon emergency trigger
 * @param {string} emergencyId - The MongoDB ID of the active emergency
 * @param {object} callbacks - Optional progress and completion handlers
 */
export const captureEvidenceBurst = async (emergencyId, callbacks = {}) => {
  if (!emergencyId) {
    console.warn('[Evidence Locker] No emergencyId provided for evidence burst.');
    return { photos: [], audio: null, status: 'FAILED' };
  }

  console.log(`🛡️ [Evidence Locker] Initiating Low-Bandwidth Evidence Capture for Emergency: ${emergencyId}`);

  try {
    // Run silent photo burst and audio recording simultaneously
    const [photos, audio] = await Promise.all([
      captureSilentPhotos(emergencyId, {
        count: 3,
        intervalMs: 800,
        onProgress: callbacks.onProgress,
      }),
      captureSilentAudio(emergencyId, {
        durationMs: 5000,
        onProgress: callbacks.onProgress,
      }),
    ]);

    const hasPhotos = photos && photos.length > 0;
    const hasAudio = !!audio;
    const status = hasPhotos && hasAudio ? 'COMPLETED' : hasPhotos || hasAudio ? 'PARTIAL' : 'FAILED';

    // Update status on server
    try {
      await API.put(`/emergency/${emergencyId}/evidence/status`, { status });
    } catch (_) {}

    if (callbacks.onComplete) {
      callbacks.onComplete({ photos, audio, status });
    }

    return { photos, audio, status };
  } catch (err) {
    console.error('[Evidence Locker] Burst execution error:', err);
    try {
      await API.put(`/emergency/${emergencyId}/evidence/status`, { status: 'FAILED' });
    } catch (_) {}
    return { photos: [], audio: null, status: 'FAILED' };
  }
};

/**
 * Retrieve evidence locker details for an emergency
 */
export const getEmergencyEvidence = async (emergencyId) => {
  if (!emergencyId) return null;
  try {
    const { data } = await API.get(`/emergency/${emergencyId}/evidence`);
    return data;
  } catch (err) {
    console.error('[Evidence Locker] Failed to fetch evidence:', err);
    throw err;
  }
};

export default {
  captureEvidenceBurst,
  captureSilentPhotos,
  captureSilentAudio,
  getEmergencyEvidence,
};
