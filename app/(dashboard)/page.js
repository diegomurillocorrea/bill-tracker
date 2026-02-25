import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Manage clients and their water, electrical power, and internet
          services.
        </p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Quick links"
      >
        <Link
          href="/clients"
          className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-zinc-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:focus:ring-offset-zinc-900"
          aria-label="View and manage clients"
        >
          <span
            className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50"
            aria-hidden
          >
            Clients
          </span>
          <span className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage clients and their assigned services.
          </span>
          <span className="mt-4 text-sm font-medium text-zinc-900 underline-offset-2 group-hover:underline dark:text-zinc-50">
            Open Clients →
          </span>
        </Link>

        <Link
          href="/services"
          className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-zinc-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:focus:ring-offset-zinc-900"
          aria-label="View services"
        >
          <span
            className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50"
            aria-hidden
          >
            Services
          </span>
          <span className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Water, Electrical Power, and Internet — see who has each service.
          </span>
          <span className="mt-4 text-sm font-medium text-zinc-900 underline-offset-2 group-hover:underline dark:text-zinc-50">
            Open Services →
          </span>
        </Link>
      </section>
    </div>
  );
}
