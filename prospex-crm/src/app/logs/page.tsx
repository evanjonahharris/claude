'use client';

import { useSession, signIn } from 'next-auth/react';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui/Spinner';

interface RecalcLog {
  success: boolean;
  log: string;
  rowsScanned: number;
  rowsUpdated: number;
  sameOutreachLocksSkipped: number;
  staleLocksCleared: number;
  invalidLocks: number;
  errors: number;
  details: string[];
}

export default function LogsPage() {
  const { data: session, status } = useSession();
  const [recalcLog, setRecalcLog] = useState<RecalcLog | null>(null);
  const [gmailLog, setGmailLog] = useState<Record<string, unknown> | null>(null);
  const [quoLog, setQuoLog] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  if (status === 'loading') return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  if (!session) { signIn('google'); return null; }

  async function runRecalc() {
    setRunning('recalc');
    const res = await fetch('/api/recalculate', { method: 'POST' });
    setRecalcLog(await res.json() as RecalcLog);
    setRunning(null);
  }

  async function runGmailSync() {
    setRunning('gmail');
    const res = await fetch('/api/sync/gmail', { method: 'POST' });
    setGmailLog(await res.json() as Record<string, unknown>);
    setRunning(null);
  }

  async function runQuoSync() {
    setRunning('quo');
    const res = await fetch('/api/sync/quo', { method: 'POST' });
    setQuoLog(await res.json() as Record<string, unknown>);
    setRunning(null);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Sync Logs</h2>
          <p className="text-sm text-slate-500 mt-0.5">Run syncs and view automation results</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Lead Status Recalculation */}
          <Section title="Lead Status Recalculation" onRun={runRecalc} running={running === 'recalc'}>
            {recalcLog && (
              <div className="space-y-3">
                <div className="bg-slate-800 text-green-400 font-mono text-xs px-4 py-3 rounded-lg">
                  {recalcLog.log}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <StatPill label="Scanned" value={recalcLog.rowsScanned} />
                  <StatPill label="Updated" value={recalcLog.rowsUpdated} color="blue" />
                  <StatPill label="Lock Skipped" value={recalcLog.sameOutreachLocksSkipped} color="amber" />
                  <StatPill label="Stale Cleared" value={recalcLog.staleLocksCleared} color="emerald" />
                  <StatPill label="Invalid Locks" value={recalcLog.invalidLocks} color="red" />
                  <StatPill label="Errors" value={recalcLog.errors} color="red" />
                </div>
                {recalcLog.details.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      {recalcLog.details.length} detail lines
                    </summary>
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto">
                      {recalcLog.details.map((line, i) => (
                        <p key={i} className={`text-xs font-mono ${
                          line.startsWith('ERROR') ? 'text-red-600' :
                          line.startsWith('SKIP') ? 'text-amber-600' :
                          line.startsWith('STALE') ? 'text-blue-600' :
                          'text-slate-600'
                        }`}>{line}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </Section>

          {/* Gmail Sync */}
          <Section title="Gmail Sync" onRun={runGmailSync} running={running === 'gmail'}>
            {gmailLog && <LogDisplay data={gmailLog} />}
          </Section>

          {/* Quo Sync */}
          <Section title="Quo / OpenPhone Sync" onRun={runQuoSync} running={running === 'quo'}>
            {quoLog && <LogDisplay data={quoLog} />}
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, onRun, running, children }: { title: string; onRun: () => void; running: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <button onClick={onRun} disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {running ? <><Spinner size="sm" /> Running…</> : 'Run Now'}
        </button>
      </div>
      {children}
    </div>
  );
}

function StatPill({ label, value, color = 'slate' }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${colorMap[color] ?? colorMap.slate}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function LogDisplay({ data }: { data: Record<string, unknown> }) {
  const details = Array.isArray(data.details) ? data.details as string[] : [];
  return (
    <div className="space-y-3">
      {data.error ? (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{String(data.error)}</p>
      ) : (
        <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
          ✓ Done — {String(data.leadsUpdated ?? 0)} leads updated
          {data.emailsChecked !== undefined && `, ${String(data.emailsChecked)} emails checked`}
          {data.callsChecked !== undefined && `, ${String(data.callsChecked)} calls checked`}
        </p>
      )}
      {details.length > 0 && (
        <details>
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">{details.length} detail lines</summary>
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
            {details.map((line, i) => (
              <p key={i} className="text-xs font-mono text-slate-600">{line}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
