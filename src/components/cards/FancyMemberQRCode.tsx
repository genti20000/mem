import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface FancyMemberQRCodeProps {
  text: string;
  size?: number;
  className?: string;
}

export const FancyMemberQRCode: React.FC<FancyMemberQRCodeProps> = ({
  text,
  size = 230,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Generate QR matrix with High error correction (30% recoverable for center emblem)
      const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
      const modules = qr.modules;
      const moduleCount = modules.size;

      // Handle high DPI screens
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      // 1. Draw luxury warm parchment background
      ctx.fillStyle = '#FCF9F3';
      ctx.fillRect(0, 0, size, size);

      // 2. Subtle Art Deco gold perimeter frame
      ctx.strokeStyle = '#E8CCA0';
      ctx.lineWidth = 1;
      ctx.strokeRect(6, 6, size - 12, size - 12);

      ctx.strokeStyle = '#DFBE7B';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(9, 9, size - 18, size - 18);

      // Corner accent triangles
      const drawCornerBracket = (x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.fillStyle = '#C5A059';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawCornerBracket(6, 6, 0);
      drawCornerBracket(size - 6, 6, 90);
      drawCornerBracket(size - 6, size - 6, 180);
      drawCornerBracket(6, size - 6, 270);

      // Margin and module size calculations
      const padding = 16;
      const contentSize = size - padding * 2;
      const cellSize = contentSize / moduleCount;

      // Center logo boundary in module units (protects center from regular dots)
      const centerStart = Math.floor(moduleCount * 0.36);
      const centerEnd = Math.ceil(moduleCount * 0.64);

      // Helper: check if a module is inside one of the 3 corner finder patterns (7x7 modules)
      const isFinder = (r: number, c: number) => {
        if (r < 7 && c < 7) return true; // Top-Left
        if (r < 7 && c >= moduleCount - 7) return true; // Top-Right
        if (r >= moduleCount - 7 && c < 7) return true; // Bottom-Left
        return false;
      };

      // Helper: check if in center logo area
      const isCenterLogo = (r: number, c: number) => {
        return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
      };

      // 3. Draw modules with smooth rounded dot aesthetic
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinder(r, c) || isCenterLogo(r, c)) continue;

          if (modules.get(r, c)) {
            const x = padding + c * cellSize;
            const y = padding + r * cellSize;
            const radius = (cellSize / 2) * 0.82;

            ctx.fillStyle = '#180B12'; // Deep luxury noir
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 4. Draw bespoke Art Deco Corner Finder Eyes
      const drawFinderEye = (startX: number, startY: number) => {
        const eyeWidth = 7 * cellSize;
        const cx = startX + eyeWidth / 2;
        const cy = startY + eyeWidth / 2;

        // Outer rounded square in dark obsidian
        ctx.fillStyle = '#180B12';
        const outerR = cellSize * 1.5;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(startX, startY, eyeWidth, eyeWidth, outerR);
          ctx.fill();
        } else {
          ctx.fillRect(startX, startY, eyeWidth, eyeWidth);
        }

        // Gold outer hairline outline
        ctx.strokeStyle = '#E8CCA0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner white/cream cutout
        ctx.fillStyle = '#FCF9F3';
        const innerInset = cellSize * 1.1;
        const innerWidth = eyeWidth - innerInset * 2;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(startX + innerInset, startY + innerInset, innerWidth, innerWidth, outerR * 0.7);
          ctx.fill();
        } else {
          ctx.fillRect(startX + innerInset, startY + innerInset, innerWidth, innerWidth);
        }

        // Center solid gold/obsidian core
        ctx.fillStyle = '#5A0D1C'; // Deep Amica burgundy
        const coreInset = cellSize * 2.1;
        const coreWidth = eyeWidth - coreInset * 2;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(startX + coreInset, startY + coreInset, coreWidth, coreWidth, outerR * 0.5);
          ctx.fill();
        } else {
          ctx.fillRect(startX + coreInset, startY + coreInset, coreWidth, coreWidth);
        }

        // Tiny gold center dot
        ctx.fillStyle = '#E8CCA0';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      };

      // Top-Left Finder
      drawFinderEye(padding, padding);
      // Top-Right Finder
      drawFinderEye(padding + (moduleCount - 7) * cellSize, padding);
      // Bottom-Left Finder
      drawFinderEye(padding, padding + (moduleCount - 7) * cellSize);

      // 5. Draw Luxury Center Crest Emblem (Amica Soho Hallmark)
      const centerCx = size / 2;
      const centerCy = size / 2;
      const emblemRadius = cellSize * 3.6;

      // Outer gold shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Center background circle in royal burgundy
      ctx.fillStyle = '#4A0713';
      ctx.beginPath();
      ctx.arc(centerCx, centerCy, emblemRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Double gold ring border around center emblem
      ctx.strokeStyle = '#DFBE7B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerCx, centerCy, emblemRadius - 1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#E8CCA0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(centerCx, centerCy, emblemRadius - 3.5, 0, Math.PI * 2);
      ctx.stroke();

      // Draw "A" monogram in gold Cinzel/Serif
      ctx.fillStyle = '#FFEAA7';
      ctx.font = `bold ${Math.round(emblemRadius * 1.05)}px 'Cinzel', 'Cormorant Garamond', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', centerCx, centerCy - 1);

      // Tiny subtitle "SOHO"
      ctx.fillStyle = '#DFBE7B';
      ctx.font = `600 ${Math.max(6, Math.round(emblemRadius * 0.3))}px sans-serif`;
      ctx.letterSpacing = '1px';
      ctx.fillText('SOHO', centerCx, centerCy + emblemRadius * 0.58);
    } catch (err) {
      console.error('Failed to draw fancy QR code:', err);
    }
  }, [text, size]);

  return (
    <div className={`relative inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-2xl shadow-xl border border-[#DFBE7B]/50 block mx-auto"
      />
    </div>
  );
};
