import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Trash2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';

export interface PhotoCaptureProps {
  onPhotoCaptured: (
    photoUrl: string,
    faceDescriptor?: number[],
    expressConsent?: boolean
  ) => void;
  currentPhotoUrl?: string;
  currentFaceDescriptor?: number[];
  currentExpressConsent?: boolean;
  label?: string;
  compact?: boolean;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCaptured,
  currentPhotoUrl,
  currentFaceDescriptor,
  currentExpressConsent = false,
  label = 'Member Profile Photo',
  compact = false,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Biometric Vector & GDPR Consent State
  const [enrolledDescriptor, setEnrolledDescriptor] = useState<number[] | null>(
    currentFaceDescriptor || null
  );
  const [expressConsent, setExpressConsent] = useState<boolean>(currentExpressConsent);
  const [isAnalyzingBiometrics, setIsAnalyzingBiometrics] = useState<boolean>(false);
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isModelLoaded, extractDescriptorFromImage } = useFaceRecognition();

  // Guarantee all video tracks are stopped on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  // Analyze photo for facial descriptor on capture or upload
  const analyzeImageBiometrics = async (
    imgSource: string | HTMLCanvasElement
  ): Promise<number[] | null> => {
    setIsAnalyzingBiometrics(true);
    setBiometricNotice('Analyzing 128-point biometric vector on-device...');

    try {
      let elementToScan: HTMLImageElement | HTMLCanvasElement;

      if (typeof imgSource === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgSource;
        });
        elementToScan = img;
      } else {
        elementToScan = imgSource;
      }

      const result = await extractDescriptorFromImage(elementToScan);

      if (result.descriptor && result.descriptor.length === 128) {
        setEnrolledDescriptor(result.descriptor);
        setBiometricNotice('128-float biometric vector successfully extracted.');
        setIsAnalyzingBiometrics(false);
        return result.descriptor;
      } else {
        setBiometricNotice(result.error || 'No face detected in photo.');
        setIsAnalyzingBiometrics(false);
        return null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBiometricNotice(`Biometric analysis warning: ${msg}`);
      setIsAnalyzingBiometrics(false);
      return null;
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setPreviewPhoto(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          // ignore play promise rejections
        });
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errName = (err as Error)?.name || '';
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError'
      ) {
        setCameraError(
          inIframe
            ? 'Camera was blocked by the embedded browser sandbox. Use "Add Photo" to upload an image.'
            : 'Camera permission was denied. Please allow camera access in your browser settings.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can use "Add Photo" to upload an image.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Camera hardware is locked by another window or component.');
      } else {
        setCameraError('Could not start camera feed. Please check permissions or upload an image file.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setPreviewPhoto(null);
    setCameraError(null);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const snapPhoto = async () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Center crop to 1:1 square
          const startX = ((video.videoWidth || size) - size) / 2;
          const startY = ((video.videoHeight || size) - size) / 2;
          ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPreviewPhoto(dataUrl);

          // Run biometric analysis on the frame
          await analyzeImageBiometrics(canvas);
        }
      } catch (e) {
        console.error('Failed to capture frame:', e);
      }
    }
  };

  const confirmCapturedPhoto = () => {
    if (previewPhoto) {
      onPhotoCaptured(previewPhoto, enrolledDescriptor || undefined, expressConsent);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCameraError(null);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        // Analyze uploaded file for biometric vector
        const descriptor = await analyzeImageBiometrics(result);
        onPhotoCaptured(result, descriptor || undefined, expressConsent);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setEnrolledDescriptor(null);
    setBiometricNotice(null);
    onPhotoCaptured('', undefined, false);
  };

  const handleConsentToggle = (checked: boolean) => {
    setExpressConsent(checked);
    if (currentPhotoUrl) {
      onPhotoCaptured(currentPhotoUrl, enrolledDescriptor || undefined, checked);
    }
  };

  return (
    <div className="space-y-3.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-300 font-bold">
            {label}
          </span>
          {currentPhotoUrl && (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo Attached
            </span>
          )}
        </div>
      )}

      {/* Action Buttons: Take New or Add Photo */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
        <button
          type="button"
          onClick={() => startCamera(facingMode)}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-b from-[#8E0E24] to-[#4A0813] border border-[#F5CE76]/50 text-[#FFE194] text-xs font-bold hover:border-[#F5CE76] hover:from-[#9E142B] hover:to-[#5A0C19] transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-[#F5CE76]" />
          <span>Take New</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#171115] border border-[#F5CE76]/30 text-stone-200 text-xs font-semibold hover:border-[#F5CE76]/60 hover:bg-[#251A21] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#F5CE76]" />
          <span>Add Photo</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-3 rounded-xl bg-[#280E14] border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{cameraError}</p>
            <p className="text-[11px] text-rose-200/80 mt-1">
              You can still click <strong>"Add Photo"</strong> to select a photo from your device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCameraError(null)}
            className="text-stone-400 hover:text-white text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Current Photo Preview, Biometric Vector Status & Remove */}
      {currentPhotoUrl && !isCameraActive && (
        <div className="p-3 rounded-2xl bg-[#140D12] border border-[#F5CE76]/30 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#F5CE76]/60 shadow-md shrink-0 bg-black">
              <img
                src={currentPhotoUrl}
                alt="Member portrait"
                className="w-full h-full object-cover"
              />
              {enrolledDescriptor && (
                <div className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-[8px] font-mono text-emerald-300 text-center py-0.5 border-t border-emerald-500/50">
                  ENROLLED
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-serif font-bold text-white truncate flex items-center gap-1.5">
                <span>Profile Photo Enrolled</span>
                {enrolledDescriptor && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-stone-300 font-mono mt-0.5">
                {enrolledDescriptor
                  ? '128-Point Neural Vector Active (On-Device)'
                  : isAnalyzingBiometrics
                  ? 'Extracting biometric vector...'
                  : 'Photo uploaded · Biometric vector pending'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Remove photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Biometric Analysis Feedback Banner */}
          {biometricNotice && (
            <div className="text-[10px] font-mono text-stone-300 px-2.5 py-1.5 rounded-lg bg-[#0A0709] border border-[#F5CE76]/20 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#F5CE76] shrink-0" />
              <span className="truncate">{biometricNotice}</span>
            </div>
          )}

          {/* Mandatory Explicit GDPR Consent Toggle */}
          <div className="pt-2 border-t border-[#F5CE76]/20">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={expressConsent}
                onChange={(e) => handleConsentToggle(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#F5CE76]/40 bg-[#090708] text-[#8E0E24] focus:ring-0 cursor-pointer"
              />
              <div className="text-left select-none">
                <span className="text-xs font-bold text-[#FFE194] leading-snug block">
                  Opt-in to Express Facial Entry at 23 Frith Street (GDPR Compliant)
                </span>
                <span className="text-[10px] text-stone-300 leading-tight block mt-0.5">
                  Authorizes on-device biometric dual verification and hands-free kiosk release. Zero raw video is transmitted or stored on cloud servers. You may revoke consent at any time.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Full-Screen / Modal Camera View */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden border-2 border-[#F5CE76]/60 bg-[#0E0A0D] shadow-2xl flex flex-col">
            {/* Top Bar */}
            <div className="p-3.5 bg-[#170E14] border-b border-[#F5CE76]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#F5CE76]" />
                <span className="text-xs font-mono font-bold uppercase text-[#FFE194]">
                  Capture Biometric Photo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-1.5 rounded-lg bg-[#2A1520] text-stone-300 hover:text-white hover:bg-[#3D1E2E] transition-colors"
                  title="Switch camera"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F5CE76]" />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1.5 rounded-lg bg-black/40 text-stone-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video or Snapshot Preview */}
            <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
              {previewPhoto ? (
                <div className="relative w-full h-full">
                  <img
                    src={previewPhoto}
                    alt="Captured snapshot"
                    className="w-full h-full object-cover"
                  />
                  {isAnalyzingBiometrics && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#F5CE76] border-t-transparent animate-spin mb-2" />
                      <div className="text-xs font-mono text-[#FFE194] font-bold">
                        Computing 128-D Vector...
                      </div>
                      <div className="text-[10px] text-stone-300 font-mono mt-0.5">
                        Client-side neural inference
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Portrait Oval Overlay for Face Framing */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-60 rounded-full border-2 border-dashed border-[#F5CE76]/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                  <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center">
                    <span className="text-[10px] font-mono text-[#FFE194] bg-black/80 px-3 py-1 rounded-full border border-[#F5CE76]/30">
                      Center face inside guide
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-[#140D12] border-t border-[#F5CE76]/30 space-y-3">
              {previewPhoto ? (
                <>
                  {/* Consent checkbox on confirmation screen */}
                  <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl bg-[#090608] border border-[#F5CE76]/30">
                    <input
                      type="checkbox"
                      checked={expressConsent}
                      onChange={(e) => setExpressConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#F5CE76]/40 bg-[#120B0F] text-[#8E0E24] cursor-pointer"
                    />
                    <div className="text-left select-none text-[10px] text-stone-200">
                      <span className="font-bold text-[#FFE194] block">
                        Opt-in to Express Facial Entry (GDPR Compliant)
                      </span>
                      Enables hands-free verification at 23 Frith Street door kiosk.
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPhoto(null);
                        setEnrolledDescriptor(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#20141A] text-stone-300 text-xs font-semibold hover:bg-[#2D1B24] border border-[#F5CE76]/25"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={confirmCapturedPhoto}
                      disabled={isAnalyzingBiometrics}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#9E142B] hover:to-[#5A0C19] text-[#FFE194] border border-[#F5CE76]/50 text-xs font-bold font-mono flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 text-[#F5CE76]" /> Use Photo
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2.5 px-4 rounded-xl bg-[#1C1117] text-stone-400 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={snapPhoto}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8E0E24] via-[#5C0A17] to-[#8E0E24] text-[#FFE194] border border-[#F5CE76]/60 font-mono text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-[#F5CE76]" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal dialog for updating a photo and enrolling biometric vectors on existing members
 */
export interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  onPhotoUpdated?: (updatedMember: Member) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  member,
  onPhotoUpdated,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(member.photoUrl || '');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | undefined>(
    member.faceDescriptor
  );
  const [expressConsent, setExpressConsent] = useState<boolean>(
    member.expressFacialConsent ?? true
  );
  const [isSaved, setIsSaved] = useState(false);
  const currentStaff = clubStore.getCurrentStaff();

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedMember: Member = {
      ...member,
      photoUrl: photoUrl.trim() || member.photoUrl,
      faceDescriptor: faceDescriptor || member.faceDescriptor,
      expressFacialConsent: expressConsent,
      expressFacialConsentTimestamp: expressConsent ? new Date().toISOString() : undefined,
    };

    clubStore.saveMember(
      updatedMember,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Updated member profile photo & biometric face vector for ${member.fullName} (${member.memberNumber})`
    );

    setIsSaved(true);
    if (onPhotoUpdated) {
      onPhotoUpdated(updatedMember);
    }

    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden border-2 border-[#F5CE76]/50 bg-[#120A0E] text-stone-100 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F5CE76]/20">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#FFE194]">
              Biometric Enrollment: {member.fullName}
            </h3>
            <p className="text-xs font-mono text-stone-300">
              Ref: {member.memberNumber} · {member.status.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-[#251016]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          <div className="text-xs text-stone-300 leading-relaxed">
            Snap a fresh camera snapshot or upload a portrait to extract the 128-float on-device facial recognition vector:
          </div>

          <PhotoCapture
            currentPhotoUrl={photoUrl}
            currentFaceDescriptor={faceDescriptor}
            currentExpressConsent={expressConsent}
            onPhotoCaptured={(newUrl, newDescriptor, newConsent) => {
              setPhotoUrl(newUrl);
              if (newDescriptor) setFaceDescriptor(newDescriptor);
              if (newConsent !== undefined) setExpressConsent(newConsent);
            }}
            label="Capture or Upload Photo"
          />

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Biometric profile updated and saved to Cloud Firestore!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F5CE76]/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C1117] hover:bg-[#281822] border border-[#F5CE76]/25 text-stone-300 text-xs font-mono"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#9E142B] hover:to-[#5A0C19] border border-[#F5CE76]/60 text-[#FFE194] text-xs font-mono font-bold shadow-md active:scale-95"
          >
            Save Biometric Profile
          </button>
        </div>
      </div>
    </div>
  );
};
