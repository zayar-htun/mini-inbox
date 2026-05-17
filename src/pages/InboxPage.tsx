import { useAuth } from '../lib/auth';

export default function InboxPage() {
  const { session, signOut } = useAuth();

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
        <p className="text-sm text-gray-500">No contacts yet.</p>
      </main>
    </div>
  );
}
