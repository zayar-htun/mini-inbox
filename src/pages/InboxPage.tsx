import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

type ContactStatus = 'new' | 'contacted' | 'discarded';

type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  created_at: string;
};

const STATUS_OPTIONS: ContactStatus[] = ['new', 'contacted', 'discarded'];

export default function InboxPage() {
  const { session, signOut } = useAuth();

  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('contacts')
      .select('id, name, email, message, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setContacts((data ?? []) as Contact[]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(id: string, nextStatus: ContactStatus) {
    const previous = contacts;
    setUpdateError(null);
    setContacts((current) =>
      current
        ? current.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
        : current,
    );

    const { error } = await supabase
      .from('contacts')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      setUpdateError(error.message);
      setContacts(previous);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-500">{session?.user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {updateError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to update: {updateError}
          </p>
        )}

        {loadError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : contacts === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts yet.</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <select
                      value={c.status}
                      onChange={(e) =>
                        void updateStatus(c.id, e.target.value as ContactStatus)
                      }
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <time className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString()}
                    </time>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {c.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
