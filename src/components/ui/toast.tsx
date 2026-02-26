'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000, action?: ToastAction) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, duration, action };

    setToasts((prev) => [...prev, newToast]);

    // Se tiver ação, aumentar a duração para dar tempo do usuário clicar
    const finalDuration = action ? (duration || 10000) : duration;
    if (finalDuration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, finalDuration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 w-full max-w-sm p-4 space-y-2 pointer-events-none sm:max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const typeConfig = {
    success: {
      bgColor: 'var(--success-bg)',
      borderColor: 'var(--success)',
      text: 'text-success-text',
      icon: CheckCircleIcon,
    },
    error: {
      bgColor: 'var(--error-bg)',
      borderColor: 'var(--error)',
      text: 'text-error-text',
      icon: ExclamationCircleIcon,
    },
    warning: {
      bgColor: 'var(--warning-bg)',
      borderColor: 'var(--warning)',
      text: 'text-warning-text',
      icon: ExclamationCircleIcon,
    },
    info: {
      bgColor: 'var(--info-bg)',
      borderColor: 'var(--info)',
      text: 'text-info-text',
      icon: InformationCircleIcon,
    },
  };

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'pointer-events-auto animate-in slide-in-from-right-full flex items-start gap-3 rounded-lg border-2 p-4 shadow-xl transition-all'
      )}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        opacity: 1,
      }}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.text)}>{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className={cn(
              'mt-2 text-xs font-semibold underline hover:no-underline transition-all',
              config.text
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className={cn(
          'flex-shrink-0 rounded-md p-1 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer',
          config.text,
          'opacity-70 hover:opacity-100'
        )}
      >
        <XMarkIcon className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

