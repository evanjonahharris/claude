'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Lead } from '@/lib/types';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetail } from '@/components/leads/LeadDetail';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

export function NewContactsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const LIMIT = 30;

  const fetchLeads = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter: 'new-contacts', page: String(p), limit: String(LIMIT), search: q });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json() as { leads?: Lead[]; total?: number; error?: string };
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchLeads(1); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch('/api/recalculate', { method: 'POST' });
    await fetchLeads(1);
    setRefreshing(false);
  }

  async function handleUnlock(leadId: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatusLocked: null }),
    });
    fetchLeads(page);
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-slate-200">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search new contacts…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchLeads(1, e.target.value); }}
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {refreshing ? <Spinner size="sm" /> : (
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Refresh
        </button>
        <span className="text-sm text-slate-500">{total} contacts</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg font-medium">No new contacts</p>
            <p className="text-sm mt-1">Leads with New, Needs Research, or Ready to Call status will appear here.</p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.recordId}
              lead={lead}
              onClick={() => setSelected(lead)}
              onUnlock={handleUnlock}
            />
          ))
        )}

        {total > LIMIT && !loading && (
          <div className="flex justify-center gap-2 pt-4">
            <button onClick={() => { setPage((p) => p - 1); fetchLeads(page - 1); }} disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
            <span className="px-3 py-1 text-sm text-slate-600">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button onClick={() => { setPage((p) => p + 1); fetchLeads(page + 1); }} disabled={page >= Math.ceil(total / LIMIT)}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
          </div>
        )}
      </div>

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
