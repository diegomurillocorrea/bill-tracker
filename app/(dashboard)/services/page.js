const SERVICES = [
  {
    id: "water",
    name: "Water",
    description: "Water utility bills",
  },
  {
    id: "electrical",
    name: "Electrical Power",
    description: "Electrical power bills",
  },
  {
    id: "internet",
    name: "Internet",
    description: "Internet service bills",
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Services
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Bill types: Water, Electrical Power, and Internet. See which clients
          use each service.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <article
            key={service.id}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {service.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {service.description}
            </p>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Client count and list will appear here when connected to data.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
