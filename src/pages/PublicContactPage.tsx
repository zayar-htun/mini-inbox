import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Agency = { id: string; name: string };
type LookupState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; agency: Agency };

export default function PublicContactPage() {
  const { agencySlug } = useParams<{ agencySlug: string }>();

  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!agencySlug) {
      setLookup({ status: 'not_found' });
      return;
    }

    supabase
      .from('agencies')
      .select('id, name')
      .eq('slug', agencySlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLookup({ status: 'error', message: error.message });
          return;
        }
        if (!data) {
          setLookup({ status: 'not_found' });
          return;
        }
        setLookup({ status: 'ready', agency: data });
      });

    return () => {
      cancelled = true;
    };
  }, [agencySlug]);

  async function attemptSubmit() {
    if (lookup.status !== 'ready') return;
    setSubmitError(null);
    setSubmitting(true);
    const { error } = await supabase.from('contacts').insert({
      agency_id: lookup.agency.id,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (lookup.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (lookup.status === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Agency not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn't find an agency at this link. Please double-check the URL.
          </p>
        </div>
      </div>
    );
  }

  if (lookup.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-800">Something went wrong</h1>
          <p className="mt-2 text-sm text-red-700">{lookup.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Contact {lookup.agency.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Send us a message and we'll get back to you.
          </p>
        </div>

        {submitted ? (
          <p className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Thanks — your message has been sent.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attemptSubmit();
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {submitError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
