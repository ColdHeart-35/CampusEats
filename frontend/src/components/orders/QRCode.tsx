'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '@/components/ui/Button';
import { Download, Copy, Check, QrCode as QrIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export interface QRCodeProps {
  value: string;
  orderId: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeProps> = ({
  value,
  orderId,
  size = 200,
  className,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    toast.success('Order ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      if (!qrRef.current) return;
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = size * 2;
      canvas.height = size * 2;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `CampusEats-QR-${orderId.slice(0, 8)}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success('QR Code downloaded');
      };

      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (err) {
      console.error('Error downloading QR code:', err);
      toast.error('Failed to download QR code');
    }
  };

  return (
    <div className={`flex flex-col items-center text-center p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-glass ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <QrIcon className="w-5 h-5 text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Pickup Verification Pass
        </span>
      </div>

      {/* QR Code Container with High-Contrast White Background for optical scanners */}
      <div
        ref={qrRef}
        className="p-4 bg-white rounded-2xl shadow-xl shadow-black/40 border-4 border-slate-800 mb-4 inline-block"
      >
        <QRCodeSVG
          value={value || orderId}
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Order ID string with copy button */}
      <div className="flex items-center justify-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-1.5 mb-5 max-w-full">
        <span className="text-xs font-mono text-slate-300 truncate max-w-[220px]">
          {orderId}
        </span>
        <button
          type="button"
          onClick={handleCopyOrderId}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Copy Order ID"
          aria-label="Copy Order ID"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Download Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        leftIcon={<Download className="w-3.5 h-3.5" />}
        className="w-full max-w-xs text-xs font-semibold"
      >
        Download QR Code
      </Button>

      <p className="text-[11px] text-slate-500 mt-3 max-w-xs">
        Present this barcode at the canteen pickup counter when your order is marked Ready.
      </p>
    </div>
  );
};

export default QRCodeDisplay;
