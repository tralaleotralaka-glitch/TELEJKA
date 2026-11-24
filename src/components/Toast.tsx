import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'success' | 'info' | 'warning';
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const Icon =
    toast.tone === 'warning'
      ? AlertTriangle
      : toast.tone === 'info'
        ? Info
        : CheckCircle2;

  const iconColor =
    toast.tone === 'warning'
      ? 'text-amber-400'
      : toast.tone === 'info'
        ? 'text-sky-400'
        : 'text-emerald-400';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-none"
    >
      <div className="tg-card rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md">
        <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
        <p className="text-sm font-medium leading-snug">{toast.text}</p>
      </div>
    </div>
  );
};
