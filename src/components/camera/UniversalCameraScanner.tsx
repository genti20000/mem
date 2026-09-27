import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  X,
  Sparkles,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Member, StaffUser } from '../../types';
import { clubStore } from '../../services/storage';
import { parseMemberFromQRToken } from '../../services/security';

export interface UniversalCameraScannerProps {
  mode?: 'modal' | 'inline';
  isOpen?: boolean;
  onClose?: () => void;
  onMemberScanned: (member: Member) => void;
  currentStaff?: StaffUser;
  currentCustomerCount?: number;
  venueDate?: Date;
  onAdmitDirectly?: (member: Member) => void;
}

// Play luxury chime for door feedback
function playAudioFeedback(success: boolean) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.23);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc.frequency.exponentialRampToValueAtTime(164.81, ctx.currentTime + 0.14); // E3
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.23);
    }
  } catch {
    // Autoplay restrictions or headless browser
  }
}

export const UniversalCameraScanner: React.FC<UniversalCameraScannerProps> = ({
  mode = 'modal',
  isOpen = true,
  onClose,
  onMemberScanned,
  currentStaff,
  currentCustomerCount = 0,
  venueDate = new Date(),
  onAdmitDirectly,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preserve callbacks in refs to avoid re-triggering effects
  const onMemberScannedRef = useRef(onMemberScanned);
  onMemberScannedRef.current = onMemberScanned;

  const onAdmitDirectlyRef = useRef(onAdmitDirectly);
  onAdmitDirectlyRef.current = onAdmitDirectly;

  // Video devices & orientation
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    mode === 'inline' ? 'user' : 'environment'
  );

  // Controls & States
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const [cameraState, setCameraState] = useState<
    'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIframeSandbox, setIsIframeSandbox] = useState<boolean>(false);

  // Scan detection & result
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const [scanFlash, setScanFlash] = useState<'success' | 'failure' | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    member: Member | null;
    rawText: string;
    isValid: boolean;
    reason?: string;
  } | null>(null);

  // Manual fallback search
  const [manualQuery, setManualQuery] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);

  // Detect iframe sandbox on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setIsIframeSandbox(true);
      }
    } catch {
      setIsIframeSandbox(true);
    }
  }, []);

  // Stop media stream tracks cleanly
  const stopStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
  }, []);

  // Enumerate cameras available on this device - safely guarded against re-render loops
  const enumerateVideoDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices((prev) => {
        // Compare previous device IDs to avoid useless re-renders
        const prevIds = prev.map((d) => d.deviceId).join(',');
        const newIds = videoInputs.map((d) => d.deviceId).join(',');
        if (prevIds === newIds) return prev;
        return videoInputs;
      });
    } catch (err) {
      console.warn('enumerateDevices error:', err);
    }
  }, []);

  // Process decoded QR text string
  const handleDecodedText = useCallback((rawText: string) => {
    if (isProcessingRef.current) return;
    setIsProcessing(true);

    const trimmed = rawText.trim();
    const members = clubStore.getMembers();
    const tokenResult = parseMemberFromQRToken(trimmed, members);

    let memberMatch: Member | null = null;
    let isValid = false;
    let reason = '';

    if (tokenResult.valid && tokenResult.member) {
      const found = tokenResult.member as Member;
      memberMatch = found;
      if (found.status === 'active') {
        isValid = true;
      } else if (found.status === 'waiting_48_hours') {
        isValid = false;
        reason = 'Mandatory 48-hour statutory waiting period is still active.';
      } else if (found.status === 'suspended') {
        isValid = false;
        reason = 'Membership privileges currently suspended by management.';
      } else {
        isValid = false;
        reason = `Membership status is "${found.status.toUpperCase()}".`;
      }
    } else {
      // Fallback: direct match on memberNumber or id
      const direct = members.find(
        (m) =>
          m.id.toLowerCase() === trimmed.toLowerCase() ||
          m.memberNumber.toLowerCase() === trimmed.toLowerCase()
      );
      if (direct) {
        memberMatch = direct;
        if (direct.status === 'active') {
          isValid = true;
        } else {
          isValid = false;
          reason = `Member status is "${direct.status.toUpperCase()}".`;
        }
      } else {
        isValid = false;
        reason = tokenResult.error || 'Unrecognized QR token or member not found in register.';
      }
    }

    // Audio & Haptic Feedback
    setScanFlash(isValid ? 'success' : 'failure');
    if (soundEnabledRef.current) {
      playAudioFeedback(isValid);
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(isValid ? [60, 40, 60] : [180, 80, 180]);
      } catch {
        // ignore
      }
    }

    setScannedResult({
      member: memberMatch,
      rawText: trimmed,
      isValid,
      reason,
    });

    if (isValid && memberMatch) {
      onMemberScannedRef.current(memberMatch);
      setTimeout(() => {
        setScanFlash(null);
        setIsProcessing(false);
      }, 1200);
    } else {
      setTimeout(() => {
        setScanFlash(null);
        setIsProcessing(false);
      }, 1500);
    }
  }, []);

  // Start Camera Function: explicit, guarded, no auto-loop
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraState('requesting');
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setErrorMessage('Camera API is not supported on this browser or platform.');
      return;
    }

    // Build constraints
    const buildConstraints = (strict = false): MediaStreamConstraints => {
      if (selectedDeviceId) {
        return {
          audio: false,
          video: strict
            ? { deviceId: { exact: selectedDeviceId } }
            : { deviceId: selectedDeviceId },
        };
      }
      return {
        audio: false,
        video: strict
          ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: facingMode } },
      };
    };

    let stream: MediaStream | null = null;

    try {
      // Primary attempt
      stream = await navigator.mediaDevices.getUserMedia(buildConstraints(true));
    } catch (errFirst) {
      console.warn('Initial camera constraints failed, attempting relaxed fallback:', errFirst);
      try {
        // Stage 2: Relaxed attempt with facingMode only
        stream = await navigator.mediaDevices.getUserMedia(buildConstraints(false));
      } catch (errSecond) {
        console.warn('Relaxed camera constraints failed, attempting basic { video: true }:', errSecond);
        try {
          // Stage 3: Absolute universal fallback - ANY camera stream available
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (errFinal: unknown) {
          console.warn('Camera access unavailable:', errFinal);
          setCameraState('denied');
          const err = errFinal as Error;
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
            setErrorMessage(
              isIframeSandbox
                ? 'Camera access was blocked by the embedded browser sandbox. Click "Open in Standalone Tab" or use file upload / simulation tokens.'
                : 'Camera permission was denied. Please allow camera access in browser settings.'
            );
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setErrorMessage('No camera device detected on this hardware.');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setErrorMessage(
              'Camera hardware is locked by another window or component (Dual Camera Resource Lock). Close other camera feeds and click Retry.'
            );
          } else {
            setErrorMessage(err.message || 'Unable to access camera.');
          }
          return;
        }
      }
    }

    if (!stream) return;

    mediaStreamRef.current = stream;

    // Detect Torch capability
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
        setHasTorch(Boolean(capabilities.torch));
      } catch {
        setHasTorch(false);
      }
    }

    // Populate video element
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Video play() interrupted:', playErr);
      }
      setCameraState('active');

      // Safely enumerate available devices now that camera permission is granted
      enumerateVideoDevices();

      // Start continuous scanning loop via jsQR
      let lastScanTime = 0;
      const scanLoop = (timestamp: number) => {
        if (!videoRef.current || !canvasRef.current) return;

        // Throttle scanning to ~15fps for optimal performance
        if (timestamp - lastScanTime >= 65) {
          lastScanTime = timestamp;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (video.readyState === video.HAVE_ENOUGH_DATA && ctx && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (qrCode && qrCode.data) {
              handleDecodedText(qrCode.data);
            }
          }
        }

        animationFrameId.current = requestAnimationFrame(scanLoop);
      };

      animationFrameId.current = requestAnimationFrame(scanLoop);
    }
  }, [facingMode, selectedDeviceId, stopStream, enumerateVideoDevices, handleDecodedText, isIframeSandbox]);

  // Main lifecycle: ONLY re-run when isOpen, selectedDeviceId, or facingMode changes!
  useEffect(() => {
    let isCancelled = false;

    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [isOpen, selectedDeviceId, facingMode]); // Explicit dependencies only!

  // Handle Photo / File snapshot scanning fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            handleDecodedText(code.data);
          } else {
            setErrorMessage('No readable QR code found in the selected photo.');
            setScanFlash('failure');
            if (soundEnabledRef.current) playAudioFeedback(false);
            setTimeout(() => setScanFlash(null), 1500);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
  };

  // Toggle Front / Back camera
  const handleFlipCamera = () => {
    setSelectedDeviceId('');
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Select specific camera device
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowDeviceDropdown(false);
  };

  // Manual ID or Name search
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setManualError(null);

    const members = clubStore.getMembers();
    const q = manualQuery.trim().toLowerCase();
    const found = members.find(
      (m) =>
        m.memberNumber.toLowerCase() === q ||
        m.fullName.toLowerCase().includes(q) ||
        m.id.toLowerCase() === q
    );

    if (found) {
      handleDecodedText(found.memberNumber);
      setManualQuery('');
    } else {
      setManualError(`No registered member found for "${manualQuery}".`);
      setScanFlash('failure');
      if (soundEnabledRef.current) playAudioFeedback(false);
      setTimeout(() => setScanFlash(null), 1200);
    }
  };

  if (mode === 'modal' && !isOpen) return null;

  // Viewfinder content
  const scannerBody = (
    <div className="relative w-full h-full flex flex-col bg-[#0A0A0C] overflow-hidden select-none">
      {/* Hidden processing canvas & file input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Floating HUD Controls Bar */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraState === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/90">
              {facingMode === 'user' ? 'Kiosk Cam' : 'Handheld Scanner'}
            </span>
          </div>

          {/* Camera device picker dropdown */}
          {videoDevices.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-stone-200 text-[11px] font-mono backdrop-blur-md hover:bg-black/80 transition-colors"
                title="Select camera lens"
              >
                <span>Lens ({videoDevices.length})</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {showDeviceDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-[#161417] border border-[#3E101B] shadow-2xl p-1.5 z-40 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase text-stone-400">
                    Switch Video Input
                  </div>
                  {videoDevices.map((dev, idx) => (
                    <button
                      key={dev.deviceId || idx}
                      onClick={() => handleSelectDevice(dev.deviceId)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono truncate flex items-center justify-between ${
                        selectedDeviceId === dev.deviceId
                          ? 'bg-[#581625] text-[#E5C378]'
                          : 'text-stone-300 hover:bg-[#221B1E]'
                      }`}
                    >
                      <span className="truncate">
                        {dev.label || `Camera ${idx + 1}`}
                      </span>
                      {selectedDeviceId === dev.deviceId && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Flip Camera */}
          <button
            type="button"
            onClick={handleFlipCamera}
            className="p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-amber-200 active:scale-95 transition-all backdrop-blur-md"
            title="Flip Front / Rear Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Torch toggle */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 sm:p-2.5 rounded-xl border active:scale-95 transition-all backdrop-blur-md ${
                torchOn
                  ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-black/60 border-white/10 text-stone-300 hover:text-white'
              }`}
              title="Toggle Flash / Torch"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Snap / Upload Photo fallback */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-stone-200 active:scale-95 transition-all backdrop-blur-md"
            title="Upload QR Image"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 text-stone-300 active:scale-95 transition-all backdrop-blur-md"
            title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Close modal if in modal mode */}
          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-black/60 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 text-stone-300 hover:text-white active:scale-95 transition-all backdrop-blur-md ml-1"
              title="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Live Video Surface Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[340px]">
        {/* Real Live Video Stream */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover min-h-[260px] sm:min-h-[340px] ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
          muted
          autoPlay
          playsInline
        />

        {/* Visual Flash Feedback Layer */}
        {scanFlash === 'success' && (
          <div className="absolute inset-0 z-30 pointer-events-none animate-scan-success border-4 border-emerald-400 bg-emerald-500/20" />
        )}
        {scanFlash === 'failure' && (
          <div className="absolute inset-0 z-30 pointer-events-none animate-scan-failure border-4 border-rose-500 bg-rose-500/25" />
        )}

        {/* Loading / Requesting Camera State */}
        {cameraState === 'requesting' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#09080A] p-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#C6A052] border-t-transparent animate-spin mb-3" />
            <div className="font-serif text-lg font-bold text-[#E5C378]">
              Initializing Camera Feed...
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-xs">
              Connecting camera sensor. If prompted, please allow camera permissions.
            </p>
          </div>
        )}

        {/* Denied / Unsupported Camera State with Fallback Options */}
        {(cameraState === 'denied' || cameraState === 'unsupported') && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#100C0E]/95 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/70 border border-rose-600/60 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-rose-300">
              Camera Access Unavailable
            </h3>
            <p className="text-xs text-stone-300 mt-1 mb-4 max-w-md leading-relaxed">
              {errorMessage || 'Camera could not be started.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
              {/* Standalone Tab Button for AI Studio iframe */}
              {isIframeSandbox && (
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#581625] to-[#3E101B] hover:from-[#721C31] hover:to-[#501524] border border-[#C6A052]/60 text-[#E5C378] font-mono text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Standalone Tab</span>
                </a>
              )}

              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A1117] hover:bg-[#3D1822] border border-[#581625] text-[#E5C378] text-xs font-mono transition-colors active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Permission</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6A052] hover:bg-[#D4B063] text-black font-semibold text-xs font-mono transition-colors active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image</span>
              </button>
            </div>
          </div>
        )}

        {/* Art Deco Gold Scanning Reticle Overlay */}
        {cameraState === 'active' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Vignette mask */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Target Reticle */}
            <div
              className={`relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 border-2 transition-all duration-300 rounded-2xl ${
                scanFlash === 'success' || (scannedResult?.isValid)
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_40px_rgba(52,211,153,0.7)]'
                  : scanFlash === 'failure' || (scannedResult && !scannedResult.isValid)
                  ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.7)]'
                  : 'border-[#C6A052]/90 shadow-[0_0_24px_rgba(198,160,82,0.3)]'
              }`}
            >
              {/* Corner Brackets */}
              <div
                className={`absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors ${
                  scanFlash === 'success' ? 'border-emerald-400' : scanFlash === 'failure' ? 'border-rose-500' : 'border-[#E5C378]'
                }`}
              />
              <div
                className={`absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors ${
                  scanFlash === 'success' ? 'border-emerald-400' : scanFlash === 'failure' ? 'border-rose-500' : 'border-[#E5C378]'
                }`}
              />
              <div
                className={`absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors ${
                  scanFlash === 'success' ? 'border-emerald-400' : scanFlash === 'failure' ? 'border-rose-500' : 'border-[#E5C378]'
                }`}
              />
              <div
                className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors ${
                  scanFlash === 'success' ? 'border-emerald-400' : scanFlash === 'failure' ? 'border-rose-500' : 'border-[#E5C378]'
                }`}
              />

              {/* Animated Laser Scanning Line */}
              <div
                className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#E5C378] to-transparent shadow-[0_0_12px_#E5C378] animate-[scannerLaser_2.4s_ease-in-out_infinite] ${
                  scanFlash === 'success'
                    ? 'via-emerald-300 shadow-[0_0_14px_#34D399]'
                    : scanFlash === 'failure'
                    ? 'via-rose-400 shadow-[0_0_14px_#F43F5E]'
                    : ''
                }`}
              />

              {/* Reticle Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#C6A052]/60 rounded-full flex items-center justify-center opacity-75">
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    scanFlash === 'success' ? 'bg-emerald-400' : scanFlash === 'failure' ? 'bg-rose-500' : 'bg-[#E5C378]'
                  }`}
                />
              </div>
            </div>

            {/* Viewfinder Guidance Tag */}
            <div className="absolute bottom-4 inset-x-0 text-center">
              <span className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-[#E5C378] text-[11px] font-mono border border-[#C6A052]/40 shadow-xl tracking-wide">
                Point camera at member card QR
              </span>
            </div>
          </div>
        )}

        {/* Scanned Result Banner Overlay */}
        {scannedResult && (
          <div className="absolute inset-x-3 bottom-3 z-30 animate-fadeIn">
            {scannedResult.isValid && scannedResult.member ? (
              <div className="p-3.5 rounded-2xl bg-[#141013]/95 border-2 border-emerald-500 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-950/90 border border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        ACTIVE MEMBER
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300">
                        · {scannedResult.member.memberNumber}
                      </span>
                    </div>
                    <div className="font-serif text-base font-bold text-white truncate">
                      {scannedResult.member.fullName}
                    </div>
                    <div className="text-[11px] font-mono text-[#C6A052] truncate">
                      {scannedResult.member.hospitalityRole} at {scannedResult.member.employer}
                    </div>
                  </div>
                </div>

                {onAdmitDirectlyRef.current && (
                  <button
                    type="button"
                    onClick={() => {
                      if (scannedResult.member && onAdmitDirectlyRef.current) {
                        onAdmitDirectlyRef.current(scannedResult.member);
                      }
                      if (mode === 'modal' && onClose) {
                        onClose();
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shrink-0 transition-colors shadow-lg active:scale-95"
                  >
                    Admit Now
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[#1A0A0F]/95 border-2 border-rose-600 shadow-2xl backdrop-blur-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/90 border border-rose-500 flex items-center justify-center text-rose-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                    SCAN REJECTED
                  </div>
                  <div className="text-xs text-rose-200 mt-0.5 truncate">
                    {scannedResult.reason || 'Invalid QR code or unverified token.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Drawer: Manual Lookup & Rapid Test Badges */}
      <div className="p-3.5 bg-[#120F12] border-t border-[#2B0A13] space-y-3 shrink-0">
        {/* Manual lookup input */}
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Or type Member No. (e.g. JNY-0842) or Host name..."
              className="w-full pl-9 pr-3 py-2 bg-[#090708] border border-[#3E101B] rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#C6A052]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#581625] hover:bg-[#6E1C30] border border-[#C6A052]/40 text-[#E5C378] text-xs font-mono font-bold shrink-0 active:scale-95 transition-all"
          >
            Lookup
          </button>
        </form>

        {manualError && (
          <div className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{manualError}</span>
          </div>
        )}

        {/* Quick Simulation Badges for instant testing without cards */}
        <div className="pt-2 border-t border-[#25181E]">
          <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 text-[#E5C378]">
              <Sparkles className="w-3 h-3" /> Quick Simulation Tokens
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              Cap: {currentCustomerCount}/80
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleDecodedText('JNY-0842')}
              className="p-2 rounded-xl bg-[#191316] hover:bg-[#251820] border border-emerald-500/40 text-left active:scale-95 transition-all cursor-pointer"
            >
              <div className="text-[11px] font-serif font-bold text-emerald-300 truncate">
                Marcus Sterling
              </div>
              <div className="text-[9px] font-mono text-stone-400">JNY-0842 · ACTIVE</div>
            </button>
            <button
              type="button"
              onClick={() => handleDecodedText('JNY-1029')}
              className="p-2 rounded-xl bg-[#191316] hover:bg-[#251820] border border-amber-500/40 text-left active:scale-95 transition-all cursor-pointer"
            >
              <div className="text-[11px] font-serif font-bold text-amber-300 truncate">
                Liam O&apos;Connor
              </div>
              <div className="text-[9px] font-mono text-stone-400">JNY-1029 · 48H WAIT</div>
            </button>
            <button
              type="button"
              onClick={() => handleDecodedText('JNY-0914')}
              className="p-2 rounded-xl bg-[#191316] hover:bg-[#251820] border border-rose-500/40 text-left active:scale-95 transition-all cursor-pointer"
            >
              <div className="text-[11px] font-serif font-bold text-rose-300 truncate">
                Sophia Chen
              </div>
              <div className="text-[9px] font-mono text-stone-400">JNY-0914 · SUSPENDED</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // If inline (embedded in reception desk), return self-contained surface container
  if (mode === 'inline') {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-[#581625] shadow-2xl bg-[#0A0A0C]">
        {scannerBody}
      </div>
    );
  }

  // If modal (popped up from Scan Badge button), wrap in backdrop
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-xl rounded-2xl bg-[#120F12] border-2 border-[#581625] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {scannerBody}
      </div>
    </div>
  );
};
