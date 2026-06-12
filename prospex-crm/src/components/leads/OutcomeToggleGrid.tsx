'use client';

import { useState } from 'react';
import { getOutcomesForMethod } from '@/data/outreach_outcome_key';
import type { OutreachMethod } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner';

interface OutcomeToggleGridProps {
  leadId: string;
  method: OutreachMethod;
  outreachN?: number;
  onOutcomeLogged: (displayLabel: string, leadStatus: string, lockedN: number) => void;
}

export function OutcomeToggleGrid({ leadId, method, outreachN, onOutcomeLogged }: OutcomeToggleGridProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastLogged, setLastLogged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outcomes = getOutcomesForMethod(method);

  async function handleToggle(displayLabel: string) {
    setLoading(displayLabel);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayLabel, method, outreachN }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');

      const data = await res.json() as { leadStatus: string; leadStatusLocked: number; outreachN: number };
      setLastLogged(displayLabel);
      onOutcomeLogged(displayLabel, data.leadStatus, data.leadStatusLocked);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(null);
    }
  }

  // Separate positive/neutral from stop outcomes
  const stopOutcomes = outcomes.filter((o) => o.stopFollowUp);
  const activeOutcomes = outcomes.filter((o) => !o.stopFollowUp);

  function renderButton(label: string, isStop: boolean) {
    const isLoading = loading === label;
    const isLast = lastLogged === label;
    return (
      <button
        key={label}
        onClick={() => handleToggle(label)}
        disabled={loading !== null}
        className={`relative px-3 py-2 rounded-lg text-sm font-medium text-left transition-all border
          ${isLast
            ? 'bg-blue-600 text-white border-blue-600'
            : isStop
              ? 'bg-white text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }
          disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" /> Logging…
          </span>
        ) : label}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {activeOutcomes.map((o) => renderButton(o.displayLabel, false))}
      </div>

      {stopOutcomes.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Stop cadence</p>
          <div className="grid grid-cols-2 gap-2">
            {stopOutcomes.map((o) => renderButton(o.displayLabel, true))}
          </div>
        </div>
      )}
    </div>
  );
}
