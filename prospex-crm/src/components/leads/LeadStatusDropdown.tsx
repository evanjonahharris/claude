'use client';

import { useState } from 'react';
import { LEAD_STATUSES } from '@/data/outreach_outcome_key';
import { getOutcomesByLeadStatus } from '@/data/outreach_outcome_key';

interface LeadStatusDropdownProps {
  value: string;
  onChange: (newStatus: string, suggestedOutcome?: string) => void;
  disabled?: boolean;
}

export function LeadStatusDropdown({ value, onChange, disabled }: LeadStatusDropdownProps) {
  const [disambig, setDisambig] = useState<{ status: string; options: string[] } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    const matchingOutcomes = getOutcomesByLeadStatus(newStatus);

    if (matchingOutcomes.length === 1) {
      onChange(newStatus, matchingOutcomes[0].displayLabel);
    } else if (matchingOutcomes.length > 1) {
      // Ask user which outcome fits
      setDisambig({ status: newStatus, options: matchingOutcomes.map((o) => o.displayLabel) });
    } else {
      onChange(newStatus);
    }
  }

  function handleDisambigSelect(outcomeLabel: string) {
    if (!disambig) return;
    onChange(disambig.status, outcomeLabel);
    setDisambig(null);
  }

  return (
    <>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {disambig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDisambig(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-slate-900 mb-2">Which outcome best fits?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Multiple outcomes map to <strong>{disambig.status}</strong>. Select the one that best describes this interaction.
            </p>
            <div className="space-y-2">
              {disambig.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleDisambigSelect(opt)}
                  className="w-full text-left px-4 py-2 rounded-lg text-sm hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={() => setDisambig(null)} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
