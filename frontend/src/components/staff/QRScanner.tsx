'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Camera, Search, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export interface QRScannerProps {
  onScan: (data: string) => void;
  isLoading?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isLoading = false }) => {
  const [manualId, setManualId] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText: string) => {
          if (decodedText) {
            onScan(decodedText.trim());
          }
        },
        (errorMessage: string) => {
          // Continuous scanning generates frame errors while searching, which is expected
        }
      );
    } catch (err: unknown) {
      console.warn('Camera initialization error:', err);
      setScanError('Camera access unavailable or blocked. Please use manual entry below.');
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((err) => {
          console.warn('Error clearing QR scanner:', err);
        });
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) {
      toast.error('Please enter an Order ID');
      return;
    }
    onScan(manualId.trim());
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Camera View Area */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-glass text-center">
        <div className="flex items-center justify-center gap-2 mb-4 text-indigo-400">
          <Camera className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Live Optical Scanner
          </h4>
        </div>

        {scanError ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{scanError}</span>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
            <div id="reader" className="w-full overflow-hidden" />
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-3">
          Point camera at the customer&apos;s phone screen displaying their CampusEats QR pass.
        </p>
      </div>

      {/* Manual Input Fallback */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-glass">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
          Manual Order ID Fallback
        </h5>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <Input
            placeholder="Enter Order UUID or token (e.g. 550e8400...)"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={!manualId.trim()}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full text-xs font-bold"
          >
            Lookup & Verify Order
          </Button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
