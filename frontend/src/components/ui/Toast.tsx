'use client';

import React from 'react';
import toast, { Toaster as HotToaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#F8FAFC',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          borderRadius: '16px',
          padding: '12px 18px',
          fontSize: '14px',
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#0F172A',
          },
          style: {
            border: '1px solid rgba(16, 185, 129, 0.3)',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#0F172A',
          },
          style: {
            border: '1px solid rgba(239, 68, 68, 0.3)',
          },
        },
      }}
    />
  );
};

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) =>
    toast(message, {
      icon: 'ℹ️',
      style: {
        border: '1px solid rgba(99, 102, 241, 0.4)',
      },
    }),
  loading: (message: string) => toast.loading(message),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};

export default ToastProvider;
