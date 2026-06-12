'use client';

import { useState, useEffect } from 'react';
import type { Lead } from '@/lib/types';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { LeadDetail } from '@/components/leads/LeadDetail';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';

export function CRMTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);

  const LIMIT = 50;

  async function fetchLeads(p = 1, q = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter: 'all', page: String(p), limit: String(LIMIT), search: q });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json() as { leads: Lead[]; total: number };
      setLeads(data.leads);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(1); }, []);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search all leads…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchLeads(1, e.target.value); setPage(1); }}
          />
        </div>
        <span className="text-sm text-slate-500">{total.toLocaleString()} total</span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Facility</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Lock</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Next Step</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Last Outreach</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 border-b border-slate-200">Last Outcome</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr
                  key={lead.recordId}
                  onClick={() => setSelected(lead)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  <td className="px-4 py-3 border-b border-slate-100">
                    <p className="font-medium text-slate-900 truncate max-w-[200px]">{lead.facilityName}</p>
                    <p className="text-xs text-slate-400">{lead.facilityType} · {lead.physicalCity}</p>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    <LeadStatusBadge status={lead.leadStatus} />
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-xs text-slate-400">
                    {lead.leadStatusLocked !== null ? `Locked ${lead.leadStatusLocked}` : ''}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-slate-600 truncate max-w-[140px]">
                    {lead.contactPersonName}<br />
                    <span className="text-xs text-slate-400">{lead.phone1}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-slate-600">{lead.nextStep || '—'}</td>
                  <td className="px-4 py-3 border-b border-slate-100 text-slate-500 whitespace-nowrap">
                    {formatDate(lead.latestOutreachDate)}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-slate-500 truncate max-w-[160px]">
                    {lead.latestOutreachOutcome || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > LIMIT && !loading && (
        <div className="flex justify-center items-center gap-3 p-4 border-t border-slate-200">
          <button onClick={() => { setPage((p) => p - 1); fetchLeads(page - 1); }} disabled={page <= 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
          <span className="text-sm text-slate-600">Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => { setPage((p) => p + 1); fetchLeads(page + 1); }} disabled={page >= Math.ceil(total / LIMIT)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.facilityName ?? ''} wide>
        {selected && (
          <LeadDetail
            lead={selected}
            onUpdated={(updates) => {
              setSelected((prev) => prev ? { ...prev, ...updates } : null);
              setLeads((prev) => prev.map((l) => l.recordId === selected.recordId ? { ...l, ...updates } : l));
            }}
          />
        )}
      </Modal>
    </div>
  );
}
