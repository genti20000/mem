import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';

export interface PhotoCaptureProps {
  onPhotoCaptured: (photoUrl: string) => void;
  currentPhotoUrl?: string;
  label?: string;
  compact?: boolean;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCaptured,
  currentPhotoUrl,
  label = 'Member Profile Photo',
  compact = false,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        setCameraError(
          inIframe
            ? 'Camera was blocked by the embedded browser sandbox. Use "Add Photo" to upload an image, or open the app in a standalone tab.'
            : 'Camera permission was denied. Please allow camera access in your browser settings.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can use "Add Photo" to upload an image.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('Camera hardware is locked by another window or component. Close other feeds or use "Add Photo".');
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

  const snapPhoto = () => {
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
        }
      } catch (e) {
        console.error('Failed to capture frame:', e);
      }
    }
  };

  const confirmCapturedPhoto = () => {
    if (previewPhoto) {
      onPhotoCaptured(previewPhoto);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCameraError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onPhotoCaptured(result);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    onPhotoCaptured('');
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-300">
            {label}
          </span>
          {currentPhotoUrl && (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Photo Attached
            </span>
          )}
        </div>
      )}

      {/* Action Buttons: Take New or Add Photo */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
        <button
          type="button"
          onClick={() => startCamera(facingMode)}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-b from-[#3E101B] to-[#250A11] border border-[#C6A052]/50 text-[#F5E6CA] text-xs font-medium hover:border-[#C6A052] hover:from-[#4E1422] hover:to-[#2F0D16] transition-all shadow-sm active:scale-98 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-[#E5C378]" />
          <span>Take New</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-[#171215] border border-[#3E101B] text-stone-200 text-xs font-medium hover:border-[#C6A052]/40 hover:bg-[#20191D] hover:text-white transition-all shadow-sm active:scale-98 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-stone-400" />
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

      {/* Current Photo Preview & Remove */}
      {currentPhotoUrl && !isCameraActive && (
        <div className="p-3 rounded-xl bg-[#120D10] border border-[#331821] flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#C6A052]/60 shadow-md shrink-0 bg-black">
            <img
              src={currentPhotoUrl}
              alt="Member portrait"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-serif font-bold text-stone-200 truncate">
              Profile Photo Active
            </div>
            <div className="text-[10px] text-stone-400 truncate">
              Applied to digital pass & door scanning
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            title="Remove photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full-Screen / Modal Camera View */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-[#C6A052]/60 bg-[#0E0B0D] shadow-2xl flex flex-col">
            {/* Top Bar */}
            <div className="p-3.5 bg-[#181114] border-b border-[#3E101B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#E5C378]" />
                <span className="text-xs font-mono font-bold uppercase text-[#E5C378]">
                  Take Member Photo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-1.5 rounded-lg bg-[#2A121A] text-stone-300 hover:text-white hover:bg-[#3D1A26] transition-colors"
                  title="Switch camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
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
                <img
                  src={previewPhoto}
                  alt="Captured snapshot"
                  className="w-full h-full object-cover"
                />
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
                    <div className="w-48 h-60 rounded-full border-2 border-dashed border-[#C6A052]/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                  </div>
                </>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-[#140F12] border-t border-[#3E101B] flex items-center justify-between gap-3">
              {previewPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(null)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#20161A] text-stone-300 text-xs font-medium hover:bg-[#2F1F27] border border-[#3E101B]"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 shadow-lg active:scale-98"
                  >
                    <Check className="w-4 h-4" /> Use Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2.5 px-4 rounded-xl bg-[#1C1518] text-stone-400 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={snapPhoto}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8B1E3F] via-[#C6A052] to-[#8B1E3F] text-black font-mono text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal dialog for updating a photo on any existing member or old application
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
  const [isSaved, setIsSaved] = useState(false);
  const currentStaff = clubStore.getCurrentStaff();

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedMember: Member = {
      ...member,
      photoUrl: photoUrl.trim() || '/src/assets/images/sample_member_photo_1790393794509.jpg',
    };

    clubStore.saveMember(
      updatedMember,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Updated member profile photo for ${member.fullName} (${member.memberNumber})`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-[#C6A052]/60 bg-[#120E11] text-stone-100 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2B0A13]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#E5C378]">
              Update Photo for {member.fullName}
            </h3>
            <p className="text-xs font-mono text-stone-400">
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
          <div className="text-xs text-stone-300">
            Use the buttons below to snap a fresh snapshot using your camera or upload a new portrait photo:
          </div>

          <PhotoCapture
            currentPhotoUrl={photoUrl}
            onPhotoCaptured={(newUrl) => {
              setPhotoUrl(newUrl);
            }}
            label="Capture or Upload Photo"
          />

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Photo updated successfully and saved to membership database!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2B0A13]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C1619] hover:bg-[#282024] border border-[#3E101B] text-stone-300 text-xs font-mono"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B1E3F] to-[#581625] hover:from-[#A02349] hover:to-[#6F1B2F] border border-[#C6A052]/60 text-[#E5C378] text-xs font-mono font-bold shadow-md active:scale-95"
          >
            Save Photo to Member
          </button>
        </div>
      </div>
    </div>
  );
};
