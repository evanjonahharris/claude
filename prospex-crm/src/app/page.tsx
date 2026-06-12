'use client';

import { useSession, signIn } from 'next-auth/react';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TodosView } from '@/components/views/TodosView';
import { NewContactsView } from '@/components/views/NewContactsView';
import type { HomeTab } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<HomeTab>('todos');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">ProspexCare CRM</h1>
          <p className="text-slate-400 mb-8">Sign in with Google to continue</p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 mx-auto px-6 py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="bg-white border-b border-slate-200 px-6 pt-4">
          <div className="flex gap-6">
            {([
              { id: 'todos', label: 'To-Dos' },
              { id: 'new-contacts', label: 'New Contacts' },
            ] as { id: HomeTab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'todos' ? <TodosView /> : <NewContactsView />}
      </main>
    </div>
  );
}
