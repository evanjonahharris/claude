'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import type { DashboardMetrics } from '@/lib/types';
import type { Lead } from '@/lib/types';
import { computeMetrics } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    const res = await fetch('/api/leads?filter=all&limit=2000');
    const data = await res.json() as { leads: Lead[] };
    setMetrics(computeMetrics(data.leads));
    setLastSync(new Date().toLocaleTimeString());
    setLoading(false);
  }

  async function runRecalculate() {
    setRefreshing(true);
    await fetch('/api/recalculate', { method: 'POST' });
    await loadMetrics();
    setRefreshing(false);
  }

  useEffect(() => { if (session) loadMetrics(); }, [session]);

  if (status === 'loading') return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  if (!session) { signIn('google'); return null; }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
            {lastSync && <p className="text-xs text-slate-400 mt-0.5">Last refreshed {lastSync}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={runRecalculate} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">
              {refreshing ? <Spinner size="sm" /> : (
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Total Leads" value={metrics.totalLeads} color="slate" />
              <MetricCard label="New Leads" value={metrics.newLeads} color="slate" />
              <MetricCard label="Calls Today" value={metrics.callsToday} color="blue" />
              <MetricCard label="Connected" value={metrics.connected} color="blue" />
              <MetricCard label="Interested" value={metrics.interested} color="emerald" />
              <MetricCard label="Partnered" value={metrics.partnered} color="emerald" />
              <MetricCard label="Email Sent" value={metrics.emailSent} color="blue" />
              <MetricCard label="Responded Positive" value={metrics.respondedPositive} color="emerald" />
              <MetricCard label="Needs Research" value={metrics.needsResearch} color="orange" />
              <MetricCard label="Do Not Contact" value={metrics.doNotContact} color="red" />
            </div>
          ) : null}

          {/* Sync Controls */}
          <div className="mt-8">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Sync</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SyncCard
                title="Gmail Sync"
                description="Scan recent inbox replies and update lead statuses."
                endpoint="/api/sync/gmail"
              />
              <SyncCard
                title="Quo / OpenPhone Sync"
                description="Pull missed calls and voicemails from Quo into CRM."
                endpoint="/api/sync/quo"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.slate}`}>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs font-medium mt-1 opacity-70">{label}</p>
    </div>
  );
}

function SyncCard({ title, description, endpoint }: { title: string; description: string; endpoint: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json() as { success?: boolean; error?: string; leadsUpdated?: number; emailsChecked?: number; callsChecked?: number };
      if (data.error) setResult(`Error: ${data.error}`);
      else setResult(`Done. Updated ${data.leadsUpdated ?? 0} leads.`);
    } catch (err) {
      setResult(`Error: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <button onClick={run} disabled={running}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {running ? <Spinner size="sm" /> : 'Run'}
        </button>
      </div>
      {result && <p className={`mt-3 text-xs px-3 py-2 rounded-lg ${result.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{result}</p>}
    </div>
  );
}
