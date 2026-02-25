export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Clients
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          View and manage clients. Add or edit clients and assign services.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Client list
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No clients yet. Add clients and assign Water, Electrical Power, or
            Internet services to get started.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Client list and actions will appear here once connected to data.
          </p>
        </div>
      </div>
    </div>
  );
}
