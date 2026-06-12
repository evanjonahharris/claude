'use client';

import { useSession, signIn } from 'next-auth/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { CRMTable } from '@/components/views/CRMTable';
import { Spinner } from '@/components/ui/Spinner';

export default function CRMPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
  if (!session) { signIn('google'); return null; }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">CRM — All Leads</h2>
          <p className="text-sm text-slate-500 mt-0.5">Full lead table with search, sort, and inline detail</p>
        </div>
        <CRMTable />
      </main>
    </div>
  );
}
