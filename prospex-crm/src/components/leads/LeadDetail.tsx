'use client';

import { useState } from 'react';
import type { Lead } from '@/lib/types';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadStatusDropdown } from './LeadStatusDropdown';
import { LeadStatusLockToggle } from './LeadStatusLockToggle';
import { OutcomeToggleGrid } from './OutcomeToggleGrid';
import { formatDateTime, formatDate, lockLabel } from '@/lib/utils';
import { nextAvailableOutreachN } from '@/lib/recalculate';
import { Spinner } from '@/components/ui/Spinner';

interface LeadDetailProps {
  lead: Lead;
  onUpdated: (updatedLead: Partial<Lead>) => void;
}

export function LeadDetail({ lead, onUpdated }: LeadDetailProps) {
  const [saving, setSaving] = useState(false);
  const [localLead, setLocalLead] = useState<Lead>(lead);
  const [activeTab, setActiveTab] = useState<'overview' | 'outreach' | 'contact'>('overview');
  const [callPanelOpen, setCallPanelOpen] = useState(false);

  async function patchLead(updates: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/leads/${localLead.recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const merged = { ...localLead, ...updates };
      setLocalLead(merged as Lead);
      onUpdated(updates as Partial<Lead>);
    } finally {
      setSaving(false);
    }
  }

  function handleStatusChange(newStatus: string, suggestedOutcome?: string) {
    const outreachN = nextAvailableOutreachN(localLead);
    const updates: Record<string, unknown> = {
      leadStatus: newStatus,
      leadStatusLocked: outreachN,
    };
    if (suggestedOutcome) {
      updates.outreachSlot = {
        n: outreachN,
        outcomeText: suggestedOutcome,
      };
    }
    patchLead(updates);
    setLocalLead((prev) => ({ ...prev, leadStatus: newStatus, leadStatusLocked: outreachN }));
  }

  function handleUnlock() {
    patchLead({ leadStatusLocked: null });
    setLocalLead((prev) => ({ ...prev, leadStatusLocked: null }));
  }

  function handleLock() {
    const outreachN = nextAvailableOutreachN(localLead);
    patchLead({ leadStatusLocked: outreachN });
    setLocalLead((prev) => ({ ...prev, leadStatusLocked: outreachN }));
  }

  function handleOutcomeLogged(displayLabel: string, newStatus: string, lockedN: number) {
    setLocalLead((prev) => ({
      ...prev,
      leadStatus: newStatus,
      leadStatusLocked: lockedN,
      latestOutreachOutcome: displayLabel,
    }));
    onUpdated({ leadStatus: newStatus, leadStatusLocked: lockedN });
  }

  const outreachN = nextAvailableOutreachN(localLead);
  const filledSlots = localLead.outreach.filter((s) => s.method);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{localLead.facilityName}</h3>
            <p className="text-sm text-slate-500">{localLead.facilityType} {localLead.physicalCity ? `· ${localLead.physicalCity}, ${localLead.physicalState}` : ''}</p>
          </div>
          {saving && <Spinner size="sm" />}
        </div>

        {/* Lead Status row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <LeadStatusBadge status={localLead.leadStatus} />
          <LeadStatusDropdown
            value={localLead.leadStatus}
            onChange={handleStatusChange}
            disabled={saving}
          />
          <LeadStatusLockToggle
            lockedN={localLead.leadStatusLocked}
            onUnlock={handleUnlock}
            onLock={handleLock}
            disabled={saving}
          />
        </div>

        {localLead.doNotContactReason && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Do Not Contact: {localLead.doNotContactReason}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {(['overview', 'outreach', 'contact'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {tab === 'outreach' && filledSlots.length > 0 && (
                <span className="ml-1 text-xs bg-slate-100 text-slate-600 rounded px-1">{filledSlots.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Next Step" value={localLead.nextStep} />
            <InfoRow label="Due" value={formatDateTime(localLead.dateTimeNextStep)} />
            <InfoRow label="Priority" value={localLead.priority} />
            <InfoRow label="Latest Outcome" value={localLead.latestOutreachOutcome} />
            <InfoRow label="Latest Outreach" value={formatDate(localLead.latestOutreachDate)} />
            <InfoRow label="Owner" value={localLead.ownerAssignee} />
          </div>

          {localLead.miscNotes && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{localLead.miscNotes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Clients Attained" value={localLead.clientsAttained} editable onSave={(v) => patchLead({ clientsAttained: v })} />
            <InfoRow label="Revenue Attained" value={localLead.revenueAttained} editable onSave={(v) => patchLead({ revenueAttained: v })} />
          </div>

          {/* Quick call outcomes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Log Call Outcome (Outreach {outreachN})</p>
              <button
                onClick={() => setCallPanelOpen((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {callPanelOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {callPanelOpen && (
              <OutcomeToggleGrid
                leadId={localLead.recordId}
                method="Call"
                outreachN={outreachN}
                onOutcomeLogged={handleOutcomeLogged}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="space-y-3">
          {filledSlots.length === 0 && (
            <p className="text-sm text-slate-400">No outreach logged yet.</p>
          )}
          {localLead.outreach
            .filter((s) => s.method)
            .map((slot) => (
              <OutreachSlotCard key={slot.n} slot={slot} lockedN={localLead.leadStatusLocked} />
            ))}

          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-2">Log New Outcome (Outreach {outreachN})</p>
            <div className="flex gap-2 mb-3">
              {(['Call', 'Email'] as const).map((m) => (
                <button key={m} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                  {m}
                </button>
              ))}
            </div>
            <OutcomeToggleGrid
              leadId={localLead.recordId}
              method="Call"
              outreachN={outreachN}
              onOutcomeLogged={handleOutcomeLogged}
            />
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Contact" value={localLead.contactPersonName} editable onSave={(v) => patchLead({ contactPersonName: v })} />
            <InfoRow label="Role" value={localLead.contactPersonRole} editable onSave={(v) => patchLead({ contactPersonRole: v })} />
            <InfoRow label="Phone 1" value={localLead.phone1} editable onSave={(v) => patchLead({ phone1: v })} />
            <InfoRow label="Phone 2" value={localLead.phone2} />
            <InfoRow label="Email" value={localLead.emailAddress} editable onSave={(v) => patchLead({ emailAddress: v })} />
            <InfoRow label="Fax" value={localLead.faxNumber} />
          </div>
          <InfoRow label="Address" value={localLead.fullPhysicalAddress || localLead.physicalAddress} />
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Referral Source Type" value={localLead.referralSourceType} />
            <InfoRow label="Memory Care" value={localLead.memoryCareFlag} />
            <InfoRow label="Licensed Beds" value={localLead.licensedBedCount} />
            <InfoRow label="Ownership" value={localLead.ownershipType} />
            <InfoRow label="CMS Rating" value={localLead.overallRating} />
            <InfoRow label="CMS #" value={localLead.cmsNumber} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, editable, onSave }: { label: string; value: string; editable?: boolean; onSave?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editable && editing) {
    return (
      <div className="col-span-1">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <div className="flex gap-1">
          <input
            className="flex-1 text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave?.(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
          <button onClick={() => { onSave?.(draft); setEditing(false); }} className="text-xs text-blue-600 px-2">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400 px-2">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-slate-800 ${editable ? 'cursor-pointer hover:text-blue-600' : ''}`}
        onClick={editable ? () => setEditing(true) : undefined}>
        {value || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

function OutreachSlotCard({ slot, lockedN }: { slot: { n: number; method: string; dateTime: string; outcomeText: string; callSummary: string; callFeedback: string; transcript: string }; lockedN: number | null }) {
  const isLocked = lockedN === slot.n;
  return (
    <div className={`rounded-lg border p-3 text-sm ${isLocked ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-slate-700">Outreach {slot.n} — {slot.method}</span>
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              {lockLabel(lockedN)}
            </span>
          )}
          <span className="text-xs text-slate-400">{formatDateTime(slot.dateTime)}</span>
        </div>
      </div>
      {slot.outcomeText && <p className="text-slate-600">{slot.outcomeText}</p>}
      {slot.callSummary && <p className="mt-1 text-slate-500 text-xs">{slot.callSummary}</p>}
    </div>
  );
}
