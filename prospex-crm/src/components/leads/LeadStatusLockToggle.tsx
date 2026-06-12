'use client';

import { lockLabel } from '@/lib/utils';

interface LeadStatusLockToggleProps {
  lockedN: number | null;
  onUnlock: () => void;
  onLock: () => void;
  disabled?: boolean;
}

export function LeadStatusLockToggle({ lockedN, onUnlock, onLock, disabled }: LeadStatusLockToggleProps) {
  const isLocked = lockedN !== null;

  return (
    <button
      onClick={isLocked ? onUnlock : onLock}
      disabled={disabled}
      title={isLocked ? `Click to unlock status (currently ${lockLabel(lockedN)})` : 'Click to lock status to current outreach'}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors
        ${isLocked
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isLocked ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        )}
      </svg>
      {isLocked ? lockLabel(lockedN) : 'Unlock'}
    </button>
  );
}
