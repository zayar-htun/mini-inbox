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

const STATUS_STYLES: Record<ContactStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  contacted: 'border-amber-200 bg-amber-50 text-amber-800',
  discarded: 'border-gray-200 bg-gray-100 text-gray-600',
};

function upsertSorted(list: Contact[], next: Contact): Contact[] {
  const without = list.filter((c) => c.id !== next.id);
  return [next, ...without].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

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

    const channel = supabase
      .channel('inbox-contacts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contacts' },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as Contact;
          setContacts((current) =>
            current ? upsertSorted(current, row) : [row],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
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
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to update: {updateError}
          </p>
        )}

        {loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Couldn't load inbox</p>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
          </div>
        ) : contacts === null ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">Loading inbox…</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm font-medium text-gray-900">No contacts yet</p>
            <p className="mt-1 text-sm text-gray-500">
              New submissions from your contact form will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">{c.email}</p>
                  </div>
                  <time className="shrink-0 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {c.message}
                </p>
                <div className="mt-4 flex items-center justify-end">
                  <select
                    aria-label="Status"
                    value={c.status}
                    onChange={(e) =>
                      void updateStatus(c.id, e.target.value as ContactStatus)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 ${STATUS_STYLES[c.status]}`}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
